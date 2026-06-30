import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Upload, Globe, DollarSign,
  Users, TrendingUp, Headphones, BarChart2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Stats {
  books:       number;
  audiobooks:  number;
  translations: number;
  earnings:    number;
  downloads:   number;
}

interface RecentBook {
  id: string;
  title: string;
  price: number;
  created_at: string;
  language?: string;
  product_type?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0B0814';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, colour }: {
  icon: React.ReactNode; label: string; value: string; colour: string;
}) {
  return (
    <div className="rounded-2xl p-5 border" style={{ background: `${colour}08`, borderColor: `${colour}22` }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${colour}18`, color: colour }}
      >
        {icon}
      </div>
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color: colour }}>{value}</p>
    </div>
  );
}

// ── Quick action ───────────────────────────────────────────────────────────────

function QuickAction({ icon, label, href, colour }: {
  icon: React.ReactNode; label: string; href: string; colour: string;
}) {
  return (
    <Link
      to={href}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all text-center"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${colour}18`, color: colour }}>
        {icon}
      </div>
      <span className="text-white/70 text-xs font-medium leading-tight">{label}</span>
    </Link>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AuthorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats,      setStats]      = useState<Stats | null>(null);
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.id;

    const [booksRes, audiobooksRes, transRes, earningsRes, booksListRes] = await Promise.all([
      supabase.from('ecom_products').select('*', { count: 'exact', head: true })
        .eq('creator_id', uid).eq('product_type', 'Book'),
      supabase.from('audiobooks').select('*', { count: 'exact', head: true }).eq('author_id', uid),
      supabase.from('book_translations').select('*', { count: 'exact', head: true }),
      supabase.from('creator_earnings').select('amount, category').eq('user_id', uid)
        .in('category', ['book_sale', 'audiobook_play', 'translation_sale']),
      supabase.from('ecom_products').select('id').eq('creator_id', uid),
    ]);

    const totalEarned = (earningsRes.data ?? []).reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0);

    // Count purchases (downloads) of the author's products from user_library
    const authorProductIds = (booksListRes.data ?? []).map((p: any) => p.id);
    let downloads = 0;
    if (authorProductIds.length > 0) {
      const { count } = await supabase
        .from('user_library')
        .select('*', { count: 'exact', head: true })
        .in('product_id', authorProductIds);
      downloads = count ?? 0;
    }

    setStats({
      books:        booksRes.count       ?? 0,
      audiobooks:   audiobooksRes.count  ?? 0,
      translations: transRes.count       ?? 0,
      earnings:     totalEarned,
      downloads,
    });

    const { data: recent } = await supabase
      .from('ecom_products')
      .select('id,title,price,created_at,language,product_type')
      .eq('creator_id', uid)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentBooks((recent ?? []) as RecentBook[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) { navigate('/', { replace: true }); return null; }

  const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="min-h-screen text-white" style={{ background: NAVY }}>
      <Header />

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">

        {/* Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full mb-2 inline-block" style={{ background: `${GOLD}18`, color: GOLD }}>
              Author Dashboard
            </span>
            <h1 className="text-3xl font-black text-white">
              Welcome, {user.email?.split('@')[0]}
            </h1>
            <p className="text-white/40 text-sm mt-1">Manage your books, audiobooks & translations</p>
          </div>
          <Link
            to="/authors/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}
          >
            <Upload className="w-4 h-4" />
            Upload Book
          </Link>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl h-32 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard icon={<BookOpen className="w-5 h-5" />}    label="Books"        value={String(stats.books)}       colour={GOLD}   />
            <StatCard icon={<Headphones className="w-5 h-5" />}  label="Audiobooks"   value={String(stats.audiobooks)}  colour={PURPLE} />
            <StatCard icon={<Globe className="w-5 h-5" />}       label="Translations" value={String(stats.translations)} colour={CYAN}   />
            <StatCard icon={<DollarSign className="w-5 h-5" />}  label="Earnings"     value={fmtMoney(stats.earnings)}  colour={GREEN}  />
            <StatCard icon={<TrendingUp className="w-5 h-5" />}  label="Downloads"    value={String(stats.downloads)}   colour={ORANGE} />
          </div>
        )}

        {/* Two-col: quick actions + recent books */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div>
            <h2 className="text-white font-bold text-base mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction icon={<BookOpen className="w-5 h-5" />}    label="Upload Book"        href="/authors/dashboard"      colour={GOLD}   />
              <QuickAction icon={<Headphones className="w-5 h-5" />}  label="Upload Audiobook"   href="/authors/dashboard"      colour={PURPLE} />
              <QuickAction icon={<Globe className="w-5 h-5" />}       label="Translations"       href="/authors/dashboard"      colour={CYAN}   />
              <QuickAction icon={<DollarSign className="w-5 h-5" />}  label="Earnings"           href="/dashboard/earnings"     colour={GREEN}  />
              <QuickAction icon={<BarChart2 className="w-5 h-5" />}   label="Analytics"          href="/dashboard"              colour={ORANGE} />
              <QuickAction icon={<Users className="w-5 h-5" />}       label="Browse Books"       href="/collections/books"      colour={CYAN}   />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">Recent Books</h2>
              <Link to="/authors/dashboard" className="text-xs" style={{ color: GOLD }}>Manage →</Link>
            </div>

            {recentBooks.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-10 text-center">
                <p className="text-4xl mb-3">📚</p>
                <p className="text-white/50 text-sm mb-4">No books uploaded yet</p>
                <Link
                  to="/authors/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}
                >
                  Upload Your First Book
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentBooks.map(b => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors"
                  >
                    <div
                      className="w-10 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${GOLD}20`, color: GOLD }}
                    >
                      📚
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{b.title}</p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {b.language && ` · ${b.language.toUpperCase()}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0" style={{ color: b.price === 0 ? GREEN : GOLD }}>
                      {b.price === 0 ? 'FREE' : fmtMoney(b.price)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tools strip */}
        <div className="mt-8 rounded-2xl p-5 border border-white/8 bg-white/3">
          <h2 className="text-white font-bold text-sm mb-4">Author Resources</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Creator Monetization',  href: '/creator-monetization-policy' },
              { label: 'Distribution Guide',    href: '/distribution-agreement' },
              { label: 'Translation Guide',     href: '/help' },
              { label: 'Help Center',           href: '/help' },
            ].map(l => (
              <Link
                key={l.label}
                to={l.href}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
