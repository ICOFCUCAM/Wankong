import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient, authoritativeOrderTotal } from './_lib/fulfillment';

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

  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'PayPal is not configured on this server.' });

  try {
    const { currency = 'USD', orderId, description } = req.body as {
      currency?:    string;
      orderId?:     string;
      description?: string;
    };

    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

    // The charge amount is recomputed from catalog prices on the server —
    // client-supplied amounts are ignored.
    const { totalCents: amount } = await authoritativeOrderTotal(serviceClient(), orderId);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const accessToken = await getAccessToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VITE_APP_URL ?? 'http://localhost:5173';

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
        'PayPal-Request-Id': `wk-${orderId ?? Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId ?? 'default',
          description:  description ?? 'WANKONG Purchase',
          amount: {
            currency_code: currency.toUpperCase(),
            value:         (amount / 100).toFixed(2),
          },
        }],
        application_context: {
          brand_name:          'WANKONG',
          landing_page:        'NO_PREFERENCE',
          user_action:         'PAY_NOW',
          return_url:          `${appUrl}/checkout?paypal_status=success&order_id=${orderId ?? ''}`,
          cancel_url:          `${appUrl}/checkout?paypal_status=cancelled`,
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json() as { message?: string };
      return res.status(orderRes.status).json({ error: err.message ?? 'PayPal order creation failed' });
    }

    const order = await orderRes.json() as {
      id: string;
      links: Array<{ rel: string; href: string }>;
    };

    const approvalLink = order.links.find(l => l.rel === 'approve');

    return res.status(200).json({
      paypalOrderId: order.id,
      approvalUrl:   approvalLink?.href ?? null,
    });
  } catch (err: any) {
    console.error('[paypal-order]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
