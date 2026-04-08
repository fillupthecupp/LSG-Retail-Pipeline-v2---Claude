import { del } from '@vercel/blob';

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

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON.');
    return JSON.parse(match[0]);
  }
}

async function readBody(req) {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Could not parse request body as JSON.')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    res.status(400).json({ error: 'Invalid request body.', details: err.message });
    return;
  }

  const { filename, url } = body || {};

  if (!filename || !url) {
    res.status(400).json({ error: 'Missing filename or url in request.' });
    return;
  }

  try {
    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
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
                  type: 'url',
                  url,
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

    const extracted = safeParseJson(rawText);
    res.status(200).json({ ok: true, extracted });

  } catch (err) {
    res.status(500).json({
      error: 'Unexpected server error.',
      details: err?.message || String(err),
    });
  } finally {
    // Clean up the blob regardless of success or failure
    try { await del(url); } catch {}
  }
}
