import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { TrendingUp, SlidersHorizontal, X as XIcon, User } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type ContentType = 'all' | 'music' | 'podcast' | 'book' | 'audiobook' | 'video';
type SortOption  = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'free';

interface FilterState {
  type:     ContentType;
  sort:     SortOption;
  lang:     string;
  free:     boolean;
  genre:    string;
  maxPrice: number;  // 0 = no limit
  verified: boolean;
}

interface ArtistResult {
  id:        string;
  name:      string;
  avatar:    string | null;
  slug:      string | null;
  followers: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_FILTERS: { label: string; value: ContentType; icon: string }[] = [
  { label: 'All',        value: 'all',       icon: '🔍' },
  { label: 'Music',      value: 'music',     icon: '🎵' },
  { label: 'Podcast',    value: 'podcast',   icon: '🎙️' },
  { label: 'Book',       value: 'book',      icon: '📖' },
  { label: 'Audiobook',  value: 'audiobook', icon: '🎧' },
  { label: 'Video',      value: 'video',     icon: '🎬' },
];

const GENRES = [
  'Gospel', 'Afrobeats', 'Highlife', 'Worship', 'Afro-Gospel',
  'Pidgin', 'R&B', 'Hip-Hop', 'Jazz', 'Classical', 'Reggae',
];

// Trending terms are loaded from the top-streamed content titles at runtime

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Best Match',     value: 'relevance'  },
  { label: 'Newest',         value: 'newest'     },
  { label: 'Price: Low→High',value: 'price_asc'  },
  { label: 'Price: High→Low',value: 'price_desc' },
  { label: 'Free Only',      value: 'free'       },
];

const RECENT_KEY = 'wk_recent_searches';

