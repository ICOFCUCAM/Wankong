import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Search, BookOpen, Star, ShoppingCart, Upload, ChevronDown, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  price: number;   // 0 = free
  rating: number;
  reviews: number;
  pages: number;
  language: string;
  cover: string;   // gradient CSS or image URL
  coverEmoji: string;
  isNew: boolean;
  isBestseller: boolean;
  description: string;
}

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Technology', 'Business', 'Self-Help', 'Science', 'Romance', 'History', 'Cooking', 'Biography', 'Sci-Fi', 'Writing'];
const SORTS  = ['Best Sellers', 'Newest', 'Top Rated', 'Price: Low → High', 'Price: High → Low', 'Free First'];
const LANGS  = ['All Languages', 'English', 'French', 'Swahili', 'Yoruba', 'Igbo', 'Arabic', 'Portuguese'];

// ── Star Rating ───────────────────────────────────────────────────────────────
function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
          <Star key={s} className={`w-3 h-3 ${s <= rating ? 'fill-[#FFB800] text-[#FFB800]' : 'text-white/15'}`} />
        ))}
      </div>
      <span className="text-[10px] text-white/40">({count >= 1000 ? `${(count/1000).toFixed(1)}k` : count})</span>
    </div>
  );
}

// ── Book Card ─────────────────────────────────────────────────────────────────
function BookCard({ book }: { book: Book }) {
  const isFree = book.price === 0;
  return (
    <div className="group bg-[#0D1635] border border-white/8 rounded-2xl overflow-hidden hover:border-[#FFB800]/30 hover:shadow-lg hover:shadow-[#FFB800]/5 transition-all duration-300">
      {/* Cover */}
      <div className="relative" style={{ aspectRatio: '3/4' }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${book.cover}`} />
        {/* Spine */}
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white/10" />
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-4xl mb-3 drop-shadow-xl">{book.coverEmoji}</span>
          <p className="text-white font-bold text-xs leading-tight px-1 drop-shadow">{book.title}</p>
          <p className="text-white/50 text-[10px] mt-1">{book.author}</p>
        </div>
        {/* Badges */}
        {book.isNew && (
          <div className="absolute top-2 left-2 bg-[#00F5A0] text-[#0B0814] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">NEW</div>
        )}
        {book.isBestseller && !book.isNew && (
          <div className="absolute top-2 left-2 bg-[#FFB800] text-[#0B0814] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">BEST</div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link to={`/products/${book.id}`}
            className="px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs rounded-lg hover:bg-white/20 transition-colors">
            Preview
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white text-xs font-bold leading-tight mb-0.5 line-clamp-1">{book.title}</h3>
        <p className="text-white/40 text-[10px] mb-2 truncate">{book.author}</p>
        <div className="mb-2.5"><Stars rating={book.rating} count={book.reviews} /></div>
        <div className="flex items-center justify-between">
          <div>
            {isFree
              ? <span className="text-[#00F5A0] font-black text-sm">Free</span>
              : <span className="text-white font-black text-sm">${book.price.toFixed(2)}</span>}
          </div>
          <button className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isFree ? 'bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/20 hover:bg-[#00F5A0]/20' : 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20 hover:bg-[#FFB800]/20'}`}>
            <ShoppingCart className="w-2.5 h-2.5" />
            {isFree ? 'Get' : 'Buy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EbookMarketplacePage() {
  const navigate = useNavigate();
  const [books, setBooks]         = useState<Book[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [genre, setGenre]         = useState('All');
  const [sort, setSort]           = useState('Best Sellers');
  const [lang, setLang]           = useState('All Languages');
  const [showSortDrop, setShowSortDrop] = useState(false);
  const [showLangDrop, setShowLangDrop] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('ecom_products')
          .select('*')
          .eq('product_type', 'Book')
          .eq('status', 'active')
          .limit(24);
        if (data) {
          setBooks(data.map((p: any) => ({
            id: p.id,
            title: p.title,
            author: p.vendor || p.author || 'Unknown',
            genre: p.genre || 'Fiction',
            price: p.price ? p.price / 100 : 0,
            rating: 4,
            reviews: 0,
            pages: p.pages || 250,
            language: p.language || 'English',
            cover: 'from-[#1a1a2e] to-[#16213e]',
            coverEmoji: '📖',
            isNew: new Date(p.created_at) > new Date(Date.now() - 7*86400000),
            isBestseller: false,
            description: p.body_html || '',
          })));
        }
      } catch (err) { console.error('Failed to load books:', err); }
      finally  { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    let b = [...books];
    if (search)           b = b.filter(x => x.title.toLowerCase().includes(search.toLowerCase()) || x.author.toLowerCase().includes(search.toLowerCase()));
    if (genre !== 'All')  b = b.filter(x => x.genre === genre);
    if (lang !== 'All Languages') b = b.filter(x => x.language === lang);
    switch (sort) {
      case 'Newest':               b.sort((a,z) => (z.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case 'Top Rated':            b.sort((a,z) => z.rating - a.rating); break;
      case 'Price: Low → High':    b.sort((a,z) => a.price - z.price); break;
      case 'Price: High → Low':    b.sort((a,z) => z.price - a.price); break;
      case 'Free First':           b.sort((a,z) => a.price - z.price); break;
      default:                     b.sort((a,z) => (z.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));
    }
    return b;
  }, [books, search, genre, sort, lang]);

  return (
    <div className="min-h-screen bg-[#0B0814] pb-20">
      <Header />

      {/* ── Page Header ── */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#0D1635] to-[#0B0814] border-b border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-[#FFB800]" />
                <h1 className="text-2xl font-black text-white">eBook Marketplace</h1>
              </div>
              <p className="text-white/40 text-sm">Discover and publish amazing books</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/collections/books" className="px-4 py-2 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors">
                Browse Books
              </Link>
              <Link to="/book-upload" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold text-sm rounded-xl hover:opacity-90 transition-opacity">
                <Upload className="w-4 h-4" /> Publish Book
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-5 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search books or authors…"
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#FFB800]/40"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* ── Filters row ── */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          {/* Genre pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenre(g)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${genre === g ? 'bg-[#FFB800] text-[#0B0814] font-bold' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20'}`}>
                {g}
              </button>
            ))}
          </div>

          {/* Sort + Language dropdowns */}
          <div className="flex gap-2 shrink-0">
            {/* Language */}
            <div className="relative">
              <button onClick={() => { setShowLangDrop(l => !l); setShowSortDrop(false); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/60 hover:text-white transition-colors">
                {lang} <ChevronDown className="w-3 h-3" />
              </button>
              {showLangDrop && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[#0D1635] border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl">
                  {LANGS.map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLangDrop(false); }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors ${lang === l ? 'text-[#FFB800] bg-[#FFB800]/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <button onClick={() => { setShowSortDrop(s => !s); setShowLangDrop(false); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/60 hover:text-white transition-colors">
                {sort} <ChevronDown className="w-3 h-3" />
              </button>
              {showSortDrop && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#0D1635] border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl">
                  {SORTS.map(s => (
                    <button key={s} onClick={() => { setSort(s); setShowSortDrop(false); }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors ${sort === s ? 'text-[#FFB800] bg-[#FFB800]/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-white/30 text-xs mb-5">
          Showing {filtered.length} book{filtered.length !== 1 ? 's' : ''}
          {genre !== 'All' ? ` in ${genre}` : ''}
          {search ? ` for "${search}"` : ''}
        </p>

        {/* ── Book Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">No books found{search ? ` for "${search}"` : ''}.</p>
            <button onClick={() => { setSearch(''); setGenre('All'); }} className="mt-3 text-[#FFB800] text-sm hover:underline">Clear filters</button>
          </div>
        )}

        {/* Publish CTA banner */}
        <div className="mt-14 bg-gradient-to-br from-[#FFB800]/10 to-[#FF6B00]/10 border border-[#FFB800]/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-xl font-black text-white mb-1">Are you an author?</h3>
            <p className="text-white/50 text-sm">Publish your eBook and earn 70% royalties on every sale.</p>
          </div>
          <Link to="/book-upload"
            className="shrink-0 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold rounded-xl hover:opacity-90 transition-opacity">
            <Upload className="w-4 h-4" /> Publish Your Book
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
