import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard from './MarketProductCard';
import { Reveal } from './motion';
import type { MarketProduct } from './useMarketCatalog';
import { rememberRef } from './PartnerRedirect';
import { BadgeCheck, Loader2, Store } from 'lucide-react';

// Persistent per-partner storefront — /s/:code. A shareable branded shop page
// over the unified catalog that ALSO drops the partner's 30-day attribution
// cookie, so every purchase made after landing here credits the partner. This
// is the partner's tracked link and their shop in one URL.
interface Profile {
  code: string; display_name: string | null; tagline: string | null;
  bio: string | null; avatar_url: string | null; accent: string | null;
}

export default function MarketStorefrontPage() {
  const { code } = useParams<{ code: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    // Landing here attributes future purchases to this partner (30-day window).
    rememberRef(code);
    supabase.rpc('record_partner_click', { p_code: code, p_product_id: null, p_target: 'storefront', p_country: null })
      .then(() => {}, () => {});

    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.rpc('public_storefront', { p_code: code }),
      supabase.rpc('storefront_products', { p_code: code }),
    ]).then(([p, pr]) => {
      if (cancelled) return;
      const prof = (Array.isArray(p.data) ? p.data[0] : p.data) as Profile | undefined;
      if (!prof) { setNotFound(true); setLoading(false); return; }
      setProfile(prof);
      setProducts((Array.isArray(pr.data) ? pr.data : []) as MarketProduct[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [code]);

  if (loading) {
    return (
      <MarketLayout>
        <div className="flex justify-center py-32"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
      </MarketLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <MarketLayout>
        <div className="max-w-lg mx-auto text-center py-28 px-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4"><Store className="w-6 h-6 text-gray-400" /></div>
          <h1 className="text-2xl font-black text-gray-900">Storefront not found</h1>
          <p className="text-gray-500 mt-2">This partner storefront doesn’t exist or isn’t open yet.</p>
          <Link to="/shop" className="inline-block mt-6 px-6 py-3 rounded-xl text-white font-bold shadow-lg shadow-violet-500/25" style={{ background: 'var(--sk-aurora)' }}>Browse the marketplace</Link>
        </div>
      </MarketLayout>
    );
  }

  const name = profile.display_name || profile.code;
  const accent = profile.accent && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(profile.accent) ? profile.accent : null;
  const avatar = profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return (
    <MarketLayout>
      <Seo title={`${name} — SmartKong storefront`} description={profile.tagline || profile.bio || `Shop ${name}'s curated picks on SmartKong.`} image={profile.avatar_url ?? undefined} />

      {/* Branded header */}
      <div
        className="border-b border-gray-100"
        style={accent ? { background: `linear-gradient(180deg, ${accent}14, transparent)` } : { background: 'linear-gradient(180deg, var(--sk-mist), transparent)' }}
      >
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
          <Reveal className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            <img
              src={avatar} alt={name}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white shadow-lg shrink-0"
              style={accent ? { boxShadow: `0 10px 30px -10px ${accent}66` } : undefined}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-3xl md:text-4xl font-black tracking-[-0.02em] text-gray-900">{name}</h1>
                <BadgeCheck className="w-6 h-6" style={{ color: accent ?? 'var(--sk-iris, #6366f1)' }} />
              </div>
              {profile.tagline && <p className="text-gray-600 font-medium mt-1">{profile.tagline}</p>}
              {profile.bio && <p className="text-sm text-gray-500 mt-2 max-w-xl leading-relaxed">{profile.bio}</p>}
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mt-3 flex items-center gap-1.5 justify-center sm:justify-start">
                <Store className="w-3.5 h-3.5" /> Curated storefront · every purchase supports this partner
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">{name} hasn’t added any products to their storefront yet.</p>
            <Link to="/shop" className="inline-block mt-5 text-blue-600 font-semibold">Explore the full marketplace →</Link>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{name}’s picks</h2>
              <span className="text-sm text-gray-400">{products.length} product{products.length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={i * 45}><MarketProductCard product={p} /></Reveal>
              ))}
            </div>
          </>
        )}
      </div>
    </MarketLayout>
  );
}
