import React, { useEffect, useState } from 'react';
import { BookOpen, Headphones, DollarSign, Languages, TrendingUp, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getAudiobookByBookId } from '@/features/audiobooks/AudiobookService';
import type { Audiobook } from '@/features/audiobooks/AudiobookService';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthorProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  photo_url?: string;
  total_downloads: number;
  total_earnings: number;
  auto_translate: boolean;
}

interface Book {
  id: string;
  title: string;
  price: number;
  cover_image_url?: string;
  language?: string;
  genre?: string;
}

interface EarningRow {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  period: string;
  paid: boolean;
}

interface TranslationRow {
  id: string;
  book_id: string;
  language: string;
  status: string;
  pdf_url?: string;
  title?: string;
}

type Tab = 'books' | 'audiobooks' | 'earnings' | 'translations';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'books', label: 'Books', icon: <BookOpen size={15} /> },
  { key: 'audiobooks', label: 'Audiobooks', icon: <Headphones size={15} /> },
  { key: 'earnings', label: 'Earnings', icon: <DollarSign size={15} /> },
  { key: 'translations', label: 'Translations', icon: <Languages size={15} /> },
];

// ── Component ──────────────────────────────────────────────────────────────

export function AuthorDashboard() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [audiobooksMap, setAudiobooksMap] = useState<Record<string, Audiobook | null>>({});
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('books');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch author profile
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data: authorData, error: authorErr } = await supabase
          .from('author_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (authorErr) throw authorErr;
        setProfile(authorData as AuthorProfile | null);

        if (!authorData) {
          setLoading(false);
          return;
        }

        // Fetch books
        const { data: booksData } = await supabase
          .from('ecom_products')
          .select('id, title, price, cover_image_url, language, genre')
          .eq('creator_id', user.id)
          .eq('product_type', 'Book')
          .order('created_at', { ascending: false });

        const fetchedBooks = (booksData ?? []) as Book[];
        setBooks(fetchedBooks);

        // Fetch audiobooks for each book (parallel)
        const audioResults = await Promise.all(
          fetchedBooks.map((b) => getAudiobookByBookId(b.id)),
        );
        const audioMap: Record<string, Audiobook | null> = {};
        fetchedBooks.forEach((b, i) => {
          audioMap[b.id] = audioResults[i];
        });
        setAudiobooksMap(audioMap);

        // Fetch earnings
        const { data: earningsData } = await supabase
          .from('creator_earnings')
          .select('*')
          .eq('user_id', user.id)
          .order('period', { ascending: false });
        setEarnings((earningsData ?? []) as EarningRow[]);

        // Fetch translations for all books
        if (fetchedBooks.length > 0) {
          const bookIds = fetchedBooks.map((b) => b.id);
          const { data: translData } = await supabase
            .from('book_translations')
            .select('*')
            .in('book_id', bookIds)
            .order('language');
          setTranslations((translData ?? []) as TranslationRow[]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <p className="text-gray-400">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <p className="text-gray-400 text-sm">No author profile found for this account.</p>
      </div>
    );
  }

  const totalEarnings = earnings.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#00D9FF]/40"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-2xl font-bold text-white">
              {profile.display_name?.[0] ?? 'A'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {profile.display_name ?? 'Author Dashboard'}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Creator Dashboard · WANKONG</p>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Downloads',
              value: formatNumber(profile.total_downloads ?? 0),
              icon: <Download size={18} />,
              accent: '#00D9FF',
            },
            {
              label: 'Total Earnings',
              value: formatCurrency(profile.total_earnings ?? 0),
              icon: <DollarSign size={18} />,
              accent: '#FFB800',
            },
            {
              label: 'Books Published',
              value: String(books.length),
              icon: <BookOpen size={18} />,
              accent: '#9D4EDD',
            },
            {
              label: 'Lifetime Revenue',
              value: formatCurrency(totalEarnings),
              icon: <TrendingUp size={18} />,
              accent: '#00F5A0',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/4 border border-white/10 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2" style={{ color: stat.accent }}>
                {stat.icon}
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Auto-translate toggle row ── */}
        <div className="bg-white/4 border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Auto-Translate New Books</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Automatically queue new books for AI translation into all supported languages.
            </p>
          </div>
          <span
            className={`px-3 py-1.5 text-xs font-bold rounded-full ${
              profile.auto_translate
                ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                : 'bg-white/8 text-gray-400'
            }`}
          >
            {profile.auto_translate ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* ── Tabs ── */}
        <div className="border-b border-white/10">
          <nav className="flex gap-1 -mb-px">
            {TAB_CONFIG.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-[#00D9FF] text-[#00D9FF]'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Tab panels ── */}

        {/* Books */}
        {activeTab === 'books' && (
          <div className="space-y-3">
            {books.length === 0 ? (
              <EmptyState icon={<BookOpen size={32} />} message="No books published yet." />
            ) : (
              books.map((book) => (
                <div
                  key={book.id}
                  className="bg-white/4 border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-white/20 transition-colors"
                >
                  <div className="w-10 h-14 rounded-md bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center shrink-0 overflow-hidden">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen size={18} className="text-white/70" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {book.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {book.language && <span className="uppercase">{book.language}</span>}
                      {book.genre && <span>{book.genre}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#FFB800]">
                      {book.price ? formatCurrency(book.price) : 'Free'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Audiobooks */}
        {activeTab === 'audiobooks' && (
          <div className="space-y-3">
            {books.length === 0 ? (
              <EmptyState icon={<Headphones size={32} />} message="No books found." />
            ) : (
              books.map((book) => {
                const ab = audiobooksMap[book.id];
                return (
                  <div
                    key={book.id}
                    className="bg-white/4 border border-white/10 rounded-xl px-5 py-4"
                  >
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      {book.title}
                    </p>
                    {ab ? (
                      <div className="flex items-center gap-4">
                        <Headphones size={18} className="text-[#00D9FF] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {ab.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Narrator: {ab.narrator} · {ab.language.toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-400 shrink-0 space-y-0.5">
                          <p>eBook {formatCurrency(ab.ebook_price)}</p>
                          <p>Audio {formatCurrency(ab.audio_price)}</p>
                          <p>Bundle {formatCurrency(ab.bundle_price)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No audiobook linked yet.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Earnings */}
        {activeTab === 'earnings' && (
          <div className="space-y-3">
            {earnings.length === 0 ? (
              <EmptyState icon={<DollarSign size={32} />} message="No earnings recorded yet." />
            ) : (
              <>
                <div className="bg-gradient-to-r from-[#FFB800]/20 to-[#FF6B00]/10 border border-[#FFB800]/30 rounded-xl px-5 py-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-300">Total Lifetime Earnings</p>
                  <p className="text-2xl font-bold text-[#FFB800]">
                    {formatCurrency(totalEarnings)}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/4 border-b border-white/10">
                      <tr>
                        {['Period', 'Category', 'Amount', 'Status'].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {earnings.map((row) => (
                        <tr key={row.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 text-gray-300">{row.period}</td>
                          <td className="px-4 py-3">
                            <span className="capitalize text-gray-300">
                              {row.category.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#00F5A0]">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.paid
                                  ? 'bg-[#00F5A0]/15 text-[#00F5A0]'
                                  : 'bg-[#FFB800]/15 text-[#FFB800]'
                              }`}
                            >
                              {row.paid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Translations */}
        {activeTab === 'translations' && (
          <div className="space-y-3">
            {translations.length === 0 ? (
              <EmptyState icon={<Languages size={32} />} message="No translations available yet." />
            ) : (
              books.map((book) => {
                const bookTranslations = translations.filter(
                  (t) => t.book_id === book.id,
                );
                if (bookTranslations.length === 0) return null;
                return (
                  <div
                    key={book.id}
                    className="bg-white/4 border border-white/10 rounded-xl overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-white/10 bg-white/2">
                      <p className="text-sm font-semibold text-white">{book.title}</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {bookTranslations.map((t) => (
                        <div
                          key={t.id}
                          className="px-5 py-3 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 text-center text-xs font-bold uppercase text-[#00D9FF] bg-[#00D9FF]/10 rounded px-1.5 py-0.5">
                              {t.language}
                            </span>
                            <p className="text-sm text-gray-300 truncate">
                              {t.title ?? `${book.title} — ${t.language.toUpperCase()}`}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              t.status === 'done'
                                ? 'bg-[#00F5A0]/15 text-[#00F5A0]'
                                : t.status === 'queued'
                                ? 'bg-[#FFB800]/15 text-[#FFB800]'
                                : 'bg-white/8 text-gray-400'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <span className="text-gray-700">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default AuthorDashboard;
