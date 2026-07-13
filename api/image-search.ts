import type { VercelRequest, VercelResponse } from '@vercel/node';

// Image search — the shopper uploads a photo; OpenAI vision identifies the
// product and returns search keywords the client uses to query the catalog.
// Requires OPENAI_API_KEY (vision); returns a clear error otherwise.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Image search needs OpenAI configured on the server.' });

  const { imageDataUrl } = req.body as { imageDataUrl?: string };
  if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Please upload a valid image.' });
  }

  try {
    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Identify the main shoppable product in the image. Respond in JSON:
{ "label": "short product name", "keywords": ["3-8 search terms a marketplace would match on"], "category": "one of electronics/fashion/home/automotive/health/digital/other" }`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What product is this? Give search keywords.' },
              { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
            ],
          },
        ],
      }),
    });
    if (!r.ok) throw new Error(`OpenAI error: ${r.status}`);
    const data = await r.json() as any;
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');

    const keywords: string[] = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : [];
    const label: string = typeof parsed.label === 'string' ? parsed.label : '';
    const q = [label, ...keywords].filter(Boolean).join(' ').trim();

    if (!q) return res.status(422).json({ error: 'Could not recognize a product in that image.' });
    return res.json({ label, keywords, category: parsed.category ?? 'other', query: q });
  } catch (err: any) {
    console.error('[image-search]', err);
    return res.status(500).json({ error: 'Image search failed. Please try again.' });
  }
}
