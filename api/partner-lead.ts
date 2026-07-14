import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// CPA / lead attribution endpoint.
//
// Lead-based commission (insurance, finance, SaaS demos, etc.) pays a fixed
// bounty per *qualified action* — a quote request, a signup, a booked demo —
// rather than a percentage of a sale. Any lead form or qualified-action
// handler POSTs here once the action is verified server-side, and the bounty
// is attributed to the partner who referred the visitor.
//
// Body: { code, event, ref, payout_cents? }
//   code        partner ref/promo code that referred the visitor (sk_ref / sk_promo)
//   event       lead type key — must match a lead_bounties row (e.g.
//               'insurance_quote', 'finance_signup', 'demo_request')
//   ref         idempotency key — a stable id for this action (form
//               submission id, lead id) so re-posts don't double-credit
//   payout_cents  optional override; when omitted the bounty comes from the
//                 lead_bounties table for `event`
//
// Trust model: this is a server-to-server / verified-action endpoint. The
// caller must supply a shared secret via `x-partner-lead-secret` (or an
// `Authorization: Bearer` token) matching PARTNER_LEAD_SECRET so untrusted
// browsers can't mint bounties. If the secret is unset, the endpoint refuses
// to run rather than crediting freely.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-partner-lead-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.PARTNER_LEAD_SECRET;
  if (!expected) return res.status(500).json({ error: 'Lead attribution is not configured' });

  const provided =
    (req.headers['x-partner-lead-secret'] as string) ||
    (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (provided !== expected) return res.status(401).json({ error: 'unauthorized' });

  const { code, event, ref, payout_cents } = (req.body ?? {}) as {
    code?: string; event?: string; ref?: string; payout_cents?: number;
  };
  if (!code || !event || !ref) {
    return res.status(400).json({ error: 'code, event and ref are required' });
  }

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc('record_partner_lead', {
      p_code:         String(code),
      p_event:        String(event),
      p_ref:          String(ref),
      p_payout_cents: typeof payout_cents === 'number' ? Math.round(payout_cents) : null,
    });
    if (error) {
      console.error('[partner-lead]', error.message);
      return res.status(400).json({ error: error.message });
    }
    return res.json({ ok: true, conversion: data ?? null });
  } catch (err: any) {
    console.error('[partner-lead]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
