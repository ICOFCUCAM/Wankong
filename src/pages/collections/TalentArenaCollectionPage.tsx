import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Upload, Trophy, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PerformanceCard, { type PerformanceCardData } from '@/components/media/PerformanceCard';
import DefaultPerformanceThumbnail from '@/components/media/DefaultPerformanceThumbnail';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompetitionRoom {
  id: string;
  title: string;
  category: string | null;
  prize_pool: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cover_url: string | null;
  description: string | null;
  created_at: string;
}

interface RecentWinner {
  id: string;
  room_id: string;
  title: string;
  performer_name: string | null;
  votes_count: number;
  thumbnail_url: string | null;
  room_title: string;
  prize_pool: string;
  embed_url?: string | null;
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(deadline: string | null) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    if (!deadline) return;
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) return setT({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setT({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return t;
}

function Countdown({ deadline }: { deadline: string | null }) {
  const t = useCountdown(deadline);
  if (!deadline) return <span className="text-gray-500 text-xs">No deadline set</span>;
  return (
    <div className="flex gap-1.5">
      {([['d', t.days], ['h', t.hours], ['m', t.minutes], ['s', t.seconds]] as [string, number][]).map(([label, val]) => (
        <div key={label} className="bg-white/5 rounded-lg px-2 py-1 text-center min-w-[38px]">
          <p className="text-white font-bold text-xs tabular-nums">{String(val).padStart(2, '0')}</p>
          <p className="text-gray-600 text-[9px]">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Room Card ─────────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: CompetitionRoom }) {
  const navigate = useNavigate();
  const deadline = room.end_date;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#9D4EDD]/40 hover:scale-[1.02] transition-all duration-300 group shadow-lg shadow-black/40">
      <div className="relative h-36 overflow-hidden">
        {room.cover_url ? (
          <img src={room.cover_url} alt={room.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="relative w-full h-full">
            <DefaultPerformanceThumbnail gradient="from-[#9D4EDD]/40 to-[#00D9FF]/20" label={room.title} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0814] via-transparent to-transparent" />
        {room.prize_pool && (
          <div className="absolute top-3 right-3 bg-[#FFB800] text-[#0B0814] text-xs font-bold px-2.5 py-1 rounded-xl">
            {room.prize_pool}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30 font-medium">
            ● OPEN
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-white text-sm leading-tight">{room.title}</h3>
          {room.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#9D4EDD]/10 text-[#9D4EDD] border border-[#9D4EDD]/20 font-medium whitespace-nowrap shrink-0">
              {room.category}
            </span>
          )}
        </div>
        {room.description && (
          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{room.description}</p>
        )}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-500 text-[10px] mb-0.5">Countdown</p>
            <Countdown deadline={deadline} />
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-[10px] mb-0.5">Entries</p>
            <p className="text-white font-bold text-sm">—</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/talent-arena/room/${room.id}`)}
            className="flex-1 py-2 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
          >
            View Room
          </button>
          <button
            onClick={() => navigate('/talent-arena/upload')}
            className="px-3 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-xs hover:bg-white/10 transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton cards ────────────────────────────────────────────────────────────

function RoomSkeleton() {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-36 bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-full" />
        <div className="h-8 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}

function PerformanceSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-video rounded-xl bg-white/5 border border-white/5" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3 bg-white/10 rounded w-4/5" />
        <div className="h-2.5 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyRoomsState() {
  const PLACEHOLDERS = [
    { label: 'Gospel Vocal Competition', sub: 'Opening Next Week',   gradient: 'from-[#9D4EDD]/40 to-[#00D9FF]/20' },
    { label: 'Worship Leader Challenge', sub: 'New Room — Stay Tuned', gradient: 'from-[#FFB800]/30 to-[#FF6B00]/20' },
    { label: 'Choir Ensemble Battle',   sub: 'Upcoming Competition',  gradient: 'from-[#00F5A0]/30 to-[#00D9FF]/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-1">
        <Zap className="w-4 h-4 text-[#9D4EDD]" />
        <p className="text-white/60 text-sm">Upcoming Competitions Opening Soon</p>
        <span className="text-white/20 text-xs ml-auto">New rooms open weekly</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PLACEHOLDERS.map((p, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 overflow-hidden opacity-60 shadow-lg shadow-black/40"
          >
            {/* Cinematic 16:9 placeholder */}
            <div className="relative w-full aspect-video">
              <DefaultPerformanceThumbnail gradient={p.gradient} label="Opening Soon" />
              <div className="absolute inset-0 border border-dashed border-white/10 rounded-none m-3 pointer-events-none" />
            </div>
            <div className="px-4 py-3 bg-white/3">
              <p className="text-white/60 text-sm font-semibold">{p.label}</p>
              <p className="text-white/30 text-xs mt-0.5">{p.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TalentArenaCollectionPage() {
  const navigate = useNavigate();
  const [rooms,           setRooms]           = useState<CompetitionRoom[]>([]);
  const [recentWinners,   setRecentWinners]   = useState<RecentWinner[]>([]);
  const [featuredStrip,   setFeaturedStrip]   = useState<RecentWinner[]>([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [roomsRes, winnersRes, stripRes] = await Promise.all([
        supabase
          .from('competition_rooms')
          .select('id, title, category, prize_pool, status, start_date, end_date, cover_url, description, created_at')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('competition_entries_v2')
          .select('id, room_id, title, performer_name, votes_count, thumbnail_url, embed_url, competition_rooms(title, prize_pool)')
          .eq('status', 'winner')
          .order('votes_count', { ascending: false })
          .limit(6),
        supabase
          .from('competition_entries_v2')
          .select('id, room_id, title, performer_name, votes_count, thumbnail_url, embed_url, competition_rooms(title, prize_pool)')
          .in('status', ['winner', 'live', 'finalist'])
          .order('votes_count', { ascending: false })
          .limit(10),
      ]);

      setRooms((roomsRes.data ?? []) as CompetitionRoom[]);

      const mapEntry = (w: any): RecentWinner => ({
        id: w.id,
        room_id: w.room_id,
        title: w.title,
        performer_name: w.performer_name,
        votes_count: w.votes_count,
        thumbnail_url: w.thumbnail_url,
        embed_url: w.embed_url,
        room_title: w.competition_rooms?.title ?? 'Competition',
        prize_pool: w.competition_rooms?.prize_pool ?? '',
      });

      setRecentWinners((winnersRes.data ?? []).map(mapEntry));
      setFeaturedStrip((stripRes.data ?? []).map(mapEntry));
      setLoading(false);
    };

    fetchData();
  }, []);

  const totalPrizePool = rooms.filter(r => r.prize_pool).length;

  // Convert DB winners to PerformanceCardData
  const toCard = (w: RecentWinner, badge?: string, badgeBg?: string): PerformanceCardData => ({
    id:           w.id,
    title:        w.title,
    creatorName:  w.performer_name,
    thumbnailUrl: w.thumbnail_url,
    votes:        w.votes_count,
    embedUrl:     w.embed_url ?? undefined,
    to:           `/talent-arena/room/${w.room_id}`,
    badge,
    badgeBg,
  });

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B0814] via-[#100D2E] to-[#0B0814] border-b border-white/5 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(157,78,221,0.15),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            {/* Video-style hero icon — no emoji */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <span className="text-[#9D4EDD] text-sm font-medium uppercase tracking-widest">Talent Arena</span>
          </div>

          <h1 className="text-5xl font-black text-white mb-3">
            Compete. <span className="bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] bg-clip-text text-transparent">Win.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mb-6">
            The ultimate platform for gospel artists to showcase talent, gain fans, and earn real prizes.
          </p>

          <div className="flex gap-6 mb-8">
            {[
              { label: 'Active Rooms',    value: loading ? '—' : String(rooms.length) },
              { label: 'Total Prize Pool', value: loading ? '—' : (totalPrizePool > 0 ? 'Prizes Available' : '—') },
              { label: 'Recent Winners',  value: loading ? '—' : String(recentWinners.length) },
            ].map(s => (
              <div key={s.label}>
                <p className="text-white font-black text-2xl">{s.value}</p>
                <p className="text-gray-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Featured Strip — recent winners / live entries ─────────────── */}
          {(loading || featuredStrip.length > 0) && (
            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
                Recent Winners &amp; Live Entries
              </p>
              <div
                className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none' }}
              >
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-[260px] flex-shrink-0 snap-center">
                        <PerformanceSkeleton />
                      </div>
                    ))
                  : featuredStrip.map((w, i) => (
                      <div key={w.id} className="w-[260px] flex-shrink-0 snap-center">
                        <PerformanceCard
                          {...toCard(
                            w,
                            i === 0 ? '🏆 Winner' : w.votes_count > 500 ? '🔥 Trending' : '● Live',
                            i === 0 ? 'rgba(255,184,0,0.85)' : w.votes_count > 500 ? 'rgba(255,107,0,0.85)' : 'rgba(0,245,160,0.25)',
                          )}
                        />
                      </div>
                    ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">

        {/* Active Rooms */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse inline-block" />
              <h2 className="text-xl font-bold text-white">Active Competition Rooms</h2>
            </div>
            <Link to="/talent-arena" className="text-[#9D4EDD] text-sm hover:underline">View All →</Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <RoomSkeleton key={i} />)}
            </div>
          ) : rooms.length === 0 ? (
            <EmptyRoomsState />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map(room => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Winners */}
        {(loading || recentWinners.length > 0) && (
          <div className="mb-14">
            <h2 className="text-xl font-bold text-white mb-6">Recent Winners</h2>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => <PerformanceSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recentWinners.map(w => (
                  <PerformanceCard
                    key={w.id}
                    {...toCard(w, '🏆 WINNER', 'rgba(255,184,0,0.9)')}
                    weekBadge={w.prize_pool || undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Submit CTA — video-upload banner ─────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#9D4EDD]/20 to-[#00D9FF]/10 border border-[#9D4EDD]/20 rounded-2xl">

          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),' +
                'linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(157,78,221,0.08),transparent_70%)]" />

          {/* Video-upload preview strip */}
          <div className="relative flex overflow-hidden h-[60px] border-b border-white/5">
            {['from-[#9D4EDD]/30 to-[#00D9FF]/10','from-[#FFB800]/20 to-[#FF6B00]/10','from-[#00F5A0]/20 to-[#00D9FF]/10','from-[#FF006E]/20 to-[#9D4EDD]/10','from-[#00D9FF]/20 to-[#9D4EDD]/10'].map((g, i) => (
              <div key={i} className={`flex-1 bg-gradient-to-br ${g} flex items-center justify-center border-r border-white/5`}>
                {i === 2 ? (
                  <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                )}
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0814]/60" />
          </div>

          {/* CTA body */}
          <div className="relative text-center px-8 py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-full mb-4">
              <Upload className="w-3.5 h-3.5 text-[#9D4EDD]" />
              <span className="text-[#9D4EDD] text-xs font-semibold uppercase tracking-wider">Submit Performance</span>
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Submit Your Performance</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Record your best performance, submit to an active competition, and let the community vote.
            </p>
            <button
              onClick={() => navigate('/talent-arena/upload')}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
            >
              <Upload className="w-4 h-4" />
              Submit Your Performance
            </button>
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
}
