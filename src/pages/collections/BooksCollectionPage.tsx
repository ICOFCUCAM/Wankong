import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';
import Seo from '@/components/Seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SUPPORTED_LANGUAGES } from '@/pipelines/translation/LanguageMapping';

// ── Types ────────────────────────────────────────────────────────────────────

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
  price: number;
  product_type: string;
  genre: string | null;
  language: string | null;
  status: string;
  created_at: string;
  authors?: { name: string } | null;
  // Format flags
  has_ebook?: boolean | null;
  has_audiobook?: boolean | null;
  has_softcover?: boolean | null;
  has_hardcover?: boolean | null;
  // Per-format prices
  ebook_price?: number | null;
  audiobook_price?: number | null;
  softcover_price?: number | null;
  hardcover_price?: number | null;
  // Amazon URLs
  amazon_softcover_url?: string | null;
  amazon_hardcover_url?: string | null;
  // Multi-source fields
  softcover_source?: 'wankong' | 'amazon' | 'external' | null;
  hardcover_source?: 'wankong' | 'amazon' | 'external' | null;
  softcover_external_url?: string | null;
  hardcover_external_url?: string | null;
  softcover_visible?: boolean | null;
  hardcover_visible?: boolean | null;
}

const BOOK_GENRES = ['All', 'Fiction', 'Non-Fiction', 'Romance', 'Thriller', 'Sci-Fi & Fantasy', 'Biography', 'Business', 'Self-Help', 'Children', 'Poetry', 'History', 'Religion & Spirituality'];
type PriceFilter  = 'all' | 'free' | 'paid';
type FormatFilter = 'all' | 'ebook' | 'audiobook' | 'softcover' | 'hardcover';

const FORMAT_FILTER_OPTIONS: { id: FormatFilter; label: string }[] = [
  { id: 'all',       label: 'All Formats' },
  { id: 'ebook',     label: 'eBook' },
  { id: 'audiobook', label: 'Audiobook' },
  { id: 'softcover', label: 'Softcover' },
  { id: 'hardcover', label: 'Hardcover' },
];

const PAGE_SIZE = 24;

// ── Format Badges ─────────────────────────────────────────────────────────────

const FORMAT_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ebook:     { bg: 'bg-[#00D9FF]/15',  text: 'text-[#00D9FF]',  label: 'eBOOK'     },
  audiobook: { bg: 'bg-[#9D4EDD]/15',  text: 'text-[#9D4EDD]',  label: 'AUDIO'     },
  softcover: { bg: 'bg-[#00F5A0]/15',  text: 'text-[#00F5A0]',  label: 'SOFTCOVER' },
  hardcover: { bg: 'bg-[#FFB800]/15',  text: 'text-[#FFB800]',  label: 'HARDCOVER' },
};

