import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// Hourly maintenance cron (vercel.json): recomputes trending_score AND records
// a daily price-history point (which also triggers price-drop alerts). Vercel
// sends `Authorization: Bearer CRON_SECRET` automatically; INTERNAL_API_KEY
// works for manual triggering.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const allowed = [process.env.CRON_SECRET, process.env.INTERNAL_API_KEY].filter(Boolean);
  if (allowed.length === 0 || !allowed.includes(auth)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const supabase = serviceClient();
    const [trending, prices] = await Promise.all([
      supabase.rpc('refresh_trending_scores'),
      supabase.rpc('snapshot_product_prices'),
    ]);
    if (trending.error) throw trending.error;
    if (prices.error)   console.error('[refresh-trending] price snapshot failed:', prices.error.message);
    return res.json({ trending: trending.data ?? { ok: true }, prices: prices.data ?? null });
  } catch (err: any) {
    console.error('[refresh-trending]', err);
    return res.status(500).json({ error: err.message });
  }
}
