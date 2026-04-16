import { handleUpload } from '@vercel/blob/client';

function getBlobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  // Vercel sometimes names it with a store suffix, e.g. BLOB_READ_WRITE_TOKEN_STORENAME
  const key = Object.keys(process.env).find(k => k.startsWith('BLOB_READ_WRITE_TOKEN'));
  return key ? process.env[key] : null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch {}
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Could not parse body as JSON')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const token = getBlobToken();
  if (!token) {
    res.status(500).json({ error: 'No BLOB_READ_WRITE_TOKEN found. Connect a Vercel Blob store to this project and redeploy.' });
    return;
  }

  try {
    const body = await readBody(req);
    const jsonResponse = await handleUpload({
      token,
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['application/pdf'],
        addRandomSuffix: true,
        maximumSizeInBytes: 50 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    });
    res.json(jsonResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
