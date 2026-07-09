import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';

interface Product {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  type: string;
  thumbnail: string;
  price: number;
  isPaid: boolean;
  category: string;
  createdAt: string;
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function typeIcon(type: string) {
  switch (type) {
    case 'music':    return 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3';
    case 'video':    return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
    case 'podcast':  return 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z';
    case 'book':     return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
    default:         return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  }
}

export default function TrendingSection() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredCard, setHoveredCard]       = useState<string | null>(null);
  const [products,     setProducts]         = useState<Product[]>([]);
  const [loading,      setLoading]          = useState(true);

  useEffect(() => {
    supabase
      .from('ecom_products')
      .select('id, title, product_type, price_cents, cover_url, created_at, vendor_id, profiles:vendor_id(display_name, username, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProducts(data.map((p: any) => {
            const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
            const type    = (p.product_type ?? 'music').toLowerCase();
            return {
              id:            p.id,
              title:         p.title ?? 'Untitled',
              creator:       profile?.display_name ?? profile?.username ?? 'Creator',
              creatorAvatar: profile?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${p.vendor_id}`,
              type,
              thumbnail:     p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`,
              price:         (p.price_cents ?? 0) / 100,
              isPaid:        (p.price_cents ?? 0) > 0,
              category:      p.product_type ?? 'Music',
              createdAt:     p.created_at,
            };
          }));
        }
        setLoading(false);
      });
  }, []);

  const filtered = activeCategory === 'All'
    ? products
    : products.filter(p => p.type === activeCategory.toLowerCase() || p.category === activeCategory);

  if (loading) {
    return (
      <section className="py-20 px-4 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Trending Now</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-20 px-4 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Trending Now</h2>
          <p className="text-gray-400">Discover the hottest content from creators worldwide</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No content in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(item => (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="group bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:border-[#9D4EDD]/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#9D4EDD]/5 cursor-pointer"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                  <svg className="w-3.5 h-3.5 text-[#B794F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeIcon(item.type)} /></svg>
                  <span className="text-xs text-white capitalize">{item.type}</span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#9D4EDD]/20 text-[#B794F4] border border-[#9D4EDD]/30'}`}>
                    {item.isPaid ? formatCurrency(item.price) : 'Free'}
                  </span>
                </div>
                {hoveredCard === item.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-[#9D4EDD]/90 rounded-full flex items-center justify-center shadow-lg shadow-[#9D4EDD]/30 animate-pulse">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-1 truncate">{item.title}</h3>
                <div className="flex items-center gap-2">
                  <img src={item.creatorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-sm text-gray-400">{item.creator}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
