import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { markPaidAndFulfill } from './_lib/fulfillment';

// Vercel must parse the raw body for Stripe signature verification
export const config = { api: { bodyParser: false } };

function rawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret  = process.env.STRIPE_SECRET_KEY!;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  if (!secret || !whSecret) return res.status(500).json({ error: 'Stripe not configured' });

  const stripe   = new Stripe(secret, { apiVersion: '2024-04-10' as any });
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const body = await rawBody(req);
  const sig  = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] sig verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        // Marks the order paid and grants library access + seller earnings
        // server-side, so fulfillment happens even if the buyer's browser
        // never returns from the payment.
        await markPaidAndFulfill(supabase, orderId, { stripe_payment_intent_id: pi.id });
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        await supabase
          .from('ecom_orders')
          .update({ payment_status: 'failed' })
          .eq('id', orderId)
          .neq('payment_status', 'paid');
      }
      break;
    }

    case 'charge.refunded': {
      // Reverse any partner commission attributed to a refunded order.
      const charge = event.data.object as Stripe.Charge;
      const orderId = (charge.metadata?.orderId) ||
        (typeof charge.payment_intent === 'string' ? undefined : charge.payment_intent?.metadata?.orderId);
      if (orderId) {
        await supabase.from('ecom_orders').update({ fulfillment_status: 'refunded' }).eq('id', orderId);
        await supabase.rpc('reverse_conversion', { p_order_id: orderId });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      // Recurring partner commission on subscription RENEWALS (not the first
      // cycle). The subscription must carry metadata.partner_ref (set when it
      // was created via a partner link/code).
      const inv = event.data.object as Stripe.Invoice;
      const subRef = (inv as any).subscription;
      if (inv.billing_reason === 'subscription_cycle' && subRef && inv.amount_paid > 0) {
        try {
          const subId = typeof subRef === 'string' ? subRef : subRef.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const ref = sub.metadata?.partner_ref;
          if (ref) {
            await supabase.rpc('record_recurring_commission', {
              p_code: ref, p_ref: inv.id, p_amount_cents: inv.amount_paid,
            });
          }
        } catch (e: any) { console.error('[recurring commission]', e?.message); }
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('user_subscriptions').upsert({
        stripe_subscription_id: sub.id,
        stripe_customer_id:     sub.customer as string,
        status:                 sub.status,
        plan:                   (sub.items.data[0]?.price?.metadata?.plan ?? 'pro') as string,
        current_period_end:     new Date((sub.current_period_end ?? 0) * 1000).toISOString(),
        updated_at:             new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from('user_subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.subscription) {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', inv.subscription as string);
      }
      break;
    }

    default:
      // Unhandled event — return 200 so Stripe doesn't retry
      break;
  }

  res.json({ received: true });
}
