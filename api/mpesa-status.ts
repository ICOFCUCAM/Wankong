import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';

// Polled by the checkout UI while waiting for the Daraja callback.
// mpesa_transactions is service-role-only, so the client can't read it directly.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const checkoutRequestId = req.query.checkoutRequestId as string | undefined;
  if (!checkoutRequestId) return res.status(400).json({ error: 'Missing checkoutRequestId' });

  try {
    const supabase = serviceClient();
    const { data: tx, error } = await supabase
      .from('mpesa_transactions')
      .select('status, mpesa_ref, result_desc')
      .eq('checkout_request_id', checkoutRequestId)
      .maybeSingle();

    if (error) throw error;
    if (!tx) return res.status(200).json({ status: 'pending' });

    res.json({
      status:     tx.status ?? 'pending',
      mpesaRef:   tx.mpesa_ref ?? null,
      resultDesc: tx.result_desc ?? null,
    });
  } catch (err: any) {
    console.error('[mpesa-status]', err);
    res.status(500).json({ error: err.message });
  }
}
