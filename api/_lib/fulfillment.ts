import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Shared server-side order helpers used by the payment webhooks/captures.
// Files under api/_lib are not deployed as Vercel functions.

export function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials are not configured');
  return createClient(url, key);
}

/**
 * Mark an order paid and run server-side fulfillment (library access grants +
 * seller earnings) via the fulfill_ecom_order() database function. Idempotent:
 * re-delivered webhooks are no-ops once the order is fulfilled.
 */
export async function markPaidAndFulfill(
  supabase: SupabaseClient,
  orderId: string,
  patch: Record<string, unknown> = {},
): Promise<{ ok: boolean; reason?: string }> {
  const { error: updateError } = await supabase
    .from('ecom_orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString(), ...patch })
    .eq('id', orderId);

  if (updateError) {
    console.error(`[fulfillment] failed to mark order ${orderId} paid:`, updateError.message);
    return { ok: false, reason: updateError.message };
  }

  const { data, error } = await supabase.rpc('fulfill_ecom_order', { p_order_id: orderId });
  if (error) {
    // Payment is recorded; fulfillment can be retried by the next webhook
    // delivery or manually by an admin.
    console.error(`[fulfillment] fulfill_ecom_order failed for ${orderId}:`, error.message);
    return { ok: false, reason: error.message };
  }
  return (data ?? { ok: true }) as { ok: boolean; reason?: string };
}

/**
 * Recompute an order's total from the CURRENT catalog prices of its items so a
 * tampered client-side cart can never set the charge amount. Also rewrites the
 * stored item prices and order totals to the authoritative values.
 * Returns the total in cents.
 */
export async function authoritativeOrderTotal(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ totalCents: number; customerEmail: string | null }> {
  const { data: order, error: orderError } = await supabase
    .from('ecom_orders')
    .select('id, payment_status, customer_email')
    .eq('id', orderId)
    .single();
  if (orderError || !order) throw new Error('Order not found');
  if (order.payment_status === 'paid') throw new Error('Order is already paid');

  const { data: items, error: itemsError } = await supabase
    .from('ecom_order_items')
    .select('id, product_id, quantity')
    .eq('order_id', orderId);
  if (itemsError) throw new Error(itemsError.message);
  if (!items || items.length === 0) throw new Error('Order has no items');

  const productIds = items.map(i => i.product_id).filter(Boolean);
  const { data: products, error: productsError } = await supabase
    .from('ecom_products')
    .select('id, price, status')
    .in('id', productIds);
  if (productsError) throw new Error(productsError.message);

  const priceById = new Map((products ?? []).map(p => [p.id, p]));

  let totalCents = 0;
  for (const item of items) {
    const product = item.product_id ? priceById.get(item.product_id) : undefined;
    if (!product) throw new Error('Order contains an unknown product');
    if (product.status !== 'active') throw new Error('Order contains an unavailable product');
    const lineCents = (product.price ?? 0) * (item.quantity ?? 1);
    totalCents += lineCents;
    // Pin the item to the catalog price actually charged.
    await supabase.from('ecom_order_items').update({ price: product.price ?? 0 }).eq('id', item.id);
  }

  await supabase
    .from('ecom_orders')
    .update({ subtotal_cents: totalCents, total_cents: totalCents })
    .eq('id', orderId);

  return { totalCents, customerEmail: order.customer_email ?? null };
}
