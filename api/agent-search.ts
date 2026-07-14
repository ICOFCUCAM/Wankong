import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ── SmartKong Agent Commerce API — discovery ────────────────────────────────
//
// A machine-facing endpoint so external AI agents (ChatGPT, Gemini, custom
// assistants) can query SmartKong as "the world's shopping layer": one call
// returns products across every merchant, already routed to the best-value
// offer by the Commerce Score engine. This is the discovery half of Phase 9
// (agentic-commerce protocols) — deliberately aligned with the shape of
// OpenAI's ACP and Google's UCP product/offer feeds, without yet implementing
// their full checkout handshake.
//
// GET  /api/agent-search?query=rtx%205090&pref=balanced&limit=5
// POST /api/agent-search  { query, pref?, limit? }
//
// Read-only, anon-key, no auth: this is a public catalog surface. Commission /
// SmartKong economics are never included — agents (and their users) see only
// customer value: price, delivery, reputation, Commerce Score.
const PREFS = ['balanced', 'cheapest', 'fastest', 'trusted'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const src = req.method === 'POST' ? (req.body ?? {}) : (req.query ?? {});
  const query = String((src as any).query ?? (src as any).q ?? '').trim().slice(0, 200);
  const prefRaw = String((src as any).pref ?? 'balanced').toLowerCase();
  const pref = PREFS.includes(prefRaw) ? prefRaw : 'balanced';
  const limit = Math.max(1, Math.min(20, parseInt(String((src as any).limit ?? '8'), 10) || 8));
  if (!query) return res.status(400).json({ error: 'query is required' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Catalog not configured' });
  const siteBase = (process.env.SITE_URL || 'https://smartkong.net').replace(/\/$/, '');

  try {
    const supabase = createClient(url, key);

    // 1. Candidate products by keyword (title / description / category / genre).
    const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const term = words[0] ?? query;
    const { data: candidates } = await supabase
      .from('ecom_products')
      .select('id, title, handle, description, product_type, category, genre, cover_url, price, vendor, upc, rating_avg, rating_count')
      .eq('status', 'active')
      .or([
        `title.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `category.ilike.%${term}%`,
        `genre.ilike.%${term}%`,
      ].join(','))
      .order('trending_score', { ascending: false })
      .limit(120);

    // 2. Collapse duplicate merchant listings into one product (UPC, else title).
    const groupKey = (p: any) =>
      (p.upc && String(p.upc).trim()) || String(p.title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const seen = new Set<string>();
    const unique = (candidates ?? []).filter(p => {
      const k = groupKey(p);
      if (!k || seen.has(k)) return false;
      seen.add(k); return true;
    }).slice(0, limit);

    // 3. Route each product across merchants via the Commerce Score engine.
    const results = await Promise.all(unique.map(async p => {
      const group = groupKey(p);
      const { data: offerData } = await supabase.rpc('best_offer_for', { p_group: group, p_pref: pref });
      const offers = (offerData ?? []) as Array<{
        product_id: string; merchant: string; price_cents: number;
        ship_days: number; rep_score: number; commerce_score: number; is_pick: boolean;
      }>;

      const best = offers.find(o => o.is_pick) ?? null;
      const pathFor = (id: string) => `/products/${id}`;

      return {
        id: p.id,
        title: p.title,
        description: (p.description ?? '').slice(0, 200) || null,
        category: p.category ?? p.genre ?? null,
        image: p.cover_url ?? null,
        rating: p.rating_count ? { average: Number(p.rating_avg), count: p.rating_count } : null,
        price: { amount_cents: p.price ?? 0, currency: 'USD', display: `$${((p.price ?? 0) / 100).toFixed(2)}` },
        url: `${siteBase}${pathFor(p.handle ?? p.id)}`,
        // Merchant offers, ranked by customer value (no commission exposed).
        offers: offers.map(o => ({
          merchant: o.merchant,
          price_cents: o.price_cents,
          currency: 'USD',
          delivery_days: Number(o.ship_days),
          reputation: o.rep_score,
          commerce_score: Number(o.commerce_score),
          recommended: o.is_pick,
          url: `${siteBase}${pathFor(o.product_id)}`,
        })),
        best_offer: best ? {
          merchant: best.merchant,
          price_cents: best.price_cents,
          currency: 'USD',
          commerce_score: Number(best.commerce_score),
          url: `${siteBase}${pathFor(best.product_id)}`,
        } : null,
        routing: offers.length > 1 ? {
          stores: offers.length,
          save_cents: Math.max(...offers.map(o => o.price_cents)) - Math.min(...offers.map(o => o.price_cents)),
        } : null,
      };
    }));

    return res.json({
      protocol: 'smartkong.agent.v1',
      query, preference: pref, count: results.length,
      results,
    });
  } catch (err: any) {
    console.error('[agent-search]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
