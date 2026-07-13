import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// Recomputes trending_score for the whole catalog. Invoked hourly by the
// Vercel cron (vercel.json) — Vercel sends `Authorization: Bearer CRON_SECRET`
// automatically when the env var is set. INTERNAL_API_KEY works for manual
// triggering.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const allowed = [process.env.CRON_SECRET, process.env.INTERNAL_API_KEY].filter(Boolean);
  if (allowed.length === 0 || !allowed.includes(auth)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc('refresh_trending_scores');
    if (error) throw error;
    return res.json(data ?? { ok: true });
  } catch (err: any) {
    console.error('[refresh-trending]', err);
    return res.status(500).json({ error: err.message });
  }
}