function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveSearch(q: string) {
  const prev = getRecentSearches();
  const updated = [q, ...prev.filter(s => s !== q)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const q               = searchParams.get('q') || '';
  const inputRef        = useRef<HTMLInputElement>(null);

  const [results,   setResults]   = useState<any[]>([]);
  const [artists,   setArtists]   = useState<ArtistResult[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [query,     setQuery]     = useState(q);
  const [filters,   setFilters]   = useState<FilterState>({
    type: 'all', sort: 'relevance', lang: '', free: false, genre: '', maxPrice: 0, verified: false,
  });
  const [recent,       setRecent]       = useState<string[]>(() => getRecentSearches());
  const [showSugg,     setShowSugg]     = useState(false);
  const [showAdv,      setShowAdv]      = useState(false);
  const [trendingTerms, setTrendingTerms] = useState<string[]>([]);

  // Load trending terms from top-streamed titles on mount
  useEffect(() => {
    supabase
      .from('ecom_products')
      .select('title')
      .eq('status', 'active')
      .order('stream_count', { ascending: false, nullsFirst: false })
      .limit(8)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTrendingTerms(data.map((p: any) => p.title));
        }
      });
  }, []);

  // Run search whenever q or filters change
  useEffect(() => {
    if (!q.trim()) { setResults([]); setArtists([]); return; }
    saveSearch(q);
    setRecent(getRecentSearches());
    setLoading(true);

    // ── Products search ─────────────────────────────────────────────────────
    let qb = supabase
      .from('ecom_products')
      .select('*')
      .or(`title.ilike.%${q}%,body_html.ilike.%${q}%,vendor.ilike.%${q}%,product_type.ilike.%${q}%,artist.ilike.%${q}%,author.ilike.%${q}%,genre.ilike.%${q}%`)
      .eq('status', 'active');

    if (filters.type !== 'all')  qb = qb.ilike('product_type', `${filters.type}%`);
    if (filters.sort === 'free') qb = qb.or('price.is.null,price.eq.0');
    if (filters.lang)            qb = qb.ilike('language', `%${filters.lang}%`);
    if (filters.genre)           qb = qb.ilike('genre', `%${filters.genre}%`);
    if (filters.maxPrice > 0)    qb = qb.lte('price', filters.maxPrice * 100);
    if (filters.verified)        qb = qb.eq('is_verified', true);

    if      (filters.sort === 'newest')     qb = qb.order('created_at', { ascending: false });
    else if (filters.sort === 'price_asc')  qb = qb.order('price', { ascending: true });
    else if (filters.sort === 'price_desc') qb = qb.order('price', { ascending: false });
    else                                    qb = qb.order('stream_count', { ascending: false, nullsFirst: false });

    // ── Artist/Author search (parallel) ─────────────────────────────────────
    const artistSearch = supabase
      .from('ecom_products')
      .select('vendor, creator_id, cover_image_url, handle')
      .or(`vendor.ilike.%${q}%,artist.ilike.%${q}%,author.ilike.%${q}%`)
      .eq('status', 'active')
      .limit(5);

    Promise.all([qb.limit(48), artistSearch]).then(async ([{ data }, { data: aData }]) => {
      setResults(data || []);

      // Deduplicate by vendor name
      const seen = new Set<string>();
      const dedupedArtists: ArtistResult[] = [];
      (aData || []).forEach(p => {
        const name = p.vendor;
        if (name && !seen.has(name)) {
          seen.add(name);
          dedupedArtists.push({
            id:        p.creator_id || p.handle,
            name,
            avatar:    p.cover_image_url,
            slug:      p.handle,
            followers: 0,
          });
        }
      });

      // Fetch real follower counts for each artist
      const creatorIds = dedupedArtists
        .map(a => a.id)
        .filter(Boolean);

      if (creatorIds.length > 0) {
        const { data: followerRows } = await supabase
          .from('artist_followers')
          .select('artist_id')
          .in('artist_id', creatorIds);

        const followerMap: Record<string, number> = {};
        (followerRows ?? []).forEach((r: any) => {
          followerMap[r.artist_id] = (followerMap[r.artist_id] ?? 0) + 1;
        });
        dedupedArtists.forEach(a => {
          a.followers = followerMap[a.id] ?? 0;
        });
      }

      setArtists(dedupedArtists);
      setLoading(false);
    });
  }, [q, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setShowSugg(false);
    }
  };

  const doSearch = (term: string) => {
    setQuery(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setShowSugg(false);
  };

  const setType = (t: ContentType) => setFilters(f => ({ ...f, type: t }));
  const setSort = (s: SortOption)   => setFilters(f => ({ ...f, sort: s }));

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">

        {/* Search input */}
        <form onSubmit={handleSearch} className="relative mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="Search music, books, podcasts, artists..."
              className="w-full bg-[#0D1635] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40 text-lg"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Recent searches dropdown */}
          {showSugg && !q && recent.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D1635] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <span className="text-white/40 text-xs uppercase tracking-widest">Recent Searches</span>
                <button type="button" onClick={() => { clearRecentSearches(); setRecent([]); }}
                  className="text-white/30 hover:text-white text-xs transition-colors">
                  Clear all
                </button>
              </div>
              {recent.map(s => (
                <button key={s} type="button" onClick={() => doSearch(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                  <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300 text-sm">{s}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Type pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
            {TYPE_FILTERS.map(f => (
              <button key={f.value} onClick={() => setType(f.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.type === f.value
                    ? 'bg-[#00D9FF] text-[#0B0814]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}>
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Sort dropdown */}
            <select
              value={filters.sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="bg-[#0D1635] border border-white/10 text-white text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/30 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {/* Advanced filters toggle */}
            <button
              onClick={() => setShowAdv(a => !a)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-all ${
                showAdv || filters.genre || filters.maxPrice > 0 || filters.verified
                  ? 'border-[#00D9FF]/40 text-[#00D9FF] bg-[#00D9FF]/10'
                  : 'border-white/10 text-white/40 hover:border-white/25'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {(filters.genre || filters.maxPrice > 0 || filters.verified) && (
                <span className="w-4 h-4 rounded-full bg-[#00D9FF] text-[#0B0814] text-[9px] font-black flex items-center justify-center">
                  {[!!filters.genre, filters.maxPrice > 0, filters.verified].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced filter panel */}
        {showAdv && (
          <div className="mb-6 p-4 rounded-2xl bg-white/3 border border-white/10 grid sm:grid-cols-3 gap-4">
            {/* Genre */}
            <div>
              <label className="block text-xs text-white/40 mb-2">Genre</label>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(g => (
                  <button key={g} onClick={() => setFilters(f => ({ ...f, genre: f.genre === g ? '' : g }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      filters.genre === g ? 'bg-[#9D4EDD] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <label className="block text-xs text-white/40 mb-2">
                Max Price: {filters.maxPrice === 0 ? 'Any' : `$${filters.maxPrice}`}
              </label>
              <input
                type="range" min={0} max={50} step={5}
                value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) }))}
                className="w-full accent-[#00D9FF]"
              />
              <div className="flex justify-between text-[10px] text-white/25 mt-1">
                <span>Free</span><span>$50</span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="block text-xs text-white/40 mb-2">Options</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.verified}
                  onChange={e => setFilters(f => ({ ...f, verified: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-[#00D9FF] rounded" />
                <span className="text-sm text-white/60">Verified artists only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.sort === 'free'}
                  onChange={e => setFilters(f => ({ ...f, sort: e.target.checked ? 'free' : 'relevance' }))}
                  className="w-3.5 h-3.5 accent-[#00D9FF] rounded" />
                <span className="text-sm text-white/60">Free only</span>
              </label>
              {(filters.genre || filters.maxPrice > 0 || filters.verified) && (
                <button
                  onClick={() => setFilters(f => ({ ...f, genre: '', maxPrice: 0, verified: false }))}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-red-400 transition-colors mt-1"
                >
                  <XIcon className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        {q && (
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">
              {loading ? 'Searching…' : `Results for "${q}"`}
            </h1>
            {!loading && (
              <p className="text-gray-500 text-sm mt-0.5">
                {results.length} {results.length === 1 ? 'result' : 'results'}
                {filters.type !== 'all' && ` · ${TYPE_FILTERS.find(t => t.value === filters.type)?.label}`}
              </p>
            )}
          </div>
        )}

        {/* Artist results strip */}
        {!loading && artists.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Artists & Creators
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {artists.map(a => (
                <Link key={a.id} to={`/artists/${a.slug || a.id}`}
                  className="flex flex-col items-center gap-2 shrink-0 group">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] border-2 border-white/10 group-hover:border-[#00D9FF]/50 transition-all">
                    {a.avatar
                      ? <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                          {a.name.charAt(0)}
                        </div>}
                  </div>
                  <span className="text-xs text-white/70 group-hover:text-white transition-colors text-center max-w-[60px] truncate">
                    {a.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {results.map(p => (
              <ProductCard
                key={p.id}
                product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price ?? p.price }}
                variant="square"
              />
            ))}
          </div>
        ) : q ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-white text-lg font-semibold mb-1">No results found</p>
            <p className="text-gray-500 text-sm mb-4">
              No {filters.type !== 'all' ? filters.type + 's' : 'content'} matching "{q}"
            </p>
            {filters.type !== 'all' && (
              <button onClick={() => setType('all')}
                className="inline-block px-5 py-2 bg-[#00D9FF]/10 border border-[#00D9FF]/20 text-[#00D9FF] rounded-xl text-sm hover:bg-[#00D9FF]/20 transition-colors">
                Search all content types
              </button>
            )}
          </div>
        ) : (
          /* Empty state — recent + trending */
          <div className="py-8">
            {recent.length > 0 && (
              <div className="mb-8">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Recent Searches</p>
                <div className="flex flex-wrap gap-2">
                  {recent.map(s => (
                    <button key={s} onClick={() => doSearch(s)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                      <span className="text-white/30">⏱</span> {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {trendingTerms.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#00D9FF]" /> Trending Now
              </p>
              <div className="flex flex-wrap gap-2">
                {trendingTerms.map((s, i) => (
                  <button key={s} onClick={() => doSearch(s)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00D9FF]/5 border border-[#00D9FF]/15 rounded-full text-sm text-[#00D9FF]/70 hover:text-[#00D9FF] hover:bg-[#00D9FF]/10 transition-colors">
                    <span className="text-white/20 text-xs font-bold">#{i + 1}</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
