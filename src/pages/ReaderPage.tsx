import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import {
  ChevronLeft,
  BookOpen,
  Sun,
  Moon,
  Minus,
  Plus,
  Bookmark,
  BookMarked,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Book {
  id: string;
  title: string;
  body_html: string | null;
  description: string | null;
  vendor: string;
  cover_image_url: string | null;
  audio_url: string | null;
  product_type: string;
}

interface BookmarkItem {
  id: string;
  position: number;
  note: string;
  created_at: string;
}

// ── Theme config ───────────────────────────────────────────────────────────────

type Theme = 'dark' | 'light' | 'sepia';

const THEME_CLASSES: Record<Theme, string> = {
  dark:  'bg-[#0B0814] text-gray-100',
  light: 'bg-white text-gray-900',
  sepia: 'bg-[#F4E8D0] text-[#3D2B1F]',
};

const THEME_TOPBAR: Record<Theme, string> = {
  dark:  'bg-[#0B0814]/95 border-white/10 text-gray-100',
  light: 'bg-white/95 border-gray-200 text-gray-900',
  sepia: 'bg-[#F4E8D0]/95 border-[#C9A87C]/30 text-[#3D2B1F]',
};

const THEME_BTN: Record<Theme, string> = {
  dark:  'bg-white/10 hover:bg-white/20 text-gray-200',
  light: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  sepia: 'bg-[#C9A87C]/30 hover:bg-[#C9A87C]/50 text-[#3D2B1F]',
};

const THEME_SIDEBAR: Record<Theme, string> = {
  dark:  'bg-[#12121A] border-white/10 text-gray-100',
  light: 'bg-gray-50 border-gray-200 text-gray-900',
  sepia: 'bg-[#EDD9B0] border-[#C9A87C]/40 text-[#3D2B1F]',
};

// ── Storage helpers ────────────────────────────────────────────────────────────

function progressStorageKey(id: string) {
  return `wk_reader_progress_${id}`;
}
function bookmarkStorageKey(id: string) {
  return `wk_reader_bookmarks_${id}`;
}

function loadProgress(id: string): number {
  try { return Number(localStorage.getItem(progressStorageKey(id)) ?? 0); } catch { return 0; }
}
function saveProgressToStorage(id: string, pct: number) {
  try { localStorage.setItem(progressStorageKey(id), String(pct)); } catch {}
}
function loadBookmarks(id: string): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(bookmarkStorageKey(id));
    return raw ? (JSON.parse(raw) as BookmarkItem[]) : [];
  } catch { return []; }
}
function saveBookmarks(id: string, items: BookmarkItem[]) {
  try { localStorage.setItem(bookmarkStorageKey(id), JSON.stringify(items)); } catch {}
}

// ── ReaderPage ─────────────────────────────────────────────────────────────────

