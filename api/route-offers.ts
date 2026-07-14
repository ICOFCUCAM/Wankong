import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Commerce Score routing endpoint.
//
// Given a product group (a UPC, or a product title) and an optional shopper
// preference, returns the competing merchant offers ranked by *customer value*
// — price, delivery speed, merchant reputation, returns/warranty — with the
// affiliate commission used only as a tie-breaker among comparable offers.
// The top row (`is_pick`) is SmartKong's recommendation.
//
// GET  /api/route-offers?group=<upc|title>&pref=balanced|cheapest|fastest|trusted
// POST /api/route-offers  { group, pref }
//
// Public + read-only: uses the anon key and the SECURITY DEFINER best_offer_for
// RPC, so no privileged data is exposed. Commission figures are SmartKong's
// internal economics and are stripped from the response unless explicitly asked
// for with debug=1 (never surface commission to shoppers).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const src = req.method === 'POST' ? (req.body ?? {}) : (req.query ?? {});
  const group = String((src as any).group ?? '').trim();
  const pref  = String((src as any).pref ?? 'balanced').toLowerCase();
  const debug = String((src as any).debug ?? '') === '1';
  const allowedPref = ['balanced', 'cheapest', 'fastest', 'trusted'];
  if (!group) return res.status(400).json({ error: 'group is required' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.rpc('best_offer_for', {
      p_group: group,
      p_pref:  allowedPref.includes(pref) ? pref : 'balanced',
    });
    if (error) return res.status(400).json({ error: error.message });

    const offers = (data ?? []).map((o: any) => ({
      productId:     o.product_id,
      merchant:      o.merchant,
      priceCents:    o.price_cents,
      shipDays:      Number(o.ship_days),
      reputation:    o.rep_score,
      commerceScore: Number(o.commerce_score),
      isPick:        o.is_pick,
      // Commission is SmartKong's private economics — only in debug mode.
      ...(debug ? { estCommissionCents: o.est_commission_cents, routedValue: Number(o.routed_value) } : {}),
    }));

    const pick = offers.find((o: any) => o.isPick) ?? null;
    return res.json({ group, pref: allowedPref.includes(pref) ? pref : 'balanced', pick, offers });
  } catch (err: any) {
    console.error('[route-offers]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