function FormatBadge({ format }: { format: keyof typeof FORMAT_BADGE_STYLES }) {
  const s = FORMAT_BADGE_STYLES[format];
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${s.bg} ${s.text}`}>{s.label}</span>
  );
}

// ── Source label (admin-visible) ──────────────────────────────────────────────

function sourceLabel(src: string | null | undefined) {
  if (src === 'amazon')   return 'AMZ';
  if (src === 'external') return 'EXT';
  return 'WKG';
}

// ── Book Card ─────────────────────────────────────────────────────────────────

function BookCard({ book, onAction }: { book: Book; onAction: (book: Book, action: string, url?: string) => void }) {
  const formats: { key: string; label: string; price?: number | null; visible?: boolean | null; source?: string | null; url?: string | null }[] = [];

  if (book.has_ebook)     formats.push({ key: 'ebook',     label: 'Read Now',       price: book.ebook_price });
  if (book.has_audiobook) formats.push({ key: 'audiobook', label: 'Listen Now',     price: book.audiobook_price });
  if (book.has_softcover && book.softcover_visible !== false) {
    formats.push({ key: 'softcover', label: 'Buy Softcover', price: book.softcover_price, visible: book.softcover_visible, source: book.softcover_source, url: book.softcover_source === 'amazon' ? book.amazon_softcover_url : book.softcover_source === 'external' ? book.softcover_external_url : null });
  }
  if (book.has_hardcover && book.hardcover_visible !== false) {
    formats.push({ key: 'hardcover', label: 'Buy Hardcover', price: book.hardcover_price, visible: book.hardcover_visible, source: book.hardcover_source, url: book.hardcover_source === 'amazon' ? book.amazon_hardcover_url : book.hardcover_source === 'external' ? book.hardcover_external_url : null });
  }

  // Fallback: if no format flags set, show generic Buy/Download
  const hasFormatData = book.has_ebook || book.has_audiobook || book.has_softcover || book.has_hardcover;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group flex flex-col">
      <div className="aspect-[3/4] relative overflow-hidden bg-white/5">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${book.price === 0 ? 'bg-[#00F5A0] text-[#0B0814]' : 'bg-[#FFB800] text-[#0B0814]'}`}>
            {book.price === 0 ? 'FREE' : `$${book.price.toFixed(2)}`}
          </span>
        </div>

        {/* Genre badge */}
        {book.genre && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white border border-white/10 font-medium">
              {book.genre}
            </span>
          </div>
        )}

        {/* Format badges strip */}
        {hasFormatData && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {book.has_ebook     && <FormatBadge format="ebook" />}
            {book.has_audiobook && <FormatBadge format="audiobook" />}
            {book.has_softcover && <FormatBadge format="softcover" />}
            {book.has_hardcover && <FormatBadge format="hardcover" />}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="font-semibold text-white text-sm line-clamp-2 flex-1">{book.title}</p>
        <p className="text-gray-400 text-xs mt-1 truncate">{book.authors?.name ?? 'Unknown Author'}</p>

        {/* Per-format buttons */}
        {hasFormatData ? (
          <div className="mt-3 space-y-1.5">
            {formats.map(f => {
              // Hide if source is set but URL is missing (external/amazon but no URL)
              const needsUrl = f.source === 'amazon' || f.source === 'external';
              if (needsUrl && !f.url) return null;

              const handleClick = () => {
                if (f.url) {
                  window.open(f.url, '_blank', 'noopener,noreferrer');
                } else {
                  onAction(book, f.key);
                }
              };

              return (
                <button
                  key={f.key}
                  onClick={handleClick}
                  className={`w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-between px-2.5
                    ${f.key === 'ebook' ? 'bg-[#00D9FF]/15 text-[#00D9FF] hover:bg-[#00D9FF]/25' :
                      f.key === 'audiobook' ? 'bg-[#9D4EDD]/15 text-[#9D4EDD] hover:bg-[#9D4EDD]/25' :
                      f.key === 'softcover' ? 'bg-[#00F5A0]/15 text-[#00F5A0] hover:bg-[#00F5A0]/25' :
                      'bg-[#FFB800]/15 text-[#FFB800] hover:bg-[#FFB800]/25'}`}
                >
                  <span>{f.label}</span>
                  <span className="opacity-70">
                    {f.price != null ? (f.price === 0 ? 'Free' : `$${f.price.toFixed(2)}`) : ''}
                    {f.url && <span className="ml-1 text-[9px]">↗</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            onClick={() => onAction(book, 'default')}
            className="mt-3 w-full py-2 rounded-xl text-xs font-medium transition-all bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white hover:opacity-90"
          >
            {book.price === 0 ? 'Download Free' : 'Buy Now'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BooksCollectionPage() {
  const navigate = useNavigate();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchBooks = async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) { setLoading(true); setPage(0); } else { setLoadingMore(true); }

    let query = supabase
      .from('ecom_products')
      .select('id, title, cover_url, price, product_type, genre, language, status, created_at, authors(name), has_ebook, has_audiobook, has_softcover, has_hardcover, ebook_price, audiobook_price, softcover_price, hardcover_price, amazon_softcover_url, amazon_hardcover_url, softcover_source, hardcover_source, softcover_external_url, hardcover_external_url, softcover_visible, hardcover_visible')
      .eq('product_type', 'Book')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (selectedGenre !== 'All') query = query.eq('genre', selectedGenre);
    if (selectedLanguage !== 'all') query = query.eq('language', selectedLanguage);
    if (priceFilter === 'free') query = query.eq('price', 0);
    if (priceFilter === 'paid') query = query.gt('price', 0);
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);
    if (formatFilter === 'ebook')     query = query.eq('has_ebook', true);
    if (formatFilter === 'audiobook') query = query.eq('has_audiobook', true);
    if (formatFilter === 'softcover') query = query.eq('has_softcover', true);
    if (formatFilter === 'hardcover') query = query.eq('has_hardcover', true);

    const { data, error } = await query;
    if (!error) {
      const rows = asArray<Book>(data);
      if (reset) setBooks(rows);
      else setBooks(prev => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      if (!reset) setPage(p => p + 1);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchBooks(true);
  }, [selectedGenre, selectedLanguage, priceFilter, formatFilter, search]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const handleAction = (book: Book, action: string) => {
    if (action === 'softcover') navigate(`/checkout/softcover/${book.id}`);
    else if (action === 'hardcover') navigate(`/checkout/hardcover/${book.id}`);
    else navigate(`/products/${book.id}`);
  };

  const PRICE_OPTIONS: { id: PriceFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'free', label: 'Free' },
    { id: 'paid', label: 'Paid' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Seo title="Books" description="Discover ebooks, audiobooks, softcover and hardcover titles from independent authors worldwide." />
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#100D2E] to-[#0B0814] border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#FFB800] flex items-center justify-center text-xl">📚</div>
            <span className="text-[#9D4EDD] text-sm font-medium uppercase tracking-widest">Books</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Explore <span className="bg-gradient-to-r from-[#9D4EDD] to-[#FFB800] bg-clip-text text-transparent">Books</span>
          </h1>
          <p className="text-white/55 text-lg max-w-xl">Discover fiction, non-fiction, poetry and more from independent authors worldwide — available in eBook, audiobook, softcover and hardcover.</p>
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
            placeholder="Search books, authors..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Price filter */}
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

          {/* Language select */}
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#9D4EDD]/40"
          >
            <option value="all">All Languages</option>
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
            ))}
          </select>
        </div>

        {/* Format filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {FORMAT_FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setFormatFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                ${formatFilter === f.id
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#FFB800] text-white'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {BOOK_GENRES.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#FFB800] text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-white/5" />
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
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-400 text-lg">No books found.</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">{books.length} books</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {books.map(book => (
                <BookCard key={book.id} book={book} onAction={handleAction} />
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
