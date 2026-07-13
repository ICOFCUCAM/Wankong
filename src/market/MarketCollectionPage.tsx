import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard from './MarketProductCard';
import { Reveal } from './motion';
import type { MarketProduct } from './useMarketCatalog';
import { COLLECTIONS } from './collectionsData';
import { ArrowLeft, ShoppingCart, Sparkles, Loader2 } from 'lucide-react';

const SELECT = 'id, title, handle, product_type, genre, category, description, price, compare_at_price, cover_url, vendor, is_affiliate, affiliate_url, rating_avg, rating_count, trending_score, created_at';

// AI Collection detail — assembles a complete, shoppable kit from the live
// catalog (one product per slot), with a running total and "add all to cart".
export default function MarketCollectionPage() {
  const { key } = useParams();
  const col = COLLECTIONS.find(c => c.key === key);
  const { addToCart } = useCart();
  const [items, setItems] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!col) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      col.slots.map(s =>
        supabase.from('ecom_products').select(SELECT).eq('status', 'active').ilike('title', `%${s.q}%`).limit(1)
          .then(({ data }) => (Array.isArray(data) && data[0] ? (data[0] as MarketProduct) : null))
      )
    ).then(results => {
      if (cancelled) return;
      const found = results.filter(Boolean) as MarketProduct[];
      // De-dupe (a keyword can match the same product twice).
      const unique = Array.from(new Map(found.map(p => [p.id, p])).values());
      if (unique.length >= 2) { setItems(unique); setLoading(false); return; }
      // Fallback so the page is never empty: fill from trending.
      supabase.from('ecom_products').select(SELECT).eq('status', 'active').order('trending_score', { ascending: false }).limit(col.slots.length)
        .then(({ data }) => { if (!cancelled) { setItems(Array.isArray(data) ? (data as MarketProduct[]) : []); setLoading(false); } });
    });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!col) {
    return (
      <MarketLayout>
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <p className="text-gray-500 mb-4">That collection doesn’t exist.</p>
          <Link to="/" className="text-blue-600 font-semibold">Back home</Link>
        </div>
      </MarketLayout>
    );
  }

  const total = items.reduce((s, p) => s + (p.price ?? 0), 0) / 100;
  const addAll = () => {
    if (items.length === 0) return;
    items.forEach(p => addToCart({ id: p.id, title: p.title, price: (p.price ?? 0) / 100, image: p.cover_url ?? '' }));
    toast.success(`Added ${items.length} items to your cart`);
  };

  return (
    <MarketLayout>
      <Seo title={col.title} description={col.sub} />

      {/* Gradient header */}
      <section className={`sk-grain bg-gradient-to-br ${col.grad} text-white`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <Link to="/" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-6"><ArrowLeft className="w-4 h-4" /> Back to collections</Link>
          <Reveal className="flex items-start gap-5">
            <span className="text-6xl md:text-7xl drop-shadow">{col.emoji}</span>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[11px] font-bold tracking-[0.14em] uppercase mb-3"><Sparkles className="w-3.5 h-3.5" /> AI Curated Kit</span>
              <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[0.98]">{col.title}</h1>
              <p className="text-white/85 mt-4 max-w-xl leading-relaxed text-base md:text-lg">{col.sub}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 mb-4">We couldn’t assemble this kit right now.</p>
            <Link to="/shop" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl">Browse all products</Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black tracking-[-0.02em] text-gray-900">Everything in <span className="sk-serif sk-aurora-text pr-1">this kit.</span></h2>
              <span className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'} · AI-matched</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 7) * 45}><MarketProductCard product={p} /></Reveal>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gray-50 border border-gray-200 p-6">
              <div>
                <p className="text-sm text-gray-500">Complete kit total</p>
                <p className="text-3xl font-black text-gray-900">${total.toFixed(2)}</p>
              </div>
              <button onClick={addAll} className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity" style={{ background: 'var(--sk-aurora)' }}>
                <ShoppingCart className="w-4 h-4" /> Add all to cart
              </button>
            </div>
          </>
        )}
      </section>
    </MarketLayout>
  );
}
