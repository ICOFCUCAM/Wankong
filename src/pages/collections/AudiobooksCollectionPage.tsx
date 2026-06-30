import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';
import Seo from '@/components/Seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Headphones, Play, Clock, Star } from 'lucide-react';

interface Audiobook {
  id: string;
  title: string;
  cover_url: string | null;
  price: number;
  genre: string | null;
  language: string | null;
  status: string;
  created_at: string;
  duration_minutes?: number | null;
  narrator?: string | null;
  authors?: { name: string } | null;
}

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Romance', 'Thriller', 'Sci-Fi & Fantasy', 'Biography', 'Business', 'Self-Help', 'Children', 'Poetry', 'Religion & Spirituality'];
type PriceFilter = 'all' | 'free' | 'paid';
const PAGE_SIZE = 24;

function AudiobookCard({ ab, onClick }: { ab: Audiobook; onClick: () => void }) {
  const hrs = ab.duration_minutes ? `${Math.floor(ab.duration_minutes / 60)}h ${ab.duration_minutes % 60}m` : null;
  return (
    <div
      onClick={onClick}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group flex flex-col cursor-pointer"
    >
      {/* Cover */}
      <div className="aspect-square relative overflow-hidden bg-white/5">
        {ab.cover_url ? (
          <img
            src={ab.cover_url}
            alt={ab.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex items-center justify-center">
            <Headphones className="w-10 h-10 text-white/20" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-[#9D4EDD] flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* Price badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ab.price === 0 ? 'bg-[#00F5A0] text-[#0B0814]' : 'bg-[#FFB800] text-[#0B0814]'}`}>
            {ab.price === 0 ? 'FREE' : `$${ab.price.toFixed(2)}`}
          </span>
        </div>
        {/* Headphones badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#9D4EDD]/80 text-white font-bold flex items-center gap-1">
            <Headphones className="w-2.5 h-2.5" /> AUDIO
          </span>
        </div>
        {/* Duration */}
        {hrs && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white">
            <Clock className="w-2.5 h-2.5" /> {hrs}
          </div>
        )}
      </div>
      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <p className="font-semibold text-white text-sm line-clamp-2 flex-1">{ab.title}</p>
        <p className="text-gray-400 text-xs mt-1 truncate">{ab.authors?.name ?? 'Unknown Author'}</p>
        {ab.narrator && <p className="text-gray-600 text-[10px] mt-0.5">Narrated by {ab.narrator}</p>}
        <button
          className="mt-3 w-full py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white hover:opacity-90 transition-opacity"
        >
          {ab.price === 0 ? 'Listen Free' : 'Buy & Listen'}
        </button>
      </div>
    </div>
  );
}

export default function AudiobooksCollectionPage() {
  const navigate = useNavigate();

  const [books, setBooks] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const LANGUAGE_OPTIONS = ['All', 'English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Swahili', 'Portuguese'];

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchBooks = async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) { setLoading(true); setPage(0); } else { setLoadingMore(true); }

    let query = supabase
      .from('ecom_products')
      .select('id, title, cover_url, price, genre, language, status, created_at, narrator, duration_minutes, authors(name)')
      .eq('product_type', 'Audiobook')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (selectedGenre !== 'All')    query = query.eq('genre', selectedGenre);
    if (selectedLanguage !== 'All') query = query.ilike('language', `%${selectedLanguage}%`);
    if (priceFilter === 'free') query = query.eq('price', 0);
    if (priceFilter === 'paid') query = query.gt('price', 0);
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);

    const { data } = await query;
    {
      const rows = asArray<Audiobook>(data);
      if (reset) setBooks(rows);
      else setBooks(prev => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      if (!reset) setPage(p => p + 1);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { fetchBooks(true); }, [selectedGenre, selectedLanguage, priceFilter, search]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const PRICE_OPTIONS: { id: PriceFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'free', label: 'Free' }, { id: 'paid', label: 'Paid' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Seo title="Audiobooks" description="Listen to audiobooks narrated by creators and authors around the world." />
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#100D2E] to-[#0B0814] border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#9D4EDD] text-sm font-medium uppercase tracking-widest">Audiobooks</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Listen to <span className="bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] bg-clip-text text-transparent">Audiobooks</span>
          </h1>
          <p className="text-white/55 text-lg max-w-xl">Stories, non-fiction and bestsellers from creators worldwide — narrated and ready to play.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search audiobooks, authors, narrators..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
            {PRICE_OPTIONS.map(p => (
              <button
                key={p.id}
                onClick={() => setPriceFilter(p.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  priceFilter === p.id ? 'bg-[#9D4EDD] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Language chips */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {LANGUAGE_OPTIONS.map(l => (
            <button
              key={l}
              onClick={() => setSelectedLanguage(l)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedLanguage === l
                  ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                  <div className="h-7 bg-white/10 rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <Headphones className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No audiobooks found.</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">{books.length} audiobooks</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {books.map(ab => (
                <AudiobookCard key={ab.id} ab={ab} onClick={() => navigate(`/products/${ab.id}`)} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={() => fetchBooks(false)}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading…
                    </span>
                  ) : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
