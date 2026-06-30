import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video, Trophy, TrendingUp, Star, Upload,
  Play, Users, BarChart2, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompetitionEntry {
  id:           string;
  title:        string;
  status:       string;
  vote_count:   number;
  created_at:   string;
  cover_url:    string | null;
}

interface PlatformStat {
  label:  string;
  value:  string | number;
  colour: string;
  icon:   React.ReactNode;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, colour, icon }: PlatformStat) {
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: `${colour}08`, borderColor: `${colour}22` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: `${colour}18`, color: colour }}>
          {icon}
        </div>
      </div>
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}

// ── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: CompetitionEntry }) {
  const STATUS: Record<string, { label: string; colour: string }> = {
    pending:  { label: 'Pending',  colour: '#9ca3af' },
    approved: { label: 'Approved', colour: '#00F5A0' },
    live:     { label: 'Live',     colour: '#00D9FF' },
    winner:   { label: 'Winner',   colour: '#FFB800' },
    rejected: { label: 'Rejected', colour: '#FF4466' },
  };
  const s = STATUS[entry.status] ?? { label: entry.status, colour: '#9ca3af' };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center">
        {entry.cover_url
          ? <img src={entry.cover_url} alt="" className="w-full h-full object-cover" />
          : <Video className="w-4 h-4 text-gray-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{entry.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${s.colour}20`, color: s.colour }}>
            {s.label}
          </span>
          <span className="text-xs text-gray-500">{entry.vote_count} vote{entry.vote_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreatorDashboardPage() {
  const { user } = useAuth();

  const [entries,  setEntries]  = useState<CompetitionEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('competition_entries_v2')
        .select('id, title, status, vote_count, created_at, cover_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setEntries(data as CompetitionEntry[]);
        setTotalVotes(data.reduce((sum: number, e: CompetitionEntry) => sum + (e.vote_count || 0), 0));
      }
      setLoading(false);
    })();
  }, [user]);

  const liveEntries    = entries.filter(e => e.status === 'live').length;
  const winnerEntries  = entries.filter(e => e.status === 'winner').length;

  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Creator Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your performances, track votes and competition standings.
            </p>
          </div>
          <Link
            to="/talent-arena/upload"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#9D4EDD] hover:bg-[#9D4EDD]/90 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Upload className="w-4 h-4" /> Upload Performance
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Entries"   value={entries.length}  colour="#9D4EDD" icon={<Video className="w-5 h-5" />} />
          <StatCard label="Total Votes"     value={totalVotes}      colour="#00D9FF" icon={<TrendingUp className="w-5 h-5" />} />
          <StatCard label="Live Now"        value={liveEntries}     colour="#00F5A0" icon={<Play className="w-5 h-5" />} />
          <StatCard label="Wins"            value={winnerEntries}   colour="#FFB800" icon={<Trophy className="w-5 h-5" />} />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Upload Performance',  href: '/talent-arena/upload', icon: <Upload className="w-4 h-4" />,    colour: '#9D4EDD' },
            { label: 'Browse Competitions', href: '/talent-arena',        icon: <Trophy className="w-4 h-4" />,    colour: '#FFB800' },
            { label: 'View Analytics',      href: '/dashboard/earnings',  icon: <BarChart2 className="w-4 h-4" />, colour: '#00D9FF' },
          ].map(({ label, href, icon, colour }) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-0.5"
              style={{ background: `${colour}08`, borderColor: `${colour}22`, color: colour }}
            >
              {icon}
              <span className="text-sm font-semibold text-white">{label}</span>
            </Link>
          ))}
        </div>

        {/* Competition entries */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-[#FFB800]" /> My Performances
              {entries.length > 0 && <span className="text-sm font-normal text-gray-500">({entries.length})</span>}
            </h2>
            <Link to="/talent-arena" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Explore arena →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center bg-white/3 border border-white/8 rounded-2xl border-dashed">
              <Video className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No performances uploaded yet.</p>
              <Link
                to="/talent-arena/upload"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#9D4EDD] hover:text-[#9D4EDD]/80 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload your first performance
              </Link>
            </div>
          ) : (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-2 space-y-0.5">
              {entries.map(e => <EntryRow key={e.id} entry={e} />)}
            </div>
          )}
        </section>

        {/* Featured placements info */}
        <section className="bg-gradient-to-br from-[#9D4EDD]/10 to-[#00D9FF]/10 border border-[#9D4EDD]/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#9D4EDD]/20 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-[#9D4EDD]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Featured Placements</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Competition winners receive featured placement on the WANKONG homepage and
                Talent Arena collections. Your highest-voted performances are automatically
                eligible for editorial curation.
              </p>
              <Link
                to="/talent-arena"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#9D4EDD] hover:text-[#9D4EDD]/80 font-semibold transition-colors"
              >
                Enter a competition <Trophy className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
