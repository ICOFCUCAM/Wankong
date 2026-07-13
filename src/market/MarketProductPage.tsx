import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard, { Stars } from './MarketProductCard';
import type { MarketProduct } from './useMarketCatalog';
import {
  ShoppingCart, ExternalLink, ShieldCheck, Truck, RotateCcw,
  Star, Loader2, CheckCircle2, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        <h2 className="text-xl font-extrabold text-gray-900">Customer Reviews ({reviews.length})</h2>
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
      }
      setLoading(false);
    })();
  }, [handle, user?.id]);

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
          <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden aspect-square">
            <img src={image} alt={product.title} className="w-full h-full object-cover" />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wide">
                {product.product_type ?? 'Product'}
              </span>
              {isAffiliate && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                  Sold by {product.vendor ?? 'Partner Store'}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{product.title}</h1>

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

            {description && (
              <p className="text-gray-600 leading-relaxed mb-8 max-w-xl">{description.slice(0, 400)}</p>
            )}

            {/* Purchase actions */}
            {isAffiliate ? (
              <button
                onClick={handlePartner}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
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
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                >
                  {priceUsd > 0 ? `Buy Now — $${(priceUsd * quantity).toFixed(2)}` : 'Get for Free'}
                </button>
              </div>
            )}

            {/* Trust badges */}
            <div className="flex flex-wrap gap-5 mt-8 pt-6 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure checkout</span>
              {isDigital
                ? <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-blue-500" /> Instant digital delivery</span>
                : <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-500" /> Global availability</span>}
              <span className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-gray-400" /> 30-day refund policy</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <MarketReviews productId={product.id} canReview={isOwned} />

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-extrabold text-gray-900 mb-5">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map(p => <MarketProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </MarketLayout>
  );
}
