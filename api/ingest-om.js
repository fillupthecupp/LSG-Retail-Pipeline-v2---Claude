const SYSTEM_PROMPT = `You are a senior commercial real estate acquisitions analyst at Lightstone Group.

Read the uploaded offering memorandum PDF and perform a fast pipeline extract — only the fields listed below.

Rules:
- Return ONLY valid JSON — no markdown, no commentary, no code fences
- Return an empty string "" for any field not clearly stated in the document
- Do not guess or infer values not explicitly in the document
- For numbers, return them as strings with their original formatting (e.g. "8.5%", "480,588 SF", "$4,200,000")
- highlights: extract exactly 2–3 short factual bullet points from the OM's investment highlights or executive summary; each string should be one concise sentence; return [] if none found
- missingFields: list the keys of any fields you could not find

Do NOT extract asking price or cap rate — those are analyst-entered fields.

Return exactly this JSON shape:
{
  "propertyName": "",
  "propertyAddress": "",
  "assetType": "",
  "sf": "",
  "occupancy": "",
  "noi": "",
  "walt": "",
  "broker": "",
  "keyAnchors": "",
  "highlights": [],
  "missingFields": []
}`;

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON.');
    return JSON.parse(match[0]);
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel environment variables.' });
    return;
  }

  const filename = decodeURIComponent(req.headers['x-filename'] || 'document.pdf');

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 50_000);
  const t0 = Date.now();

  try {
    const pdfBuffer = await readRawBody(req);
    console.log(`[ingest] pdf_received_bytes=${pdfBuffer.byteLength}`);

    if (pdfBuffer.byteLength === 0) {
      res.status(400).json({ error: 'Received empty PDF body.' });
      return;
    }

    const t1 = Date.now();
    const pdfBase64 = pdfBuffer.toString('base64');
    console.log(`[ingest] base64_encode_ms=${Date.now()-t1}`);

    const t2 = Date.now();
    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                type: 'text',
                text: `Extract the pipeline fields from this OM. Filename: ${filename}`,
              },
            ],
          },
        ],
      }),
    });

    console.log(`[ingest] anthropic_ms=${Date.now()-t2} status=${anthropicResp.status}`);

    const anthropicData = await anthropicResp.json();

    if (!anthropicResp.ok) {
      res.status(500).json({
        error: 'Anthropic API returned an error.',
        details: anthropicData?.error?.message || JSON.stringify(anthropicData),
      });
      return;
    }

    const rawText = anthropicData.content?.find(b => b.type === 'text')?.text || '';

    if (!rawText) {
      res.status(500).json({ error: 'Anthropic returned an empty response.' });
      return;
    }

    const t3 = Date.now();
    const extracted = safeParseJson(rawText);
    console.log(`[ingest] parse_ms=${Date.now()-t3} total_ms=${Date.now()-t0}`);
    res.status(200).json({ ok: true, extracted });

  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'Extraction timed out. Try a smaller PDF (under 10 MB) or compress it first.' });
    } else {
      res.status(500).json({
        error: 'Unexpected server error.',
        details: err?.message || String(err),
      });
    }
  } finally {
    clearTimeout(abortTimer);
  }
}
