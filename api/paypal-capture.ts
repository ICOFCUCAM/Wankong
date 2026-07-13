import type { VercelRequest, VercelResponse } from '@vercel/node';
import { markPaidAndFulfill, serviceClient } from './_lib/fulfillment';

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId     = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Failed to get PayPal access token');
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.PAYPAL_CLIENT_ID) {
    return res.status(500).json({ error: 'PayPal is not configured on this server.' });
  }

  try {
    const { paypalOrderId, orderId } = req.body as {
      paypalOrderId: string;
      orderId?:      string;
    };

    if (!paypalOrderId) return res.status(400).json({ error: 'Missing paypalOrderId' });

    const accessToken = await getAccessToken();

    // Capture the payment
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
    });

    const capture = await captureRes.json() as {
      status?:          string;
      purchase_units?:  Array<{
        payments?: {
          captures?: Array<{ id: string; amount: { value: string; currency_code: string }; status: string }>;
        };
      }>;
      message?: string;
    };

    if (!captureRes.ok || capture.status !== 'COMPLETED') {
      return res.status(400).json({ error: capture.message ?? 'PayPal capture failed', details: capture });
    }

    const captureRecord = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureRecord?.id;

    // Mark paid and fulfill server-side (library access + seller earnings)
    if (orderId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = serviceClient();

      // The captured amount must cover the order total — a client can't get
      // an order fulfilled by paying a smaller PayPal order.
      const { data: order } = await supabase
        .from('ecom_orders')
        .select('total_cents')
        .eq('id', orderId)
        .single();
      const capturedCents = Math.round(parseFloat(captureRecord?.amount?.value ?? '0') * 100);
      if (order && capturedCents < (order.total_cents ?? 0)) {
        console.error(`[paypal-capture] amount mismatch for order ${orderId}: captured ${capturedCents}, expected ${order.total_cents}`);
        return res.status(400).json({ error: 'Captured amount does not match order total' });
      }

      await markPaidAndFulfill(supabase, orderId, {
        payment_method:    'paypal',
        paypal_order_id:   paypalOrderId,
        paypal_capture_id: captureId ?? null,
      });
    }

    return res.status(200).json({
      success:   true,
      captureId,
      status:    'COMPLETED',
    });
  } catch (err: any) {
    console.error('[paypal-capture]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
