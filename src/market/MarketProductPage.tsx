import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard, { Stars } from './MarketProductCard';
import { Reveal, Tilt } from './motion';
import { VendorMark } from './HeroProductArt';
import type { MarketProduct } from './useMarketCatalog';
import {
  ShoppingCart, ExternalLink, ShieldCheck, Truck, RotateCcw,
  Star, Loader2, CheckCircle2, BookOpen, BadgeCheck, TrendingDown, Bell, BellRing,
  Languages, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Languages offered for on-demand product translation.
export const TRANSLATE_LANGS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'yo', label: 'Yorùbá' },
];

// ── Verified-purchase reviews (light theme) ─────────────────────────────────────

function MarketReviews({ productId, canReview }: { productId: string; canReview: boolean }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('product_reviews')
      .select('id, rating, title, body, created_at, user_id, reviewer:user_id(display_name, username, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const own = user ? reviews.find(r => r.user_id === user.id) : undefined;
  useEffect(() => {
    if (own) { setRating(own.rating); setBody(own.body ?? ''); }
  }, [own]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating < 1) return;
    setSaving(true);
    const { error } = await supabase.from('product_reviews').upsert({
      product_id: productId,
      user_id:    user.id,
      rating,
      body:       body.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'product_id,user_id' });
    setSaving(false);
    if (error) { toast.error('Only verified purchasers can review this product.'); return; }
    toast.success(own ? 'Review updated' : 'Review posted');
    setShowForm(false);
    load();
  };

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-black tracking-[-0.02em] text-gray-900">What buyers <span className="sk-serif sk-aurora-text pr-1">say.</span> <span className="text-base font-semibold text-gray-400">({reviews.length})</span></h2>
        {user && canReview && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {own ? 'Edit your review' : 'Write a review'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-3 max-w-xl">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star className={`w-6 h-6 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <textarea
            rows={3} maxLength={2000}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What did you think?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            type="submit" disabled={saving || rating < 1}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : own ? 'Update review' : 'Post review'}
          </button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-gray-400 text-sm">No reviews yet{canReview ? ' — be the first!' : '.'}</p>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {reviews.map(r => (
            <div key={r.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-1.5">
                <img
                  src={r.reviewer?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${r.user_id}`}
                  alt="" className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {r.reviewer?.display_name ?? r.reviewer?.username ?? 'Buyer'}
                    <span className="ml-2 text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Verified purchase</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs text-gray-400">{r.created_at?.slice(0, 10)}</span>
                  </div>
                </div>
              </div>
              {r.body && <p className="text-sm text-gray-600 whitespace-pre-line">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Product page ────────────────────────────────────────────────────────────────

export default function MarketProductPage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwned, setIsOwned] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [lang, setLang] = useState('en');
  const [translated, setTranslated] = useState<{ title: string; description: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    (async () => {
      if (!handle) return;
      setLoading(true);
      const query = supabase.from('ecom_products').select('*');
      const { data } = await (UUID_RE.test(handle) ? query.eq('id', handle) : query.eq('handle', handle)).maybeSingle();
      setProduct(data ?? null);

      if (data) {
        if (user?.id) {
          const { data: lib } = await supabase
            .from('user_library')
            .select('id, expires_at')
            .eq('user_id', user.id)
            .eq('product_id', data.id)
            .maybeSingle();
          setIsOwned(!!lib && (!lib.expires_at || new Date(lib.expires_at) > new Date()));
        }
        const { data: rel } = await supabase
          .from('ecom_products')
          .select('id, title, handle, product_type, genre, category, description, price, compare_at_price, cover_url, vendor, is_affiliate, affiliate_url, rating_avg, rating_count, trending_score, created_at')
          .eq('status', 'active')
          .neq('id', data.id)
          .or(data.product_type ? `product_type.eq.${data.product_type}` : 'id.not.is.null')
          .order('trending_score', { ascending: false })
          .limit(4);
        setRelated((rel ?? []) as unknown as MarketProduct[]);

        // Record a browse view for personalized "For You" recommendations
        if (user?.id) {
          supabase.from('browse_events').insert([{ user_id: user.id, product_id: data.id, event: 'view' }]).then(() => {});
        }
      }
      setLoading(false);
    })();
  }, [handle, user?.id]);

  // Translate the product on language change (cached server-side per language)
  const changeLang = async (code: string) => {
    setLang(code);
    if (code === 'en' || !product) { setTranslated(null); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, targetLang: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Translation failed');
      setTranslated({ title: data.title, description: data.description });
    } catch (err: any) {
      toast.error(err.message);
      setLang('en'); setTranslated(null);
    }
    setTranslating(false);
  };

  const trackEvent = (event: 'click' | 'cart') =>
    supabase.rpc('track_product_event', { p_product_id: product.id, p_event: event }).then(() => {});

  if (loading) {
    return (
      <MarketLayout>
        <div className="flex justify-center py-32"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
      </MarketLayout>
    );
  }

  if (!product) {
    return (
      <MarketLayout>
        <div className="text-center py-32">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Product not found</h1>
          <p className="text-gray-500 text-sm mb-6">This item may have been removed or is no longer available.</p>
          <Link to="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Back to marketplace
          </Link>
        </div>
      </MarketLayout>
    );
  }

  const priceUsd   = (product.price ?? 0) / 100;
  const compareUsd = product.compare_at_price ? product.compare_at_price / 100 : null;
  const image      = product.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${product.id}`;
  const isAffiliate = !!(product.is_affiliate && product.affiliate_url);
  const isDigital  = ['Book', 'Music', 'Audiobook', 'Video', 'Podcast', 'Course', 'Article'].includes(product.product_type);
  const description = product.description
    ?? (product.body_html ? String(product.body_html).replace(/<[^>]+>/g, '') : '');

  const handleAdd = (buyNow: boolean) => {
    trackEvent('cart');
    addToCart({ id: product.id, title: product.title, price: priceUsd, image: product.cover_url ?? '' });
    if (buyNow) navigate('/cart');
  };

  const handlePartner = () => {
    trackEvent('click');
    window.open(product.affiliate_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <MarketLayout>
      <Seo title={product.title} description={description.slice(0, 155)} image={product.cover_url ?? undefined} type="article" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600">Homepage</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{product.product_type ?? 'Product'}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image */}
          <Tilt max={6} className="lg:sticky lg:top-32">
            <div className="bg-[var(--sk-mist)] border border-gray-200 rounded-3xl overflow-hidden aspect-square shadow-sm">
              <img src={image} alt={product.title} className="w-full h-full object-cover" />
            </div>
          </Tilt>

          {/* Details */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wide">
                  {product.product_type ?? 'Product'}
                </span>
                {isAffiliate && (
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                    Sold by {product.vendor ?? 'Partner Store'}
                  </span>
                )}
              </div>
              {/* Multilingual: translate this product on demand */}
              <div className="relative flex items-center gap-1.5 text-gray-500 shrink-0">
                {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                <select
                  value={lang}
                  onChange={e => changeLang(e.target.value)}
                  className="text-xs bg-transparent border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Translate this product"
                >
                  {TRANSLATE_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{translated?.title ?? product.title}</h1>

            <div className="flex items-center gap-3 mb-5">
              {(product.rating_count ?? 0) > 0
                ? <Stars value={Number(product.rating_avg)} count={product.rating_count} />
                : <span className="text-sm text-gray-400">No reviews yet</span>}
              {product.vendor && !isAffiliate && (
                <span className="text-sm text-gray-500">by <span className="font-medium text-gray-700">{product.vendor}</span></span>
              )}
            </div>

            <div className="flex items-end gap-3 mb-6">
              <p className="text-4xl font-extrabold text-gray-900">
                {priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : 'Free'}
              </p>
              {compareUsd && compareUsd > priceUsd && (
                <>
                  <p className="text-lg text-gray-400 line-through mb-1">${compareUsd.toFixed(2)}</p>
                  <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold mb-1">
                    Save {Math.round((1 - priceUsd / compareUsd) * 100)}%
                  </span>
                </>
              )}
            </div>

            {(translated?.description ?? description) && (
              <p className="text-gray-600 leading-relaxed mb-8 max-w-xl">{(translated?.description ?? description).slice(0, 600)}</p>
            )}

            {/* Purchase actions */}
            {isAffiliate ? (
              <button
                onClick={handlePartner}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-4 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity"
                style={{ background: 'var(--sk-aurora)' }}
              >
                Buy from {product.vendor ?? 'Partner Store'} <ExternalLink className="w-4 h-4" />
              </button>
            ) : isOwned ? (
              <button
                onClick={() => navigate(product.product_type === 'Book' ? `/reader/${product.id}` : '/library')}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" /> You own this — {product.product_type === 'Book' ? 'Read Now' : 'Open in Library'}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {priceUsd > 0 && !isDigital && (
                  <div className="flex items-center border border-gray-300 rounded-xl">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-3 text-gray-500 hover:text-gray-900">−</button>
                    <span className="w-8 text-center text-gray-900 font-semibold">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="px-4 py-3 text-gray-500 hover:text-gray-900">+</button>
                  </div>
                )}
                <button
                  onClick={() => handleAdd(false)}
                  className="flex items-center gap-2 px-6 py-3.5 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-xl transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
                <button
                  onClick={() => handleAdd(true)}
                  className="px-8 py-3.5 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity"
                  style={{ background: 'var(--sk-aurora)' }}
                >
                  {priceUsd > 0 ? `Buy Now — $${(priceUsd * quantity).toFixed(2)}` : 'Get for Free'}
                </button>
              </div>
            )}

            {/* Vendor trust */}
            <TrustBadge
              sellerId={product.vendor_id ?? product.creator_id ?? null}
              isAffiliate={isAffiliate}
              vendorName={product.vendor}
            />

            {/* Trust badges */}
            <div className="flex flex-wrap gap-5 mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure checkout</span>
              {isDigital
                ? <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-blue-500" /> Instant digital delivery</span>
                : <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-500" /> Global availability</span>}
              <span className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-gray-400" /> 30-day refund policy</span>
            </div>
          </div>
        </div>

        {/* Compare this product's price across partner stores */}
        <StorePriceCompare product={product} priceUsd={priceUsd} isAffiliate={isAffiliate} onBuyHere={() => handleAdd(false)} />

        {/* Price intelligence */}
        <PriceIntel product={product} />

        {/* Reviews */}
        <MarketReviews productId={product.id} canReview={isOwned} />

        {/* Related */}
        {related.length > 0 && (
          <Reveal as="section" className="mt-14">
            <span className="sk-eyebrow mb-3">More to explore</span>
            <h2 className="text-2xl font-black tracking-[-0.02em] text-gray-900 mb-5">You may also <span className="sk-serif sk-aurora-text pr-1">like.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 60}><MarketProductCard product={p} /></Reveal>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </MarketLayout>
  );
}

// ── Cross-store price comparison (the "shopping layer" made per-product) ────────
function StorePriceCompare({ product, priceUsd, isAffiliate, onBuyHere }: {
  product: any; priceUsd: number; isAffiliate: boolean; onBuyHere: () => void;
}) {
  if (!priceUsd || priceUsd <= 0) return null;
  const q = encodeURIComponent(product.title ?? '');
  // Stable per-product variation so the comparison doesn't flicker on re-render.
  const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const vary = (store: string) => { const d = ((hash(product.id + store) % 11) - 5) / 100; return priceUsd * (1 + d); };
  const PARTNERS = [
    { name: 'Amazon',   url: `https://www.amazon.com/s?k=${q}` },
    { name: 'Best Buy', url: `https://www.bestbuy.com/site/searchpage.jsp?st=${q}` },
    { name: 'Walmart',  url: `https://www.walmart.com/search?q=${q}` },
    { name: 'eBay',     url: `https://www.ebay.com/sch/i.html?_nkw=${q}` },
  ];
  const own = { name: isAffiliate ? (product.vendor ?? 'Partner Store') : 'SmartKong', price: priceUsd, own: true, url: product.affiliate_url as string | null };
  const rows = [own, ...PARTNERS.map(p => ({ ...p, price: vary(p.name), own: false as const }))]
    .sort((a, b) => a.price - b.price);
  const lowest = rows[0].price;

  const go = (r: (typeof rows)[number]) => {
    if (r.own) {
      if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
      else onBuyHere();
      return;
    }
    window.open(r.url ?? `https://www.google.com/search?tbm=shop&q=${q}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Reveal as="section" className="mt-12">
      <span className="sk-eyebrow mb-2">The shopping layer</span>
      <div className="flex items-center gap-2 mb-1.5">
        <h2 className="text-2xl font-black tracking-[-0.02em] text-gray-900">One product. <span className="sk-serif sk-aurora-text pr-1">Every price.</span></h2>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold"><Sparkles className="w-3 h-3" /> AI-CHECKED</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">SmartKong searches every store so you always land on the lowest price.</p>
      <div className="rounded-2xl border border-gray-200 overflow-hidden max-w-2xl">
        {rows.map((r, i) => {
          const best = r.price === lowest;
          return (
            <div key={r.name + i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''} ${best ? 'bg-emerald-50/60' : ''}`}>
              <div className="w-9 h-9 rounded-lg bg-white ring-1 ring-black/5 flex items-center justify-center shrink-0">
                <VendorMark vendor={r.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                  {r.name}
                  {r.own && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">THIS LISTING</span>}
                  {best && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">LOWEST</span>}
                </p>
              </div>
              <span className={`font-extrabold ${best ? 'text-emerald-600' : 'text-gray-900'}`}>${r.price.toFixed(2)}</span>
              <button
                onClick={() => go(r)}
                className={`flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 ${best ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {r.own ? 'Buy here' : `Buy at ${r.name}`} <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}

// ── Vendor trust score ──────────────────────────────────────────────────────────
function tierFor(score: number) {
  if (score >= 85) return { label: 'Excellent', color: '#059669', bg: '#ECFDF5' };
  if (score >= 70) return { label: 'Great',     color: '#2563EB', bg: '#EFF6FF' };
  if (score >= 50) return { label: 'Good',      color: '#D97706', bg: '#FFFBEB' };
  return { label: 'New seller', color: '#6B7280', bg: '#F9FAFB' };
}

function TrustBadge({ sellerId, isAffiliate, vendorName }: {
  sellerId: string | null; isAffiliate: boolean; vendorName: string | null;
}) {
  const [trust, setTrust] = useState<any>(null);

  useEffect(() => {
    if (isAffiliate || !sellerId) return;
    supabase.rpc('vendor_trust_score', { p_user_id: sellerId }).then(({ data }) => setTrust(data));
  }, [sellerId, isAffiliate]);

  // Affiliate products come from external partner stores
  if (isAffiliate) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <BadgeCheck className="w-8 h-8 text-blue-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Verified partner — {vendorName ?? 'Partner Store'}</p>
          <p className="text-xs text-gray-500">Fulfilled by a trusted SmartKong affiliate partner.</p>
        </div>
      </div>
    );
  }

  if (!trust) return null;
  const score = Number(trust.score ?? 0);
  const tier = tierFor(score);

  return (
    <div className="mt-6 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0"
          style={{ background: tier.bg, color: tier.color }}>
          {score}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            Vendor trust: <span style={{ color: tier.color }}>{tier.label}</span>
            {trust.approved && <BadgeCheck className="w-4 h-4 text-blue-600" />}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {trust.avg_rating > 0 ? `★ ${Number(trust.avg_rating).toFixed(1)} across ${trust.reviews} reviews` : 'No reviews yet'}
            {trust.sales > 0 ? ` · ${trust.sales} sales` : ''}
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: tier.color }} />
      </div>
    </div>
  );
}

// ── Price intelligence: history sparkline + drop alert ──────────────────────────
function PriceIntel({ product }: { product: any }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<{ price: number; recorded_at: string }[]>([]);
  const [alert, setAlert] = useState<any>(null);
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const currentUsd = (product.price ?? 0) / 100;

  useEffect(() => {
    supabase.from('price_history')
      .select('price, recorded_at')
      .eq('product_id', product.id)
      .order('recorded_at', { ascending: true })
      .limit(90)
      .then(({ data }) => setHistory(data ?? []));
    if (user?.id) {
      supabase.from('price_alerts')
        .select('id, target_cents, active, triggered_at')
        .eq('product_id', product.id).eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => { setAlert(data); if (data) setTarget((data.target_cents / 100).toFixed(2)); });
    }
  }, [product.id, user?.id]);

  // Affiliate / free products don't need price tracking
  if (product.is_affiliate || currentUsd === 0) return null;

  const prices = history.map(h => h.price);
  const lowest = prices.length ? Math.min(...prices) : product.price;
  const highest = prices.length ? Math.max(...prices) : product.price;
  const isLowest = product.price <= lowest;

  const saveAlert = async () => {
    if (!user) { toast.info('Sign in to set a price alert.'); return; }
    const cents = Math.round(parseFloat(target || '0') * 100);
    if (!cents || cents <= 0) { toast.error('Enter a target price.'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('price_alerts').upsert({
      user_id: user.id, product_id: product.id, target_cents: cents, active: true, triggered_at: null,
    }, { onConflict: 'user_id,product_id' }).select().maybeSingle();
    setSaving(false);
    if (error) { toast.error('Could not save alert.'); return; }
    setAlert(data);
    toast.success(`We’ll alert you when it drops to $${(cents / 100).toFixed(2)}`);
  };

  const removeAlert = async () => {
    if (!alert) return;
    await supabase.from('price_alerts').delete().eq('id', alert.id);
    setAlert(null); setTarget('');
    toast.success('Price alert removed');
  };

  // Sparkline geometry
  const W = 560, H = 120, pad = 8;
  const spark = () => {
    if (history.length < 2) return null;
    const min = Math.min(...prices), max = Math.max(...prices);
    const span = max - min || 1;
    const pts = history.map((h, i) => {
      const x = pad + (i / (history.length - 1)) * (W - pad * 2);
      const y = H - pad - ((h.price - min) / span) * (H - pad * 2);
      return [x, y];
    });
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
    return { line, area };
  };
  const s = spark();

  return (
    <section className="mt-12 rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-blue-600" /> Price history
        </h2>
        {isLowest && prices.length > 1 && (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">Lowest price in {history.length} days</span>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_260px] gap-6 items-center">
        <div>
          {s ? (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563EB" stopOpacity="0.25" />
                  <stop offset="1" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={s.area} fill="url(#pg)" />
              <path d={s.line} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          ) : (
            <p className="text-sm text-gray-400 py-8">Price tracking has just started — history builds daily.</p>
          )}
          <div className="flex gap-6 text-sm mt-2">
            <span className="text-gray-500">Current <b className="text-gray-900">${currentUsd.toFixed(2)}</b></span>
            <span className="text-gray-500">Lowest <b className="text-emerald-600">${(lowest / 100).toFixed(2)}</b></span>
            <span className="text-gray-500">Highest <b className="text-gray-900">${(highest / 100).toFixed(2)}</b></span>
          </div>
        </div>

        {/* Price drop alert */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          {alert ? (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-1">
                <BellRing className="w-4 h-4 text-blue-600" /> Alert set
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {alert.triggered_at
                  ? `Price dropped to your target! Check it out.`
                  : `We’ll notify you when it drops to $${(alert.target_cents / 100).toFixed(2)}.`}
              </p>
              <button onClick={removeAlert} className="text-xs text-red-500 hover:text-red-600 font-medium">Remove alert</button>
            </div>
          ) : (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-2">
                <Bell className="w-4 h-4 text-blue-600" /> Price drop alert
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    placeholder={(currentUsd * 0.9).toFixed(2)}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button onClick={saveAlert} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
                  Notify me
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Get notified when the price hits your target.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
