import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// AI product comparison — takes 2-4 product IDs and returns a structured
// side-by-side: per-product pros/cons/bestFor, an overall summary, and a
// recommended winner. Uses OpenAI when configured; otherwise a transparent
// heuristic (price + rating) so the feature always works.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

interface P {
  id: string; title: string; description: string | null; price: number;
  genre: string | null; product_type: string | null;
  rating_avg: number | null; rating_count: number | null; vendor: string | null;
}

async function aiCompare(apiKey: string, products: P[]): Promise<any> {
  const list = products.map((p, i) =>
    `#${i + 1} [${p.id}] "${p.title}" — ${p.product_type ?? 'Product'}${p.genre ? `/${p.genre}` : ''}, $${(p.price / 100).toFixed(2)}, rating ${p.rating_avg ?? 'n/a'} (${p.rating_count ?? 0} reviews). ${(p.description ?? '').slice(0, 240)}`
  ).join('\n');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a neutral shopping analyst. Compare the products objectively for a buyer.
Respond in JSON:
{
  "summary": "2-3 sentence plain-English overview of how they differ",
  "winnerId": "<id of the best overall value, or null>",
  "items": [ { "id": "<id>", "pros": ["..."], "cons": ["..."], "bestFor": "one short phrase" } ]
}
Base pros/cons on the given data (price, ratings, type, description). Do not invent specs you cannot infer. Keep each pro/con under 12 words.`,
        },
        { role: 'user', content: `Compare these:\n${list}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json() as any;
  return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
}

function heuristicCompare(products: P[]): any {
  const cheapest = [...products].sort((a, b) => a.price - b.price)[0];
  const topRated = [...products].sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0))[0];
  const items = products.map(p => {
    const pros: string[] = [];
    const cons: string[] = [];
    if (p.id === cheapest.id) pros.push('Lowest price of the set');
    if (p.id === topRated.id && (p.rating_avg ?? 0) > 0) pros.push('Highest customer rating');
    if ((p.rating_count ?? 0) >= 20) pros.push(`Well-reviewed (${p.rating_count} ratings)`);
    if (p.price === cheapest.price && p.id !== cheapest.id) pros.push('Competitively priced');
    if ((p.rating_count ?? 0) === 0) cons.push('No reviews yet');
    if (p.price > cheapest.price * 1.5) cons.push('Pricier than alternatives');
    return { id: p.id, pros: pros.length ? pros : ['Solid all-round option'], cons, bestFor: p.id === cheapest.id ? 'Budget shoppers' : p.id === topRated.id ? 'Best-rated pick' : 'A balanced choice' };
  });
  return {
    summary: `Compared on price and customer ratings: ${cheapest.title} is the most affordable, while ${topRated.title} has the strongest reviews.`,
    winnerId: (topRated.rating_avg ?? 0) >= 4.3 ? topRated.id : cheapest.id,
    items,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productIds } = req.body as { productIds?: string[] };
  const ids = (productIds ?? []).filter(Boolean).slice(0, 4);
  if (ids.length < 2) return res.status(400).json({ error: 'Pick at least 2 products to compare.' });

  try {
    const supabase = serviceClient();
    const { data } = await supabase
      .from('ecom_products')
      .select('id, title, description, price, genre, product_type, rating_avg, rating_count, vendor')
      .in('id', ids);

    const products = (data ?? []) as P[];
    if (products.length < 2) return res.status(400).json({ error: 'Could not load those products.' });

    const apiKey = process.env.OPENAI_API_KEY;
    let result: any;
    let aiPowered = false;
    if (apiKey) {
      try { result = await aiCompare(apiKey, products); aiPowered = true; }
      catch { result = heuristicCompare(products); }
    } else {
      result = heuristicCompare(products);
    }

    // Normalize + guard
    const byId = new Map(products.map(p => [p.id, p]));
    const items = (Array.isArray(result.items) ? result.items : [])
      .filter((it: any) => byId.has(it.id))
      .map((it: any) => ({
        id: it.id,
        pros: Array.isArray(it.pros) ? it.pros.slice(0, 5) : [],
        cons: Array.isArray(it.cons) ? it.cons.slice(0, 5) : [],
        bestFor: typeof it.bestFor === 'string' ? it.bestFor : '',
      }));

    return res.json({
      aiPowered,
      summary: typeof result.summary === 'string' ? result.summary : '',
      winnerId: byId.has(result.winnerId) ? result.winnerId : null,
      items,
    });
  } catch (err: any) {
    console.error('[compare]', err);
    return res.status(500).json({ error: 'Could not generate the comparison right now.' });
  }
}
