import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// AI problem-solver: "my problem" → analyzed category/keywords → scored
// catalog products → per-product reasons. Ported from SmartKongMarket's
// ai-service with two changes: one batched reasons call instead of one call
// per product, and a pure-keyword fallback when OPENAI_API_KEY is absent.

interface Constraints {
  maxPriceUsd: number | null;   // budget cap converted to USD
  minPriceUsd: number | null;
  currency: string | null;      // as the user stated it (EUR, GBP, USD…)
  productTypes: string[];       // hard filter, e.g. ['Product'] or ['Course']
  attributes: string[];         // e.g. ['15-inch','video editing','lightweight']
}

interface ProblemAnalysis {
  category: string;
  keywords: string[];
  suggestedCategories: string[];
  constraints: Constraints;
}

const EMPTY_CONSTRAINTS: Constraints = {
  maxPriceUsd: null, minPriceUsd: null, currency: null, productTypes: [], attributes: [],
};

interface CandidateProduct {
  id: string;
  title: string;
  handle: string | null;
  description: string | null;
  product_type: string | null;
  genre: string | null;
  cover_url: string | null;
  price: number;
  is_affiliate: boolean;
  vendor: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  tags: string[] | null;
  problem_tags: string[] | null;
  solves_problems: string[] | null;
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

async function openaiJson(apiKey: string, system: string, user: string): Promise<any> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json() as any;
  return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
}

async function analyzeProblem(apiKey: string, problem: string): Promise<ProblemAnalysis> {
  const result = await openaiJson(
    apiKey,
    `You are the shopping AI for SmartKong, a marketplace selling Music, Books, Audiobooks, Videos, Podcasts, Courses, Articles and general physical Products.
The user describes what they want in natural language (e.g. "the best 15-inch laptop under €1,500 for video editing"). Extract intent AND hard constraints.
Respond in JSON with keys:
- category: one of health/social/physical/financial/lifestyle/learning/entertainment/shopping/other
- keywords: array of 5-12 search keywords (include product nouns and use-case terms)
- suggestedCategories: array from [Music, Book, Audiobook, Video, Podcast, Course, Article, Product]
- maxPriceUsd: integer USD budget cap converted from whatever currency the user stated, or null (e.g. €1,500 → 1620)
- minPriceUsd: integer USD floor or null
- currency: the currency the user mentioned (EUR/GBP/USD/…) or null
- attributes: array of concrete requirements the user stated (e.g. "15-inch","video editing","waterproof","under 2kg")`,
    `Request: "${problem}"`,
  );
  const num = (v: any) => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.round(v) : null);
  return {
    category:            result.category ?? 'other',
    keywords:            Array.isArray(result.keywords) ? result.keywords : [],
    suggestedCategories: Array.isArray(result.suggestedCategories) ? result.suggestedCategories : [],
    constraints: {
      maxPriceUsd:  num(result.maxPriceUsd),
      minPriceUsd:  num(result.minPriceUsd),
      currency:     typeof result.currency === 'string' ? result.currency : null,
      productTypes: Array.isArray(result.suggestedCategories) ? result.suggestedCategories : [],
      attributes:   Array.isArray(result.attributes) ? result.attributes.slice(0, 8) : [],
    },
  };
}

// Static FX for budget parsing when the model isn't available (approximate).
const FX_TO_USD: Record<string, number> = {
  eur: 1.08, gbp: 1.27, kes: 0.0078, ngn: 0.00065, zar: 0.055, ghs: 0.067,
  cad: 0.73, aud: 0.66, inr: 0.012, jpy: 0.0064, usd: 1,
};

// Keyword + regex fallback when no OpenAI key is configured.
function fallbackAnalysis(problem: string): ProblemAnalysis {
  const stop = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'have', 'from', 'what', 'how', 'can', 'need', 'want', 'my', 'me', 'i', 'a', 'an', 'to', 'of', 'in', 'on', 'is', 'it', 'be', 'am', 'best', 'under', 'below', 'cheap']);
  const lower = problem.toLowerCase();
  const keywords = [...new Set(
    lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w))
  )].slice(0, 12);

  // Parse "under €1,500" / "below 1200 usd" / "$800"
  let maxPriceUsd: number | null = null;
  let currency: string | null = null;
  const m = lower.match(/(?:under|below|less than|max|up to|<)?\s*([€£$])?\s*([\d.,]{2,})\s*(eur|euros?|gbp|pounds?|usd|dollars?|kes|ngn|zar|ghs|cad|aud|inr|jpy)?/);
  if (m) {
    const amount = parseFloat(m[2].replace(/,/g, ''));
    const sym = m[1], word = m[3];
    const cur = sym === '€' ? 'eur' : sym === '£' ? 'gbp' : sym === '$' ? 'usd'
      : word ? word.slice(0, 3) : null;
    if (amount && cur && FX_TO_USD[cur]) {
      maxPriceUsd = Math.round(amount * FX_TO_USD[cur]);
      currency = cur.toUpperCase();
    }
  }

  return {
    category: 'shopping', keywords, suggestedCategories: [],
    constraints: { ...EMPTY_CONSTRAINTS, maxPriceUsd, currency },
  };
}

