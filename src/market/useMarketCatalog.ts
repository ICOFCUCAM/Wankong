import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { categoryBySlug, categoryOrExpression } from './categories';

export interface MarketProduct {
  id: string;
  title: string;
  handle: string | null;
  product_type: string | null;
  genre: string | null;
  category: string | null;
  description: string | null;
  price: number;              // cents
  compare_at_price: number | null;
  cover_url: string | null;
  vendor: string | null;
  is_affiliate: boolean;
  affiliate_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  trending_score: number | null;
  created_at: string;
}

export interface CatalogFilters {
  search?: string;
  category?: string;        // MARKET_CATEGORIES slug
  maxPriceUsd?: number;     // 0..200000, 200000 = unlimited
  minRating?: number;       // 0 | 3 | 4
  freeOnly?: boolean;
  sort?: 'relevance' | 'newest' | 'price_low' | 'price_high' | 'rating';
}

export const PAGE_SIZE = 24;

const SELECT_COLUMNS =
  'id, title, handle, product_type, genre, category, description, price, compare_at_price, cover_url, vendor, is_affiliate, affiliate_url, rating_avg, rating_count, trending_score, created_at';

async function fetchPage(filters: CatalogFilters, page: number) {
  let query = supabase
    .from('ecom_products')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .eq('status', 'active');

  const cat = categoryBySlug(filters.category);
  if (cat) {
    const expr = categoryOrExpression(cat);
    if (expr) query = query.or(expr);
  }
  if (filters.search) {
    const q = filters.search.replace(/[%_,()]/g, ' ').trim();
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,genre.ilike.%${q}%,vendor.ilike.%${q}%`);
  }
  if (filters.maxPriceUsd != null && filters.maxPriceUsd < 200000) {
    query = query.lte('price', Math.round(filters.maxPriceUsd * 100));
  }
  if (filters.freeOnly) query = query.eq('price', 0);
  if (filters.minRating) query = query.gte('rating_avg', filters.minRating);

  switch (filters.sort) {
    case 'newest':     query = query.order('created_at', { ascending: false }); break;
    case 'price_low':  query = query.order('price', { ascending: true }); break;
    case 'price_high': query = query.order('price', { ascending: false }); break;
    case 'rating':     query = query.order('rating_avg', { ascending: false }); break;
    default:           query = query.order('trending_score', { ascending: false }).order('created_at', { ascending: false });
  }

  const from = page * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  // Defensive: never let a malformed response (proxy error page, HTML body)
  // put a non-array into state — that would crash every .map() downstream.
  const items = Array.isArray(data) ? (data as unknown as MarketProduct[]) : [];
  return { items, count: typeof count === 'number' ? count : items.length };
}

export function useMarketCatalog(filters: CatalogFilters) {
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const key = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      fetchPage(filters, 0)
        .then(({ items, count }) => {
          if (cancelled) return;
          setProducts(items);
          setTotal(count);
          setPage(0);
        })
        .catch(err => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, filters.search ? 250 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { items } = await fetchPage(filters, next);
      setProducts(prev => [...prev, ...items]);
      setPage(next);
    } catch { /* keep current page */ }
    setLoadingMore(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);

  return { products, total, loading, loadingMore, error, hasMore: products.length < total, loadMore };
}
