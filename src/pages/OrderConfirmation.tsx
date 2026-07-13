import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { currentRef } from '@/market/PartnerRedirect';

interface OrderItem {
  title: string;
  price: number;
  quantity: number;
}

export default function OrderConfirmation() {
  const [searchParams]  = useSearchParams();
  const orderId         = searchParams.get('orderId') || searchParams.get('order_id');

  const [items,   setItems]   = useState<OrderItem[]>([]);
  const [total,   setTotal]   = useState<number | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [status,  setStatus]  = useState<{ payment: string; fulfillment: string } | null>(null);

  // Attribute the sale to a partner's referral link, if one is active. The RPC
  // is idempotent per order; we clear the ref so it isn't reused on later buys.
  useEffect(() => {
    if (!orderId) return;
    const ref = currentRef();
    if (!ref) return;
    supabase.rpc('record_partner_conversion', { p_code: ref, p_order_id: orderId })
      .then(() => { try { localStorage.removeItem('sk_ref'); } catch { /* ignore */ } });
  }, [orderId]);

  // Fulfillment happens server-side via payment webhooks, so it can lag the
  // redirect by a few seconds — poll until the order settles.
  useEffect(() => {
    if (!orderId) return;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fetchOrder = () => {
      supabase
        .from('ecom_orders')
        .select('total_cents, payment_status, fulfillment_status, ecom_order_items(title, price, quantity)')
        .eq('id', orderId)
        .single()
        .then(({ data }) => {
          if (data) {
            setTotal((data.total_cents ?? 0) / 100);
            setStatus({
              payment:     data.payment_status ?? 'pending',
              fulfillment: data.fulfillment_status ?? 'unfulfilled',
            });
            setItems(
              ((data as any).ecom_order_items ?? []).map((i: any) => ({
                title:    i.title,
                price:    i.price / 100,
                quantity: i.quantity,
              }))
            );
            const settled = data.payment_status === 'paid' && data.fulfillment_status === 'fulfilled';
            if (!settled && attempts < 10) {
              attempts += 1;
              timer = setTimeout(fetchOrder, 3000);
            }
          }
          setLoading(false);
        });
    };

    fetchOrder();
    return () => { if (timer) clearTimeout(timer); };
  }, [orderId]);

  const fulfilled = status?.payment === 'paid' && status?.fulfillment === 'fulfilled';

  return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Success icon */}
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-gray-400 mb-6">
          {fulfilled
            ? 'Thank you for your purchase. Your content is ready to access.'
            : 'Thank you for your purchase. We’re unlocking your content — this usually takes a few seconds.'}
        </p>
        {status && !fulfilled && (
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs">
            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            {status.payment === 'paid' ? 'Preparing your library…' : 'Confirming payment…'}
          </div>
        )}

        {orderId && (
          <p className="text-sm text-gray-500 mb-6">
            Order: <span className="text-gray-300 font-mono">{orderId.slice(0, 8).toUpperCase()}</span>
          </p>
        )}

        {/* Order items */}
        {loading ? (
          <div className="mb-6 flex justify-center">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length > 0 && (
          <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl overflow-hidden text-left">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  {item.quantity > 1 && (
                    <p className="text-gray-500 text-xs">Qty {item.quantity}</p>
                  )}
                </div>
                <p className="text-gray-300 text-sm ml-4 shrink-0">
                  {item.price === 0 ? 'Free' : `$${(item.price * item.quantity).toFixed(2)}`}
                </p>
              </div>
            ))}
            {total !== null && total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white/3">
                <p className="text-gray-400 text-sm font-semibold">Total</p>
                <p className="text-white font-bold">${total.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/library?tab=purchases"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
          >
            Go to My Library
          </Link>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
