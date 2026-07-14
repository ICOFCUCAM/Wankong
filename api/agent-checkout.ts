import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { serviceClient } from './_lib/fulfillment';

// ── SmartKong Agent Commerce API — checkout ─────────────────────────────────
//
// The checkout half of Phase 9. Lets an AI agent turn a routed offer into a
// ready-to-pay checkout on the user's behalf, without SmartKong (or the agent)
// ever touching card data — payment completes on a Stripe-hosted page, and the
// existing webhook fulfills the order. Aligned with the ACP/UCP model where the
// platform stays merchant-of-record for its own inventory and hands off for
// external merchants.
//
// POST /api/agent-checkout   { productId, quantity?, email?, ref? }
//   header: x-agent-key: <AGENT_API_KEY>
//
// Two outcomes:
//   • First-party (SmartKong-fulfilled) product → creates a pending order and a
//     hosted Stripe Checkout session; returns { mode:'checkout', checkoutUrl }.
//   • Affiliate / external merchant product → SmartKong is not merchant-of-
//     record, so it returns { mode:'handoff', url } to the merchant instead of
//     pretending to check out. (Honest: no last-click hijack, no fake cart.)
//
// GATED: requires the operator to set AGENT_API_KEY. Until then this returns
// 501 { status:'planned' } — matching the manifest — so agent checkout is off
// by default and no unauthenticated caller can mint orders or Stripe sessions.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-agent-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const agentKey = process.env.AGENT_API_KEY;
  if (!agentKey) {
    return res.status(501).json({
      status: 'planned',
      message: 'Agent checkout is not enabled on this deployment. Complete the purchase at the product url instead.',
    });
  }
  if ((req.headers['x-agent-key'] as string) !== agentKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { productId, quantity, email, ref } = (req.body ?? {}) as {
    productId?: string; quantity?: number; email?: string; ref?: string;
  };
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  const qty = Math.max(1, Math.min(20, Math.round(Number(quantity) || 1)));

  const siteBase = (process.env.SITE_URL || 'https://smartkong.net').replace(/\/$/, '');

  try {
    const supabase = serviceClient();
    const { data: product } = await supabase
      .from('ecom_products')
      .select('id, title, handle, price, status, is_affiliate, affiliate_url, vendor')
      .or(`id.eq.${productId},handle.eq.${productId}`)
      .maybeSingle();

    if (!product || product.status !== 'active') {
      return res.status(404).json({ error: 'Product not found or unavailable' });
    }

    // External merchant — hand off, don't pretend to be merchant-of-record.
    if (product.is_affiliate && product.affiliate_url) {
      return res.json({
        mode: 'handoff',
        merchant: product.vendor ?? 'Partner Store',
        url: product.affiliate_url,
        message: 'This item is fulfilled by an external merchant. Direct the user to the merchant to complete checkout.',
      });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(500).json({ error: 'Payments are not configured on this server.' });
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });

    const priceCents = product.price ?? 0;
    if (priceCents < 50) return res.status(400).json({ error: 'This product cannot be purchased through agent checkout.' });
    const totalCents = priceCents * qty;

    // 1. Create a pending order (guest — user_id null). items jsonb is the
    //    denormalized display copy; ecom_order_items is the authoritative line.
    const item = { product_id: product.id, title: product.title, price: priceCents, quantity: qty };
    const { data: order, error: orderErr } = await supabase
      .from('ecom_orders')
      .insert([{
        customer_email: email ?? null,
        items:          [item],
        subtotal_cents: totalCents,
        total_cents:    totalCents,
        payment_status: 'pending',
        payment_method: 'stripe',
        notes:          `agent-checkout${ref ? ` ref=${ref}` : ''}`,
      }])
      .select('id')
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? 'Could not create order');

    await supabase.from('ecom_order_items').insert([{
      order_id: order.id, product_id: product.id, title: product.title, price: priceCents, quantity: qty,
    }]);

    // 2. Stripe-hosted Checkout session. payment_intent metadata.orderId lets the
    //    existing webhook fulfill; partner_ref attributes the sale to a partner.
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      line_items:           [{
        quantity: qty,
        price_data: {
          currency: 'usd',
          unit_amount: priceCents,
          product_data: { name: product.title },
        },
      }],
      customer_email:       email ?? undefined,
      success_url:          `${siteBase}/order-confirmation?order=${order.id}`,
      cancel_url:           `${siteBase}/cart`,
      metadata:             { orderId: order.id, source: 'agent', ...(ref ? { partner_ref: ref } : {}) },
      payment_intent_data:  { metadata: { orderId: order.id, source: 'agent', ...(ref ? { partner_ref: ref } : {}) } },
    });

    await supabase.from('ecom_orders').update({ stripe_session_id: session.id }).eq('id', order.id);

    return res.json({
      mode:        'checkout',
      orderId:     order.id,
      checkoutUrl: session.url,
      amount_cents: totalCents,
      currency:    'USD',
      expiresAt:   session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      message:     'Direct the user to checkoutUrl to complete payment. The order fulfills automatically once paid.',
    });
  } catch (err: any) {
    console.error('[agent-checkout]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
