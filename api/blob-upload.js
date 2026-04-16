import { handleUpload } from '@vercel/blob/client';

function getBlobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find(k => k.startsWith('BLOB_READ_WRITE_TOKEN'));
  return key ? process.env[key] : null;
}

async function parseBody(req) {
  // Vercel auto-parses JSON bodies into req.body as a plain object.
  // Guard against Buffer/stream being returned as "object" before falling back to stream read.
  if (req.body !== null && req.body !== undefined && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }
  // Fallback: read raw stream (req.body was a Buffer or undefined)
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Could not parse request body as JSON'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const token = getBlobToken();
  if (!token) {
    return res.status(500).json({ error: 'No BLOB_READ_WRITE_TOKEN found. Connect a Vercel Blob store to this project and redeploy.' });
  }

  try {
    const body = await parseBody(req);
    const jsonResponse = await handleUpload({
      token,
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['application/pdf', 'application/octet-stream'],
        addRandomSuffix: true,
        maximumSizeInBytes: 50 * 1024 * 1024,
      }),
    });
    return res.json(jsonResponse);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
