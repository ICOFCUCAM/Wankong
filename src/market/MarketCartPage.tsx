import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import { Reveal, Magnetic } from './motion';
import { ShoppingCart, Trash2, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

// SmartKong cart — the "one cart, every store" promise made real, in the
// light Meridian brand. Routed only in market mode (the WANKONG CartPage is
// left as-is for the creator platform).
export default function MarketCartPage() {
  const { items, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <MarketLayout>
        <Seo title="Your cart" noIndex />
        <div className="max-w-2xl mx-auto px-4 py-28 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--sk-mist)] flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-7 h-7 text-blue-500" />
          </div>
          <span className="sk-eyebrow justify-center mb-3">Nothing here yet</span>
          <h1 className="text-3xl md:text-4xl font-black tracking-[-0.02em] text-gray-900">Your cart is <span className="sk-serif sk-aurora-text pr-1">empty.</span></h1>
          <p className="text-gray-500 mt-3 mb-8">One cart holds every store on Earth — go fill it.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/shop" className="px-6 py-3.5 rounded-xl text-white font-bold shadow-lg shadow-violet-500/25" style={{ background: 'var(--sk-aurora)' }}>Browse everything</Link>
            <Link to="/ai-solver" className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 font-bold transition-colors"><Sparkles className="w-4 h-4" /> Ask the AI</Link>
          </div>
        </div>
      </MarketLayout>
    );
  }

  const storeCount = new Set(items.map(i => (i as any).variant ?? i.id)).size;

  return (
    <MarketLayout>
      <Seo title="Your cart" noIndex />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        <Reveal>
          <span className="sk-eyebrow mb-2">One checkout · every store</span>
          <h1 className="text-3xl md:text-4xl font-black tracking-[-0.02em] text-gray-900">Your <span className="sk-serif sk-aurora-text pr-1">cart.</span></h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} {items.length === 1 ? 'item' : 'items'} · checkout once</p>
        </Reveal>

        <div className="mt-8 grid lg:grid-cols-3 gap-8 items-start">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={i * 40} className="flex gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-200 transition-colors">
                {item.image
                  ? <img src={item.image} alt={item.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  : <div className="w-20 h-20 rounded-xl bg-[var(--sk-mist)] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-semibold leading-snug line-clamp-2">{item.title}</h3>
                  {item.variant && <p className="text-xs text-gray-400 mt-0.5">{item.variant}</p>}
                  <p className="text-blue-600 font-bold mt-1">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeFromCart(item.id)} title="Remove" className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition-colors">−</button>
                    <span className="text-gray-900 text-sm w-6 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>
              </Reveal>
            ))}
            <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-500 transition-colors pt-1">Clear cart</button>
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:top-32 rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-gray-900 font-bold mb-4">Order summary</h3>
            <div className="space-y-2.5 text-sm mb-5">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="text-gray-900 font-medium">${cartTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Stores combined</span><span className="text-gray-900 font-medium">{storeCount}</span></div>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-gray-900 font-black text-lg"><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
            </div>
            <Magnetic className="w-full block">
              <button onClick={() => navigate('/checkout')} className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity" style={{ background: 'var(--sk-aurora)' }}>
                <Lock className="w-4 h-4" /> Checkout once
              </button>
            </Magnetic>
            <Link to="/shop" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mt-3 transition-colors">
              Continue shopping <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure checkout · buyer protection included
            </p>
          </div>
        </div>
      </div>
    </MarketLayout>
  );
}
