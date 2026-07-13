import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { markPaidAndFulfill } from './_lib/fulfillment';

// Safaricom posts the payment result to this endpoint after STK Push.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const callback = req.body?.Body?.stkCallback as {
      MerchantRequestID:  string;
      CheckoutRequestID:  string;
      ResultCode:         number;
      ResultDesc:         string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>;
      };
    };

    if (!callback) return res.status(400).json({ error: 'Invalid callback body' });

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    const meta: Record<string, string | number> = {};
    CallbackMetadata?.Item.forEach(i => { meta[i.Name] = i.Value; });

    const mpesaRef    = meta['MpesaReceiptNumber'] as string | undefined;
    const amount      = meta['Amount'] as number | undefined;
    const phoneNumber = meta['PhoneNumber'] as string | undefined;

    const success = ResultCode === 0;

    // Update the payment_requests table (or ecom_orders via checkoutRequestId foreign key)
    await supabase.from('mpesa_transactions').upsert({
      checkout_request_id: CheckoutRequestID,
      result_code:         ResultCode,
      result_desc:         ResultDesc,
      mpesa_ref:           mpesaRef,
      amount,
      phone:               phoneNumber?.toString(),
      status:              success ? 'completed' : 'failed',
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'checkout_request_id' });

    // If successful, mark the associated order as paid
    if (success && CheckoutRequestID) {
      const { data: tx } = await supabase
        .from('mpesa_transactions')
        .select('order_id')
        .eq('checkout_request_id', CheckoutRequestID)
        .maybeSingle();

      if (tx?.order_id) {
        // Marks the order paid and fulfills it (library access + earnings)
        // server-side — the buyer's polling browser is no longer trusted.
        await markPaidAndFulfill(supabase, tx.order_id, { mpesa_ref: mpesaRef ?? null });
      }
    }

    // Safaricom expects this exact response to stop retrying
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('[mpesa-callback]', err);
    res.status(500).json({ error: err.message });
  }
}