export default function ReaderPage() {
  const { productId }     = useParams<{ productId: string }>();
  const { user }          = useAuth();

  const [book,           setBook]           = useState<Book | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [accessDenied,   setAccessDenied]   = useState(false);
  const [theme,          setTheme]          = useState<Theme>('dark');
  const [fontSize,       setFontSize]       = useState(18);
  const [progress,       setProgress]       = useState(0);
  const [bookmarks,      setBookmarks]      = useState<BookmarkItem[]>([]);
  const [showBookmarks,  setShowBookmarks]  = useState(false);

  const contentRef   = useRef<HTMLDivElement>(null);
  const scrollerRef  = useRef<HTMLDivElement>(null);
  const throttleRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch book ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!productId) return;

    async function fetchBook() {
      setLoading(true);
      const { data } = await supabase
        .from('ecom_products')
        .select('id, title, body_html, description, vendor, cover_image_url, audio_url, product_type, price')
        .eq('id', productId)
        .single();

      if (!data) { setLoading(false); return; }

      const isFree = !data.price || data.price === 0;

      // Verify access: free products are open; paid products require user_library entry
      if (!isFree) {
        if (!user) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        const { data: lib } = await supabase
          .from('user_library')
          .select('id, expires_at')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle();

        const hasAccess = !!lib && (!lib.expires_at || new Date(lib.expires_at) > new Date());
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      setBook(data as Book);
      setLoading(false);
    }

    fetchBook();
  }, [productId, user]);

  // ── Restore progress & bookmarks once book is loaded ──────────────────────────

  useEffect(() => {
    if (!book || !scrollerRef.current) return;

    const saved = loadProgress(book.id);
    setProgress(saved);
    setBookmarks(loadBookmarks(book.id));

    // Restore scroll position after content renders
    const scroller = scrollerRef.current;
    requestAnimationFrame(() => {
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (maxScroll > 0) scroller.scrollTop = (saved / 100) * maxScroll;
    });
  }, [book]);

  // ── Scroll → progress (throttled) ────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    if (throttleRef.current) return;
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
      const scroller = scrollerRef.current;
      if (!scroller || !book) return;
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (maxScroll <= 0) return;
      const pct = Math.round((scroller.scrollTop / maxScroll) * 100);
      setProgress(pct);
      saveProgressToStorage(book.id, pct);
    }, 200);
  }, [book]);

  // ── Add bookmark ──────────────────────────────────────────────────────────────

  const handleAddBookmark = useCallback(() => {
    if (!book) return;
    const scroller = scrollerRef.current;
    const maxScroll = scroller ? scroller.scrollHeight - scroller.clientHeight : 0;
    const position = maxScroll > 0 && scroller
      ? Math.round((scroller.scrollTop / maxScroll) * 100)
      : 0;

    const newItem: BookmarkItem = {
      id:         crypto.randomUUID(),
      position,
      note:       `Page ${position}%`,
      created_at: new Date().toISOString(),
    };
    const updated = [...bookmarks, newItem].sort((a, b) => a.position - b.position);
    setBookmarks(updated);
    saveBookmarks(book.id, updated);
  }, [book, bookmarks]);

  // ── Delete bookmark ───────────────────────────────────────────────────────────

  const handleDeleteBookmark = useCallback((id: string) => {
    if (!book) return;
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    saveBookmarks(book.id, updated);
  }, [book, bookmarks]);

  // ── Jump to bookmark ──────────────────────────────────────────────────────────

  const handleJumpToBookmark = useCallback((position: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    scroller.scrollTo({ top: (position / 100) * maxScroll, behavior: 'smooth' });
    setShowBookmarks(false);
  }, []);

  // ── Font size clamp ───────────────────────────────────────────────────────────

  const decreaseFontSize = () => setFontSize(s => Math.max(16, s - 2));
  const increaseFontSize = () => setFontSize(s => Math.min(24, s + 2));

  // ── Theme cycle (dark → light → sepia → dark) ─────────────────────────────────

  const cycleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : t === 'light' ? 'sepia' : 'dark');
  };

  // ── Loading / not found ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#9D4EDD]/20 flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-8 h-8 text-[#9D4EDD]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Required</h2>
          <p className="text-gray-400 text-sm mb-6">
            {user
              ? 'You need to purchase this book to read it.'
              : 'Please sign in or purchase this book to access the reader.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/products/${productId}`}
              className="px-6 py-3 bg-[#9D4EDD] hover:bg-[#8B3FCC] text-white font-semibold rounded-xl transition-colors"
            >
              View Product
            </Link>
            {!user && (
              <Link
                to="/auth/login"
                className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-4">Book not found</p>
          <Link to="/" className="text-[#00D9FF] hover:underline">← Go back home</Link>
        </div>
      </div>
    );
  }

  const btnClass    = `p-2 rounded-lg transition-colors ${THEME_BTN[theme]}`;
  const topbarClass = `fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-sm ${THEME_TOPBAR[theme]}`;

  return (
    <div className={`min-h-screen ${THEME_CLASSES[theme]} transition-colors duration-300`}>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className={topbarClass}>
        {/* Reading progress bar */}
        <div className="h-0.5 bg-black/10">
          <div
            className="h-full bg-[#00D9FF] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-2 max-w-5xl mx-auto">
          {/* Back */}
          <Link
            to={`/products/${book.id}`}
            className={`${btnClass} flex items-center gap-1 text-sm font-medium flex-shrink-0`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          {/* Title */}
          <p className="flex-1 text-sm font-semibold truncate text-center px-2">
            {book.title}
          </p>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Theme toggle */}
            <button
              onClick={cycleTheme}
              className={btnClass}
              title="Toggle theme"
            >
              {theme === 'dark'  ? <Moon className="w-4 h-4" /> :
               theme === 'light' ? <Sun  className="w-4 h-4" /> :
               <span className="text-xs font-bold px-0.5">Aa</span>}
            </button>

            {/* Font size */}
            <button onClick={decreaseFontSize} className={btnClass} title="Smaller text" disabled={fontSize <= 16}>
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-8 text-center select-none">{fontSize}px</span>
            <button onClick={increaseFontSize} className={btnClass} title="Larger text" disabled={fontSize >= 24}>
              <Plus className="w-4 h-4" />
            </button>

            {/* Bookmarks toggle */}
            <button
              onClick={() => setShowBookmarks(s => !s)}
              className={`${btnClass} ${showBookmarks ? 'ring-1 ring-[#00D9FF]' : ''}`}
              title="Bookmarks"
            >
              {bookmarks.length > 0
                ? <BookMarked className="w-4 h-4 text-[#00D9FF]" />
                : <Bookmark   className="w-4 h-4" />}
            </button>

            {/* Add bookmark */}
            <button
              onClick={handleAddBookmark}
              className={`${btnClass} text-xs font-medium`}
              title="Add bookmark at current position"
            >
              + Mark
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable content area ───────────────────────────────────────────── */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-auto pt-16 pb-12"
      >
        <div className="max-w-2xl mx-auto px-6 py-10">

          {/* Book header */}
          <div className="mb-10 text-center">
            {book.cover_image_url && (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-32 h-48 object-cover rounded-lg shadow-xl mx-auto mb-6"
              />
            )}
            <h1 className="text-2xl font-bold mb-1">{book.title}</h1>
            {book.vendor && (
              <p className="text-sm opacity-60">by {book.vendor}</p>
            )}
            {/* Progress indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs opacity-50">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{progress}% read</span>
            </div>
          </div>

          {/* Book content */}
          <div
            ref={contentRef}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            className="prose-custom"
          >
            {book.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(book.body_html) }}
                className="[&_p]:mb-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8
                           [&_h2]:text-xl  [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6
                           [&_h3]:text-lg  [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5
                           [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                           [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
                           [&_li]:mb-1
                           [&_blockquote]:border-l-4 [&_blockquote]:border-current/30
                           [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-75
                           [&_a]:text-[#00D9FF] [&_a]:underline"
              />
            ) : book.description ? (
              book.description.split('\n').map((para, i) =>
                para.trim()
                  ? <p key={i} className="mb-5">{para}</p>
                  : <div key={i} className="h-4" />
              )
            ) : (
              <p className="opacity-50 text-center mt-16">No content available for this book.</p>
            )}
          </div>

          {/* End of book */}
          {(book.body_html || book.description) && (
            <div className="mt-16 pt-8 border-t border-current/10 text-center opacity-40 text-sm">
              ─ End of Book ─
            </div>
          )}
        </div>
      </div>

      {/* ── Bookmarks sidebar ─────────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-72 flex flex-col shadow-2xl transition-transform duration-300 ${
          showBookmarks ? 'translate-x-0' : 'translate-x-full'
        } ${THEME_SIDEBAR[theme]} border-l`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-current/10 flex-shrink-0 pt-16">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-[#00D9FF]" />
            <span className="font-semibold text-sm">Bookmarks</span>
            {bookmarks.length > 0 && (
              <span className="text-xs bg-[#00D9FF]/20 text-[#00D9FF] rounded-full px-2 py-0.5">
                {bookmarks.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowBookmarks(false)}
            className={`p-1.5 rounded-lg transition-colors ${THEME_BTN[theme]}`}
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Add bookmark shortcut */}
        <div className="px-4 py-2 flex-shrink-0">
          <button
            onClick={handleAddBookmark}
            className="w-full py-2 text-xs rounded-lg bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20
                       text-[#00D9FF] border border-[#00D9FF]/20 transition-colors"
          >
            + Bookmark current position ({progress}%)
          </button>
        </div>

        {/* Bookmark list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {bookmarks.length === 0 ? (
            <div className="text-center opacity-40 text-sm mt-8 px-4">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No bookmarks yet.</p>
              <p className="text-xs mt-1">Click "+ Mark" in the toolbar to add one.</p>
            </div>
          ) : (
            bookmarks.map(bm => (
              <div
                key={bm.id}
                className="group flex items-center gap-2 rounded-lg p-2.5 transition-colors
                           hover:bg-[#00D9FF]/5 border border-transparent hover:border-[#00D9FF]/15"
              >
                <button
                  onClick={() => handleJumpToBookmark(bm.position)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] flex-shrink-0" />
                    <span className="text-xs font-semibold">{bm.note}</span>
                  </div>
                  <p className="text-xs opacity-50 mt-0.5 pl-3.5">
                    {new Date(bm.created_at).toLocaleDateString()}
                  </p>
                </button>
                {/* Progress pill */}
                <span className="text-xs opacity-50 bg-current/10 px-2 py-0.5 rounded-full flex-shrink-0">
                  {bm.position}%
                </span>
                {/* Delete */}
                <button
                  onClick={() => handleDeleteBookmark(bm.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300
                             transition-opacity p-1 rounded"
                  title="Remove bookmark"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Backdrop when bookmarks panel is open on mobile */}
      {showBookmarks && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setShowBookmarks(false)}
        />
      )}
    </div>
  );
}
