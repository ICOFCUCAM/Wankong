import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';
import { CATEGORIES } from '@/lib/constants';

const PAGE_SIZE = 24;

interface Product {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  type: string;
  thumbnail: string;
  price: number;
  isPaid: boolean;
  isAffiliate: boolean;
  category: string;
  tags: string[];
  createdAt: string;
}

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  followers: number;
  bio: string;
  category: string;
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function typeIcon(type: string) {
  switch (type) {
    case 'music':  return 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3';
    case 'video':  return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
    default:       return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
  }
}

export default function Marketplace() {
  const { searchQuery, setSearchQuery, isAuthenticated, setShowAuthModal, setAuthMode } = useApp();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy]     = useState<'popular' | 'newest' | 'price_low' | 'price_high'>('newest');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showCreators, setShowCreators] = useState(false);

  const [products,  setProducts]  = useState<Product[]>([]);
  const [creators,  setCreators]  = useState<Creator[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page,      setPage]      = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Server-side filtering/sorting/pagination — the catalog no longer loads
  // everything into the browser, so it scales past a few dozen products.
  const fetchProducts = useCallback(async (pageIndex: number): Promise<{ items: Product[]; count: number }> => {
    let query = supabase
      .from('ecom_products')
      .select('id, title, product_type, price, cover_url, created_at, vendor_id, creator_id, vendor, is_affiliate', { count: 'exact' })
      .eq('status', 'active');

    if (selectedCategory !== 'All') query = query.eq('product_type', selectedCategory);
    if (searchQuery)                query = query.ilike('title', `%${searchQuery.replace(/[%_]/g, '\\$&')}%`);
    if (priceFilter === 'free')     query = query.eq('price', 0);
    if (priceFilter === 'paid')     query = query.gt('price', 0);

    switch (sortBy) {
      case 'popular':    query = query.order('stream_count', { ascending: false }); break;
      case 'price_low':  query = query.order('price', { ascending: true }); break;
      case 'price_high': query = query.order('price', { ascending: false }); break;
      default:           query = query.order('created_at', { ascending: false });
    }

    const from = pageIndex * PAGE_SIZE;
    const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
    const rows = data ?? [];

    // vendor_id references auth.users, so PostgREST can't embed profiles —
    // fetch the seller profiles in a second query instead.
    const sellerIds = [...new Set(rows.map((p: any) => p.vendor_id ?? p.creator_id).filter(Boolean))];
    const profilesById = new Map<string, any>();
    if (sellerIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', sellerIds);
      (profs ?? []).forEach((p: any) => profilesById.set(p.id, p));
    }

    const items = rows.map((p: any) => {
      const sellerId = p.vendor_id ?? p.creator_id;
      const profile  = sellerId ? profilesById.get(sellerId) : undefined;
      return {
        id:            p.id,
        title:         p.title ?? 'Untitled',
        creator:       profile?.display_name ?? profile?.username ?? p.vendor ?? 'Creator',
        creatorAvatar: profile?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${sellerId ?? p.id}`,
        type:          (p.product_type ?? 'music').toLowerCase(),
        thumbnail:     p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`,
        price:         (p.price ?? 0) / 100,
        isPaid:        (p.price ?? 0) > 0,
        isAffiliate:   !!p.is_affiliate,
        category:      p.product_type ?? 'Music',
        tags:          [],
        createdAt:     p.created_at,
      };
    });

    return { items, count: count ?? items.length };
  }, [searchQuery, selectedCategory, sortBy, priceFilter]);

  // Reload from page 0 whenever a filter changes (debounced for typing)
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchProducts(0).then(({ items, count }) => {
        setProducts(items);
        setTotalCount(count);
        setPage(0);
        setLoading(false);
      });
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, searchQuery]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const { items } = await fetchProducts(nextPage);
    setProducts(prev => [...prev, ...items]);
    setPage(nextPage);
    setLoadingMore(false);
  };

  useEffect(() => {
    // Load creators
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, bio, follower_count, role, verified')
      .in('role', ['artist', 'author', 'creator'])
      .order('follower_count', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (data) {
          setCreators(data.map((p: any) => ({
            id:        p.id,
            name:      p.display_name ?? p.username ?? 'Creator',
            username:  p.username ?? '',
            avatar:    p.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${p.id}`,
            verified:  p.verified ?? false,
            followers: p.follower_count ?? 0,
            bio:       p.bio ?? '',
            category:  p.role === 'artist' ? 'Music' : p.role === 'author' ? 'Books' : 'Creator',
          })));
        }
      });
  }, []);

  const toggleFavorite = (id: string) => {
    if (!isAuthenticated) { setAuthMode('login'); setShowAuthModal(true); return; }
    setFavorites(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const filtered = products;
  const hasMore  = products.length < totalCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-400 mt-1">{loading ? 'Loading…' : `${totalCount} items found`}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreators(!showCreators)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showCreators ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {showCreators ? 'Show Content' : 'Show Creators'}
          </button>
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>{cat}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="newest">Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
          <select value={priceFilter} onChange={e => setPriceFilter(e.target.value as typeof priceFilter)} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="all">All Prices</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : showCreators ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {creators.map(creator => (
            <div key={creator.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-[#9D4EDD]/20 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <img src={creator.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium text-white">{creator.name}</p>
                  <p className="text-xs text-gray-400">@{creator.username}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{creator.bio || 'Creator on WANKONG'}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{creator.followers.toLocaleString()} followers</span>
                <span className="text-emerald-400 font-medium">{creator.category}</span>
              </div>
            </div>
          ))}
          {creators.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">No creators yet.</div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} onClick={() => navigate(`/products/${item.id}`)} className="group cursor-pointer bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-[#9D4EDD]/20 transition-all hover:-translate-y-0.5">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-[10px] text-white capitalize flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeIcon(item.type)} /></svg>
                    {item.type}
                  </span>
                </div>
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.isPaid ? 'bg-emerald-500/80 text-white' : 'bg-[#9D4EDD]/80 text-white'}`}>
                    {item.isPaid ? formatCurrency(item.price) : 'Free'}
                  </span>
                  {item.isAffiliate && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00D9FF]/80 text-black">
                      Partner
                    </span>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFavorite(item.id); }} className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                  <svg className={`w-4 h-4 ${favorites.has(item.id) ? 'text-red-400 fill-red-400' : 'text-white'}`} fill={favorites.has(item.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </button>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <img src={item.creatorAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-xs text-gray-400">{item.creator}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} onClick={() => navigate(`/products/${item.id}`)} className="flex items-center gap-4 p-3 cursor-pointer bg-gray-900/50 border border-gray-800 rounded-xl hover:border-[#9D4EDD]/20 transition-all">
              <img src={item.thumbnail} alt="" className="w-16 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.title}</p>
                <p className="text-xs text-gray-400">{item.creator} · {item.category}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#9D4EDD]/20 text-[#B794F4]'}`}>
                {item.isPaid ? formatCurrency(item.price) : 'Free'}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && !showCreators && hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loadingMore ? 'Loading…' : `Load more (${totalCount - products.length} remaining)`}
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && !showCreators && (
        <div className="text-center py-20">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="text-gray-400">No content found matching your criteria</p>
          <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setPriceFilter('all'); }} className="text-[#B794F4] hover:text-[#C9B3F5] text-sm mt-2">Clear filters</button>
        </div>
      )}
    </div>
  );
}
