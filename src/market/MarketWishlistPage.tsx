import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard from './MarketProductCard';
import type { MarketProduct } from './useMarketCatalog';
import { useWishlist } from './useWishlist';
import { Heart, Loader2 } from 'lucide-react';

const SELECT = 'id, title, handle, product_type, genre, category, description, price, compare_at_price, cover_url, vendor, is_affiliate, affiliate_url, rating_avg, rating_count, trending_score, created_at';

// Saved items — the home for the wishlist hearts on product cards.
export default function MarketWishlistPage() {
  const { ids, count } = useWishlist();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    supabase.from('ecom_products').select(SELECT).in('id', ids).then(({ data }) => {
      // Preserve save order (most recent last in localStorage → show newest first)
      const ordered = [...ids].reverse().map(id => (data ?? []).find((p: any) => p.id === id)).filter(Boolean) as MarketProduct[];
      setProducts(ordered);
      setLoading(false);
    });
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MarketLayout>
      <Seo title="Your Wishlist" description="Products you've saved on SmartKong." noIndex />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Your wishlist</h1>
            <p className="text-sm text-gray-500 mt-0.5">{count} saved {count === 1 ? 'item' : 'items'}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nothing saved yet. Tap the heart on any product to save it here.</p>
            <Link to="/shop" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => <MarketProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </MarketLayout>
  );
}
