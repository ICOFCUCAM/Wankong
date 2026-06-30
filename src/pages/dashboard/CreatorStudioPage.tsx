import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, BarChart2, DollarSign, Radio, Users, Music,
  BookOpen, Trophy, Bell, Settings, TrendingUp, Zap,
  ChevronRight, Play, Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudioStats {
  tracks:      number;
  streams:     number;
  followers:   number;
  earnings:    number;
  releases:    number;
  competitions: number;
}

interface RecentTrack {
  id:    string;
  title: string;
  stream_count: number;
  created_at: string;
}

// ── Tool Card ──────────────────────────────────────────────────────────────────

function ToolCard({ icon, title, desc, href, badge, color }: {
  icon:   React.ReactNode;
  title:  string;
  desc:   string;
  href:   string;
  badge?: string;
  color:  string;
}) {
  return (
    <Link to={href}
      className="group flex items-start gap-4 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white font-semibold text-sm">{title}</p>
          {badge && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: `${color}25`, color }}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-white/40 text-xs leading-snug">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-1" />
    </Link>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-2xl border"
      style={{ background: `${color}08`, borderColor: `${color}22` }}>
      <p className="text-white font-black text-xl" style={{ color }}>{value}</p>
      <p className="text-white/40 text-[10px] mt-0.5 text-center">{label}</p>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function CreatorStudioPage() {
  const { user } = useAuth();
  const [stats,  setStats]  = useState<StudioStats | null>(null);
  const [recent, setRecent] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const uid = user.id;

    const [tracksRes, streamsRes, followersRes, earningsRes, releasesRes, compRes] = await Promise.all([
      supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('artist_id', uid),
      supabase.from('tracks').select('stream_count').eq('artist_id', uid),
      supabase.from('artist_followers').select('*', { count: 'exact', head: true }).eq('artist_id', uid),
      supabase.from('creator_earnings').select('amount').eq('user_id', uid),
      supabase.from('distribution_releases').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('competition_entries_v2').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    ]);

    const totalStreams = (streamsRes.data ?? []).reduce((s: number, r: any) => s + (r.stream_count ?? 0), 0);
    const totalEarned  = (earningsRes.data ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);

    setStats({
      tracks:       tracksRes.count   ?? 0,
      streams:      totalStreams,
      followers:    followersRes.count ?? 0,
      earnings:     totalEarned,
      releases:     releasesRes.count ?? 0,
      competitions: compRes.count     ?? 0,
    });

    const { data: recentData } = await supabase
      .from('tracks')
      .select('id, title, stream_count, created_at')
      .eq('artist_id', uid)
      .order('created_at', { ascending: false })
      .limit(3);

    setRecent((recentData ?? []) as RecentTrack[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const fmtNum  = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-12">

        {/* Hero */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2"
              style={{ background: 'rgba(0,217,255,0.1)', color: '#00D9FF', border: '1px solid rgba(0,217,255,0.2)' }}>
              <Zap className="w-3 h-3" />
              Creator Studio
            </div>
            <h1 className="text-3xl font-black">Your creator hub</h1>
            <p className="text-white/40 text-sm mt-1">Everything you need to grow, distribute, and earn.</p>
          </div>
        </div>

        {/* Stats row */}
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            <StatPill label="Tracks"       value={fmtNum(stats.tracks)}           color="#00D9FF" />
            <StatPill label="Streams"      value={fmtNum(stats.streams)}          color="#9D4EDD" />
            <StatPill label="Followers"    value={fmtNum(stats.followers)}        color="#00F5A0" />
            <StatPill label="Earnings"     value={fmtMoney(stats.earnings)}       color="#FFB800" />
            <StatPill label="Releases"     value={String(stats.releases)}         color="#FF6B00" />
            <StatPill label="Competitions" value={String(stats.competitions)}     color="#FF006E" />
          </div>
        )}

        {/* Two-col: tools + recent */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Tools */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-white font-bold text-sm uppercase tracking-wider text-white/40 mb-3">Creator Tools</h2>

            <ToolCard
              icon={<Upload className="w-5 h-5" />}
              title="Upload & Distribute"
              desc="Release music, audiobooks, and podcasts to 30+ platforms"
              href="/upload/distribute"
              badge="NEW"
              color="#00D9FF"
            />
            <ToolCard
              icon={<BarChart2 className="w-5 h-5" />}
              title="Analytics"
              desc="Streams, top tracks, geo breakdown, skip rate"
              href="/dashboard/artist"
              color="#9D4EDD"
            />
            <ToolCard
              icon={<DollarSign className="w-5 h-5" />}
              title="Earnings & Payouts"
              desc="Track royalties, request withdrawals via PayPal or Bank"
              href="/dashboard/earnings"
              color="#FFB800"
            />
            <ToolCard
              icon={<Radio className="w-5 h-5" />}
              title="My Releases"
              desc="Distribution status and per-platform tracking"
              href="/distribution/releases"
              color="#FF6B00"
            />
            <ToolCard
              icon={<Trophy className="w-5 h-5" />}
              title="Talent Arena"
              desc="Enter competitions and compete for global recognition"
              href="/talent-arena/upload"
              color="#FFB800"
            />
            <ToolCard
              icon={<Star className="w-5 h-5" />}
              title="Fan Memberships"
              desc="Let fans support you with monthly membership tiers"
              href="/dashboard/memberships"
              badge="SOON"
              color="#9D4EDD"
            />
            <ToolCard
              icon={<Bell className="w-5 h-5" />}
              title="Notification Settings"
              desc="Control email and push alerts for your account"
              href="/settings/notifications"
              color="#00D9FF"
            />
            <ToolCard
              icon={<Settings className="w-5 h-5" />}
              title="Profile Settings"
              desc="Update your bio, links, and public artist page"
              href="/dashboard"
              color="#9ca3af"
            />
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-5">

            {/* Recent activity */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm">Recent Tracks</h3>
                <Link to="/dashboard/artist" className="text-[10px] text-[#00D9FF]">View all →</Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">No tracks yet. Upload your first!</p>
              ) : (
                <div className="space-y-3">
                  {recent.map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#9D4EDD]/20 flex items-center justify-center shrink-0">
                        <Music className="w-3.5 h-3.5 text-[#9D4EDD]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{t.title}</p>
                        <p className="text-white/30 text-[10px]">{fmtNum(t.stream_count)} streams</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick upload CTA */}
            <Link to="/upload/distribute"
              className="block rounded-2xl p-5 text-center hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,rgba(0,217,255,0.15),rgba(157,78,221,0.15))', border: '1px solid rgba(0,217,255,0.2)' }}>
              <Upload className="w-8 h-8 text-[#00D9FF] mx-auto mb-2" />
              <p className="text-white font-bold text-sm mb-0.5">Upload New Release</p>
              <p className="text-white/40 text-xs">Distribute to Spotify, Apple Music + 28 more</p>
            </Link>

            {/* Level teaser */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#FFB800]" />
                <p className="text-white font-bold text-sm">Creator Level</p>
              </div>
              <p className="text-white/40 text-xs mb-3">Earn XP for streams, releases, and competition wins.</p>
              <Link to="/dashboard/earnings"
                className="text-xs text-[#FFB800] hover:underline">
                View your level →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
