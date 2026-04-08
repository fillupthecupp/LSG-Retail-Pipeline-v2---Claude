export const config = { runtime: 'nodejs' };

const SYSTEM_PROMPT = `You are a senior commercial real estate acquisitions analyst at Lightstone Group.

Read the uploaded offering memorandum PDF and extract the following fields for a retail deal pipeline tracker.

Rules:
- Return ONLY valid JSON — no markdown, no commentary, no code fences
- Return an empty string "" for any field not clearly stated in the document
- Do not guess or infer values not explicitly in the document
- For askingPrice: if the OM says "Best Offer" or "Call for Pricing", return that string as-is
- For numbers, return them as strings with their original formatting (e.g. "$65,000,000", "8.5%", "480,588 SF")
- missingFields: list the keys of any fields you could not find

Return exactly this JSON shape:
{
  "propertyName": "",
  "propertyAddress": "",
  "market": "",
  "assetType": "",
  "sf": "",
  "acreage": "",
  "yearBuiltRenovated": "",
  "parkingCount": "",
  "occupancy": "",
  "walt": "",
  "askingPrice": "",
  "noi": "",
  "capRate": "",
  "broker": "",
  "keyAnchors": "",
  "missingFields": []
}`;

function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON.');
    return JSON.parse(match[0]);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: 'Missing ANTHROPIC_API_KEY env variable.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { filename, dataBase64 } = body || {};

    if (!filename || !dataBase64) {
      return sendJson(res, 400, { error: 'Missing filename or dataBase64.' });
    }

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
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
                  data: dataBase64,
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

    if (!anthropicResp.ok) {
      const err = await anthropicResp.json().catch(() => ({}));
      return sendJson(res, 500, { error: 'Anthropic API error.', details: err });
    }

    const anthropicData = await anthropicResp.json();
    const rawText = anthropicData.content?.find((b) => b.type === 'text')?.text || '';
    const extracted = safeParseJson(rawText);

    return sendJson(res, 200, { ok: true, extracted });
  } catch (err) {
    return sendJson(res, 500, { error: 'Unexpected error.', details: err?.message || String(err) });
  }
}
