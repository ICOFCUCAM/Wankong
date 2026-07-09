import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('ecom_orders')
      .select('total_cents, ecom_order_items(title, price, quantity)')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTotal((data.total_cents ?? 0) / 100);
          setItems(
            ((data as any).ecom_order_items ?? []).map((i: any) => ({
              title:    i.title,
              price:    i.price / 100,
              quantity: i.quantity,
            }))
          );
        }
        setLoading(false);
      });
  }, [orderId]);

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
        <p className="text-gray-400 mb-6">Thank you for your purchase. Your content is ready to access.</p>

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
