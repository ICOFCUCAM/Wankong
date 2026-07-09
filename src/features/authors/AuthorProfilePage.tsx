import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Globe, Download, DollarSign, BookOpen, Headphones, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAudiobookByBookId } from '@/features/audiobooks/AudiobookService';
import type { Audiobook } from '@/features/audiobooks/AudiobookService';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthorProfile {
  id: string;
  slug: string;
  display_name: string;
  bio?: string;
  website?: string;
  photo_url?: string;
  total_downloads: number;
  total_earnings: number;
}

interface Book {
  id: string;
  handle: string;
  title: string;
  price: number;
  cover_url?: string;
  language?: string;
  genre?: string;
  description?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function AuthorProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [audiobooksMap, setAudiobooksMap] = useState<Record<string, Audiobook | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch author by slug
        const { data: authorData, error: authorErr } = await supabase
          .from('author_profiles')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (authorErr) throw authorErr;
        if (!authorData) {
          setError('Author not found.');
          setLoading(false);
          return;
        }

        setAuthor(authorData as AuthorProfile);

        // Fetch published books
        const { data: booksData } = await supabase
          .from('ecom_products')
          .select('id, handle, title, price, cover_url, language, genre, description')
          .eq('author_id', authorData.id)
          .eq('product_type', 'Book')
          .order('created_at', { ascending: false });

        const fetchedBooks = (booksData ?? []) as Book[];
        setBooks(fetchedBooks);

        // Fetch audiobooks in parallel
        const results = await Promise.all(
          fetchedBooks.map((b) => getAudiobookByBookId(b.id)),
        );
        const audioMap: Record<string, Audiobook | null> = {};
        fetchedBooks.forEach((b, i) => {
          audioMap[b.id] = results[i];
        });
        setAudiobooksMap(audioMap);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ──
  if (error || !author) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center gap-3">
        <p className="text-red-400 text-sm">{error || 'Author not found.'}</p>
        <Link to="/" className="text-[#00D9FF] text-sm hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const audiobooks = books.map((b) => audiobooksMap[b.id]).filter(Boolean) as Audiobook[];

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* ── Hero / Profile header ── */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {author.photo_url ? (
              <img
                src={author.photo_url}
                alt={author.display_name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#00D9FF]/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-4xl font-bold">
                {author.display_name?.[0] ?? 'A'}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-white">{author.display_name}</h1>
              {author.website && (
                <a
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#00D9FF] hover:underline mt-1"
                >
                  <Globe size={13} />
                  {author.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={11} />
                </a>
              )}
            </div>

            {author.bio && (
              <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">{author.bio}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 bg-[#00D9FF]/10 border border-[#00D9FF]/20 rounded-full px-3.5 py-1.5">
                <Download size={13} className="text-[#00D9FF]" />
                <span className="text-xs font-semibold text-[#00D9FF]">
                  {formatNumber(author.total_downloads ?? 0)} downloads
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-full px-3.5 py-1.5">
                <DollarSign size={13} className="text-[#FFB800]" />
                <span className="text-xs font-semibold text-[#FFB800]">
                  {formatCurrency(author.total_earnings ?? 0)} earned
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-full px-3.5 py-1.5">
                <BookOpen size={13} className="text-[#9D4EDD]" />
                <span className="text-xs font-semibold text-[#9D4EDD]">
                  {books.length} {books.length === 1 ? 'book' : 'books'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Published Books ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#00D9FF]" />
            <h2 className="text-lg font-bold text-white">Published Books</h2>
          </div>

          {books.length === 0 ? (
            <p className="text-gray-500 text-sm">No books published yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </section>

        {/* ── Audiobooks ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Headphones size={18} className="text-[#9D4EDD]" />
            <h2 className="text-lg font-bold text-white">Audiobooks</h2>
          </div>

          {audiobooks.length === 0 ? (
            <p className="text-gray-500 text-sm">No audiobooks available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {audiobooks.map((ab) => (
                <AudiobookCard key={ab.id} audiobook={ab} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BookCard({ book }: { book: Book }) {
  return (
    <Link
      to={`/product/${book.handle ?? book.id}`}
      className="group block bg-white/4 border border-white/10 rounded-xl overflow-hidden hover:border-[#00D9FF]/30 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="aspect-[2/3] bg-gradient-to-br from-[#9D4EDD]/40 to-[#0B0814] overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={32} className="text-white/20" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-white truncate leading-snug">
          {book.title}
        </p>
        {book.genre && (
          <p className="text-xs text-gray-500 truncate">{book.genre}</p>
        )}
        <p className="text-sm font-bold text-[#FFB800]">
          {book.price > 0 ? `$${book.price.toFixed(2)}` : 'Free'}
        </p>
      </div>
    </Link>
  );
}

function AudiobookCard({ audiobook }: { audiobook: Audiobook }) {
  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-4 flex gap-4 hover:border-[#9D4EDD]/30 transition-colors">
      <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center shrink-0 overflow-hidden">
        {audiobook.cover_url ? (
          <img
            src={audiobook.cover_url}
            alt={audiobook.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Headphones size={20} className="text-white/70" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-white truncate">{audiobook.title}</p>
        <p className="text-xs text-gray-400">Narrator: {audiobook.narrator}</p>
        <p className="text-xs text-gray-500 uppercase">{audiobook.language}</p>
        <div className="flex items-center gap-2 pt-1 text-xs">
          <span className="text-[#FFB800] font-semibold">
            ${audiobook.audio_price.toFixed(2)} audio
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-400">${audiobook.bundle_price.toFixed(2)} bundle</span>
        </div>
      </div>
    </div>
  );
}

export default AuthorProfilePage;
