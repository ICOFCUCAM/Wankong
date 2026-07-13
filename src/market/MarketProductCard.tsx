import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ExternalLink, ShoppingCart, GitCompare } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { MarketProduct } from './useMarketCatalog';
import { useCompare } from './useCompare';

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="flex items-center gap-1">
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
        ))}
      </span>
      {count != null && <span className="text-xs text-gray-400">({count})</span>}
    </span>
  );
}

export default function MarketProductCard({ product }: { product: MarketProduct }) {
  const { addToCart } = useCart();
  const { has, toggle, isFull } = useCompare();
  const inCompare = has(product.id);

  const priceUsd = (product.price ?? 0) / 100;
  const compareUsd = product.compare_at_price ? product.compare_at_price / 100 : null;
  const image = product.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${product.id}`;
  const link = `/products/${product.handle ?? product.id}`;

  const trackEvent = (event: 'click' | 'cart') =>
    supabase.rpc('track_product_event', { p_product_id: product.id, p_event: event }).then(() => {});

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    trackEvent('cart');
    addToCart({ id: product.id, title: product.title, price: priceUsd, image: product.cover_url ?? '' });
  };

  const handlePartner = (e: React.MouseEvent) => {
    e.preventDefault();
    trackEvent('click');
    if (product.affiliate_url) window.open(product.affiliate_url, '_blank', 'noopener,noreferrer');
    else toast.error('Partner link unavailable');
  };

  return (
    <Link
      to={link}
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all flex flex-col"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img src={image} alt={product.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          {product.is_affiliate ? (product.vendor ?? 'Partner') : (product.product_type ?? 'Product')}
        </span>
        {compareUsd && compareUsd > priceUsd && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold">
            -{Math.round((1 - priceUsd / compareUsd) * 100)}%
          </span>
        )}
        <button
          onClick={e => {
            e.preventDefault();
            if (!inCompare && isFull) { toast.info('Compare holds up to 4 products.'); return; }
            toggle(product.id);
          }}
          title={inCompare ? 'Remove from comparison' : 'Add to comparison'}
          className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border backdrop-blur-sm transition-colors ${
            inCompare ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/90 text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          <GitCompare className="w-3 h-3" /> {inCompare ? 'Added' : 'Compare'}
        </button>
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {product.title}
        </h3>
        <div className="mt-1.5">
          {(product.rating_count ?? 0) > 0
            ? <Stars value={Number(product.rating_avg)} count={product.rating_count ?? 0} />
            : <span className="text-xs text-gray-300">No reviews yet</span>}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">
              {priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : 'Free'}
            </p>
            {compareUsd && compareUsd > priceUsd && (
              <p className="text-xs text-gray-400 line-through">${compareUsd.toFixed(2)}</p>
            )}
          </div>
          {product.is_affiliate ? (
            <button
              onClick={handlePartner}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              View Deal <ExternalLink className="w-3 h-3" />
            </button>
          ) : priceUsd > 0 ? (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Add
            </button>
          ) : (
            <span className="px-3 py-2 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg">Get Free</span>
          )}
        </div>
      </div>
    </Link>
  );
}