function scoreProduct(product: CandidateProduct, analysis: ProblemAnalysis): number {
  let score = 0;

  if (product.product_type && analysis.suggestedCategories.includes(product.product_type)) {
    score += 50;
  }

  const text = [
    product.title, product.description, product.genre,
    ...(product.tags ?? []), ...(product.problem_tags ?? []), ...(product.solves_problems ?? []),
  ].filter(Boolean).join(' ').toLowerCase();

  const matched = analysis.keywords.filter(k => text.includes(k.toLowerCase()));
  score += matched.length * 10;

  if ((product.rating_avg ?? 0) >= 4.5) score += 10;
  if ((product.rating_count ?? 0) >= 10) score += 5;

  return score;
}

async function generateReasons(
  apiKey: string,
  problem: string,
  products: Array<{ id: string; title: string; description: string | null }>,
): Promise<Record<string, string>> {
  const list = products
    .map((p, i) => `${i + 1}. [${p.id}] ${p.title} — ${(p.description ?? '').slice(0, 160)}`)
    .join('\n');
  const result = await openaiJson(
    apiKey,
    `For each recommended product, write one helpful sentence (max 30 words) explaining why it helps the user's problem.
Respond in JSON: { "reasons": { "<product id>": "<reason>", ... } }`,
    `Problem: ${problem}\n\nProducts:\n${list}`,
  );
  return result.reasons ?? {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { problem, userId } = req.body as { problem?: string; userId?: string };
  const trimmed = (problem ?? '').trim().slice(0, 500);
  if (trimmed.length < 8) {
    return res.status(400).json({ error: 'Describe your problem in a few words (at least 8 characters).' });
  }

  try {
    const supabase = serviceClient();
    const apiKey = process.env.OPENAI_API_KEY;

    // 1. Understand the problem
    let analysis: ProblemAnalysis;
    let aiPowered = false;
    if (apiKey) {
      try {
        analysis = await analyzeProblem(apiKey, trimmed);
        aiPowered = true;
      } catch {
        analysis = fallbackAnalysis(trimmed);
      }
    } else {
      analysis = fallbackAnalysis(trimmed);
    }

    // 2. Apply hard constraints as real DB filters, then score.
    const c = analysis.constraints;
    let query = supabase
      .from('ecom_products')
      .select('id, title, handle, description, product_type, genre, cover_url, price, compare_at_price, is_affiliate, affiliate_url, vendor, rating_avg, rating_count, tags, problem_tags, solves_problems')
      .eq('status', 'active');

    if (c.maxPriceUsd != null) query = query.lte('price', c.maxPriceUsd * 100);
    if (c.minPriceUsd != null) query = query.gte('price', c.minPriceUsd * 100);
    if (c.productTypes.length > 0) query = query.in('product_type', c.productTypes);

    const { data: candidates } = await query.order('trending_score', { ascending: false }).limit(400);

    let scored = ((candidates ?? []) as CandidateProduct[])
      .map(p => ({ product: p, score: scoreProduct(p, analysis) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // If constraints filtered everything out, fall back to price-only matches so
    // the shopper still sees something within budget.
    if (scored.length === 0 && candidates && candidates.length > 0) {
      scored = (candidates as CandidateProduct[]).slice(0, 6).map(product => ({ product, score: 1 }));
    }

    // 3. Explain why each product helps (single batched call)
    let reasons: Record<string, string> = {};
    if (aiPowered && scored.length > 0) {
      try {
        reasons = await generateReasons(apiKey!, trimmed, scored.map(x => ({
          id: x.product.id, title: x.product.title, description: x.product.description,
        })));
      } catch { /* reasons are optional */ }
    }

    const maxScore = scored[0]?.score ?? 0;
    const confidence = Math.min(0.95, maxScore / 100);

    // 4. Log for analytics (fire-and-forget)
    await supabase.from('ai_recommendations').insert([{
      user_id:                 userId ?? null,
      user_problem:            trimmed,
      problem_category:        analysis.category,
      keywords:                analysis.keywords,
      recommended_product_ids: scored.map(x => x.product.id),
      confidence,
    }]);

    return res.json({
      aiPowered,
      analysis,
      constraints: analysis.constraints,
      confidence,
      recommendations: scored.map(x => ({
        ...x.product,
        score:  x.score,
        reason: reasons[x.product.id] ?? null,
      })),
    });
  } catch (err: any) {
    console.error('[ai-solver]', err);
    return res.status(500).json({ error: 'Could not analyze your problem right now. Please try again.' });
  }
}
