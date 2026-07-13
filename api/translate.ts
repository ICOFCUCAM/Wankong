import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// On-demand translation for global shoppers.
//  - { productId, targetLang }: translate a product's title + description and
//    cache the result in product_translations (generated once, reused forever).
//  - { texts:[...], targetLang }: translate arbitrary strings (e.g. reviews),
//    not cached.
// Requires OPENAI_API_KEY; returns a clear message otherwise.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const LANGS: Record<string, string> = {
  en: 'English', fr: 'French', es: 'Spanish', ar: 'Arabic', sw: 'Swahili',
  pt: 'Portuguese', de: 'German', zh: 'Chinese (Simplified)', hi: 'Hindi',
  ja: 'Japanese', ru: 'Russian', yo: 'Yoruba',
};

async function translateJson(apiKey: string, payload: Record<string, string>, langName: string): Promise<Record<string, string>> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Translate each value in the JSON object to ${langName}. Keep the same keys. Preserve meaning, keep it natural for shoppers, do not add commentary. Respond with the JSON object only.` },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json() as any;
  return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productId, texts, targetLang } = req.body as {
    productId?: string; texts?: string[]; targetLang?: string;
  };
  const lang = (targetLang ?? '').toLowerCase();
  const langName = LANGS[lang];
  if (!langName) return res.status(400).json({ error: 'Unsupported target language.' });
  if (lang === 'en') return res.status(400).json({ error: 'Source content is already English.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Translation needs OpenAI configured on the server.' });

  try {
    const supabase = serviceClient();

    // ── Product translation (cached) ─────────────────────────────────────────
    if (productId) {
      const { data: cached } = await supabase
        .from('product_translations')
        .select('title, description')
        .eq('product_id', productId).eq('lang', lang)
        .maybeSingle();
      if (cached) return res.json({ cached: true, ...cached });

      const { data: product } = await supabase
        .from('ecom_products')
        .select('title, description, body_html')
        .eq('id', productId).maybeSingle();
      if (!product) return res.status(404).json({ error: 'Product not found.' });

      const source = {
        title: product.title ?? '',
        description: (product.description ?? (product.body_html ? String(product.body_html).replace(/<[^>]+>/g, '') : '')).slice(0, 1500),
      };
      const out = await translateJson(apiKey, source, langName);
      const row = { title: out.title ?? source.title, description: out.description ?? source.description };

      await supabase.from('product_translations').upsert(
        { product_id: productId, lang, ...row },
        { onConflict: 'product_id,lang' },
      );
      return res.json({ cached: false, ...row });
    }

    // ── Ad-hoc text translation (e.g. reviews) ───────────────────────────────
    if (Array.isArray(texts) && texts.length > 0) {
      const payload: Record<string, string> = {};
      texts.slice(0, 20).forEach((t, i) => { payload[`t${i}`] = (t ?? '').slice(0, 1000); });
      const out = await translateJson(apiKey, payload, langName);
      const translations = texts.slice(0, 20).map((_, i) => out[`t${i}`] ?? texts[i]);
      return res.json({ translations });
    }

    return res.status(400).json({ error: 'Provide productId or texts to translate.' });
  } catch (err: any) {
    console.error('[translate]', err);
    return res.status(500).json({ error: 'Translation failed. Please try again.' });
  }
}
