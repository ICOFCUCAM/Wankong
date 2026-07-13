import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// AI problem-solver: "my problem" → analyzed category/keywords → scored
// catalog products → per-product reasons. Ported from SmartKongMarket's
// ai-service with two changes: one batched reasons call instead of one call
// per product, and a pure-keyword fallback when OPENAI_API_KEY is absent.

interface ProblemAnalysis {
  category: string;
  keywords: string[];
  suggestedCategories: string[];
}

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
    `You are the AI assistant for Wankong, a creator marketplace selling Music, Books, Audiobooks, Videos, Podcasts, Courses, Articles and general Products.
Analyze the user's problem and respond in JSON with keys:
- category: one of health/social/physical/financial/lifestyle/learning/entertainment/other
- keywords: array of 5-12 search keywords related to the problem and its solutions
- suggestedCategories: array of product types from [Music, Book, Audiobook, Video, Podcast, Course, Article, Product] that could help`,
    `Analyze this problem: "${problem}"`,
  );
  return {
    category:            result.category ?? 'other',
    keywords:            Array.isArray(result.keywords) ? result.keywords : [],
    suggestedCategories: Array.isArray(result.suggestedCategories) ? result.suggestedCategories : [],
  };
}

// Keyword-only fallback when no OpenAI key is configured
function fallbackAnalysis(problem: string): ProblemAnalysis {
  const stop = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'have', 'from', 'what', 'how', 'can', 'need', 'want', 'my', 'me', 'i', 'a', 'an', 'to', 'of', 'in', 'on', 'is', 'it', 'be', 'am']);
  const keywords = [...new Set(
    problem.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !stop.has(w))
  )].slice(0, 12);
  return { category: 'other', keywords, suggestedCategories: [] };
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

    // 2. Score the catalog
    const { data: candidates } = await supabase
      .from('ecom_products')
      .select('id, title, handle, description, product_type, genre, cover_url, price, is_affiliate, vendor, rating_avg, rating_count, tags, problem_tags, solves_problems')
      .eq('status', 'active')
      .order('trending_score', { ascending: false })
      .limit(400);

    const scored = ((candidates ?? []) as CandidateProduct[])
      .map(p => ({ product: p, score: scoreProduct(p, analysis) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

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
