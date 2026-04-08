import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['application/pdf'],
        addRandomSuffix: true,
        maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
      }),
      onUploadCompleted: async () => {},
    });
    res.json(body);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
