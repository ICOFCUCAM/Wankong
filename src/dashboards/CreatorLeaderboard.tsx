import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Loader2, Medal } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  level: string;
  xp: number;
  avatar_url: string | null;
}

// ── Level colours ─────────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  Bronze:          '#CD7F32',
  Silver:          '#C0C0C0',
  Gold:            '#FFB800',
  Platinum:        '#E5E4E2',
  Diamond:         '#00D9FF',
  GlobalAmbassador:'#9D4EDD',
};

function getLevelColor(level: string): string {
  return LEVEL_COLORS[level] ?? '#CD7F32';
}

// ── Row styling helpers ───────────────────────────────────────────────────────
function getRankRowClass(rank: number): string {
  if (rank === 1) return 'bg-[#FFB800]/10 border border-[#FFB800]/30';
  if (rank === 2) return 'bg-[#C0C0C0]/10 border border-[#C0C0C0]/30';
  if (rank === 3) return 'bg-[#CD7F32]/10 border border-[#CD7F32]/30';
  return 'bg-[#0B0814] border border-[#1a2540]';
}

function getRankNumberStyle(rank: number): string {
  if (rank === 1) return 'text-[#FFB800] font-bold';
  if (rank === 2) return 'text-[#C0C0C0] font-bold';
  if (rank === 3) return 'text-[#CD7F32] font-bold';
  return 'text-gray-500 font-medium';
}

