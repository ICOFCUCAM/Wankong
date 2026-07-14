import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Creates a Stripe Checkout Session for a fan membership subscription.
// Expects: { tierId, priceId (Stripe price), userEmail, userId, successUrl, cancelUrl }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe not configured' });

  const stripe   = new Stripe(key, { apiVersion: '2024-04-10' as any });
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const {
    tierId, priceId, priceAmount, priceCurrency = 'usd',
    userEmail, userId,
    successUrl, cancelUrl,
    creatorId, tierName, partnerRef,
  } = req.body as {
    tierId:        string;
    priceId?:      string;
    priceAmount?:  number;   // cents — used if no priceId yet
    priceCurrency?: string;
    userEmail:     string;
    userId:        string;
    successUrl:    string;
    cancelUrl:     string;
    creatorId:     string;
    tierName:      string;
    partnerRef?:   string;   // partner ref/promo code (sk_ref) — enables recurring commission
  };

  try {
    let stripePriceId = priceId;

    // If no Stripe Price ID is stored yet, create one on-the-fly
    if (!stripePriceId && priceAmount) {
      const product = await stripe.products.create({
        name:     tierName,
        metadata: { tierId, creatorId },
      });
      const price = await stripe.prices.create({
        product:     product.id,
        unit_amount: priceAmount,
        currency:    priceCurrency,
        recurring:   { interval: 'month' },
        metadata:    { tierId, plan: 'membership' },
      });
      stripePriceId = price.id;

      // Cache the price ID back to the DB
      await supabase
        .from('membership_tiers')
        .update({ stripe_price_id: stripePriceId })
        .eq('id', tierId);
    }

    if (!stripePriceId) return res.status(400).json({ error: 'No price configured for this tier.' });

    // Look up or create Stripe customer
    let customerId: string | undefined;
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: stripePriceId, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      subscription_data:    {
        // partner_ref lets the invoice.payment_succeeded webhook attribute
        // recurring commission on each renewal to the referring partner.
        metadata: { tierId, creatorId, userId, ...(partnerRef ? { partner_ref: partnerRef } : {}) },
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('[create-subscription]', err);
    res.status(400).json({ error: err.message });
  }
}
