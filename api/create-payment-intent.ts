import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { serviceClient, authoritativeOrderTotal } from './_lib/fulfillment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe is not configured on this server.' });

  const stripe = new Stripe(key, { apiVersion: '2024-04-10' as any });

  try {
    const { orderId, currency = 'usd', customer_email } = req.body as {
      orderId?: string;
      currency?: string;
      customer_email?: string;
    };

    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

    // The charge amount is recomputed from catalog prices on the server —
    // client-supplied amounts are ignored.
    const supabase = serviceClient();
    const { totalCents, customerEmail } = await authoritativeOrderTotal(supabase, orderId);

    if (totalCents < 50) {
      return res.status(400).json({ error: 'Amount must be at least 50 cents.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        totalCents,
      currency:      currency.toLowerCase(),
      metadata:      { orderId },
      receipt_email: customer_email ?? customerEmail ?? undefined,
      automatic_payment_methods: { enabled: true },
    });

    await supabase
      .from('ecom_orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', orderId);

    res.json({ clientSecret: paymentIntent.client_secret, amount: totalCents });
  } catch (err: any) {
    console.error('[create-payment-intent]', err);
    res.status(400).json({ error: err.message });
  }
}