function getRankIcon(rank: number): React.ReactNode {
  if (rank === 1) return <Trophy className="w-4 h-4 text-[#FFB800]" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-[#C0C0C0]" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-[#CD7F32]" />;
  return null;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
function getInitial(name: string | null, userId: string): string {
  if (name?.trim()) return name.trim()[0].toUpperCase();
  return userId.slice(0, 2).toUpperCase();
}

function getDisplayName(entry: LeaderboardEntry): string {
  if (entry.display_name?.trim()) return entry.display_name.trim();
  return `${entry.user_id.slice(0, 8)}...`;
}

function getAvatarGradient(userId: string): string {
  const gradients = [
    'from-[#9D4EDD] to-[#00D9FF]',
    'from-[#FFB800] to-[#FF6B00]',
    'from-[#00F5A0] to-[#00D9FF]',
    'from-[#FF6B00] to-[#9D4EDD]',
    'from-[#00D9FF] to-[#9D4EDD]',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// ── Component ─────────────────────────────────────────────────────────────────

const CreatorLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [creators, setCreators] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('creator_levels')
        .select('user_id, display_name, level, xp, avatar_url')
        .order('xp', { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }

      setCreators((data ?? []) as LeaderboardEntry[]);

      // Compute user's rank (simple count query)
      if (user?.id) {
        const userEntry = (data ?? []).find(c => c.user_id === user.id);
        if (userEntry) {
          const rank = (data ?? []).findIndex(c => c.user_id === user.id) + 1;
          setUserRank(rank);
        } else {
          // User not in top 50 — count how many have higher XP
          const { count } = await supabase
            .from('creator_levels')
            .select('*', { count: 'exact', head: true })
            .gt('xp', 0); // approximate
          // Fetch user's own XP
          const { data: myLevel } = await supabase
            .from('creator_levels')
            .select('xp')
            .eq('user_id', user.id)
            .maybeSingle();

          if (myLevel && !cancelled) {
            const { count: above } = await supabase
              .from('creator_levels')
              .select('*', { count: 'exact', head: true })
              .gt('xp', myLevel.xp);
            setUserRank((above ?? 0) + 1);
          }
        }
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-[#0B0814] text-white p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#FFB800]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Global Leaderboard</h1>
            <p className="text-gray-400 text-sm">Top 50 creators ranked by XP</p>
          </div>
        </div>

        {/* Top 3 podium — gold/silver/bronze bg tints */}
        {!loading && !error && creators.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {/* 2nd — silver */}
            <div className="flex flex-col items-center gap-2 bg-[#C0C0C0]/10 border border-[#C0C0C0]/20 rounded-2xl p-4 mt-6">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(creators[1].user_id)} flex items-center justify-center text-white font-bold text-lg overflow-hidden`}>
                {creators[1].avatar_url ? (
                  <img src={creators[1].avatar_url} alt="" className="w-full h-full object-cover" />
                ) : getInitial(creators[1].display_name, creators[1].user_id)}
              </div>
              <Medal className="w-5 h-5 text-[#C0C0C0]" />
              <span className="text-white text-xs font-semibold text-center truncate w-full">
                {getDisplayName(creators[1])}
              </span>
              <span className="text-[#C0C0C0] text-xs font-bold">{creators[1].xp.toLocaleString()} XP</span>
            </div>

            {/* 1st — gold */}
            <div className="flex flex-col items-center gap-2 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-2xl p-4 ring-2 ring-[#FFB800]/40 shadow-[0_0_24px_rgba(255,184,0,0.2)]">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(creators[0].user_id)} flex items-center justify-center text-white font-bold text-xl overflow-hidden`}>
                {creators[0].avatar_url ? (
                  <img src={creators[0].avatar_url} alt="" className="w-full h-full object-cover" />
                ) : getInitial(creators[0].display_name, creators[0].user_id)}
              </div>
              <Trophy className="w-5 h-5 text-[#FFB800]" />
              <span className="text-white text-xs font-bold text-center truncate w-full">
                {getDisplayName(creators[0])}
              </span>
              <span className="text-[#FFB800] text-sm font-bold">{creators[0].xp.toLocaleString()} XP</span>
            </div>

            {/* 3rd — bronze */}
            <div className="flex flex-col items-center gap-2 bg-[#CD7F32]/10 border border-[#CD7F32]/20 rounded-2xl p-4 mt-6">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(creators[2].user_id)} flex items-center justify-center text-white font-bold text-lg overflow-hidden`}>
                {creators[2].avatar_url ? (
                  <img src={creators[2].avatar_url} alt="" className="w-full h-full object-cover" />
                ) : getInitial(creators[2].display_name, creators[2].user_id)}
              </div>
              <Medal className="w-5 h-5 text-[#CD7F32]" />
              <span className="text-white text-xs font-semibold text-center truncate w-full">
                {getDisplayName(creators[2])}
              </span>
              <span className="text-[#CD7F32] text-xs font-bold">{creators[2].xp.toLocaleString()} XP</span>
            </div>
          </div>
        )}

        {/* Full table */}
        <div className="bg-[#1A2240] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_auto_auto] gap-2 px-4 py-3 border-b border-[#2d3a5a]">
            <span className="text-gray-500 text-xs font-semibold">#</span>
            <span className="text-gray-500 text-xs font-semibold">Creator</span>
            <span className="text-gray-500 text-xs font-semibold">Level</span>
            <span className="text-gray-500 text-xs font-semibold text-right">XP</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-sm text-center py-8">{error}</div>
          ) : creators.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">No creators found.</div>
          ) : (
            <div className="divide-y divide-[#1a2540]">
              {creators.map((creator, idx) => {
                const rank = idx + 1;
                const isCurrentUser = user?.id === creator.user_id;
                const levelColor = getLevelColor(creator.level);

                return (
                  <div
                    key={creator.user_id}
                    className={[
                      'grid grid-cols-[48px_1fr_auto_auto] gap-2 items-center px-4 py-3 transition-colors',
                      getRankRowClass(rank),
                      isCurrentUser ? 'ring-1 ring-[#00D9FF]/40' : '',
                    ].join(' ')}
                  >
                    {/* Rank number */}
                    <div className={`flex items-center gap-1 text-sm ${getRankNumberStyle(rank)}`}>
                      {getRankIcon(rank) ?? <span>#{rank}</span>}
                    </div>

                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(creator.user_id)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden`}>
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : getInitial(creator.display_name, creator.user_id)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-white text-sm font-medium truncate block">
                          {getDisplayName(creator)}
                          {isCurrentUser && <span className="text-[#00D9FF] text-xs ml-1">(you)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Level badge pill */}
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        background: `${levelColor}22`,
                        color: levelColor,
                        border: `1px solid ${levelColor}44`,
                      }}
                    >
                      {creator.level}
                    </span>

                    {/* XP */}
                    <span className="text-[#00D9FF] font-bold text-sm tabular-nums text-right">
                      {creator.xp.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* "Your Rank" section at bottom if userId known */}
        {user?.id && userRank !== null && (
          <div className="bg-[#1A2240] border border-[#00D9FF]/20 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Your Rank</p>
              <p className="text-[#00D9FF] text-2xl font-black">#{userRank}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Global position</p>
              <p className="text-gray-300 text-sm mt-0.5">Keep earning XP to climb!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorLeaderboard;
