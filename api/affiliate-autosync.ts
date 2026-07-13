import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';
import { runAccountSync } from './_lib/affiliateEngine';

// Affiliate auto-sync cron — the "registers new affiliate products as they
// come" automation. Every scheduled run walks each account with auto_sync
// enabled: new catalog items are inserted, existing ones get fresh prices,
// nothing duplicates (upsert on external_key). Secured with CRON_SECRET.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  const auth = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (secret && auth !== secret) return res.status(401).json({ error: 'unauthorized' });

  const supabase = serviceClient();
  const { data: accounts } = await supabase
    .from('affiliate_accounts')
    .select('*')
    .eq('is_active', true)
    .eq('auto_sync', true)
    .order('last_synced_at', { ascending: true, nullsFirst: true });

  const results: any[] = [];
  const started = Date.now();
  for (const account of accounts ?? []) {
    // Stay inside the serverless window — remaining accounts run next tick
    // (ordering by last_synced_at rotates fairly through all of them).
    if (Date.now() - started > 50_000) break;
    const r = await runAccountSync(supabase, account, { trigger: 'auto' });
    results.push({ account: account.label, provider: account.provider, ...r });
  }

  return res.json({ ran: results.length, of: accounts?.length ?? 0, results });
}
