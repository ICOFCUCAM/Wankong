import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Star, Loader2 } from 'lucide-react';

// ── Level configuration ──────────────────────────────────────────────────────

interface LevelThreshold {
  level: string;
  minXP: number;
  color: string;
}

// Bronze=0, Silver=500, Gold=2000, Platinum=5000, Diamond=10000, GlobalAmbassador=25000
const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 'Bronze',           minXP: 0,     color: '#CD7F32' },
  { level: 'Silver',           minXP: 500,   color: '#C0C0C0' },
  { level: 'Gold',             minXP: 2000,  color: '#FFB800' },
  { level: 'Platinum',         minXP: 5000,  color: '#E5E4E2' },
  { level: 'Diamond',          minXP: 10000, color: '#00D9FF' },
  { level: 'GlobalAmbassador', minXP: 25000, color: '#9D4EDD' },
];

// XP per category action
const XP_PER_CATEGORY: Record<string, number> = {
  music_stream:         1,
  book_sale:            10,
  audiobook_play:       5,
  competition_win:      500,
  fan_vote_reward:      2,
  distribution_royalty: 20,
  translation_sale:     15,
};

const CATEGORY_ICONS: Record<string, string> = {
  music_stream:         '🎵',
  book_sale:            '📚',
  audiobook_play:       '🎧',
  competition_win:      '🏆',
  fan_vote_reward:      '❤',
  distribution_royalty: '💿',
  translation_sale:     '🌍',
};

const CATEGORY_COLORS: Record<string, string> = {
  music_stream:         '#9D4EDD',
  book_sale:            '#00D9FF',
  audiobook_play:       '#00F5A0',
  competition_win:      '#FFB800',
  fan_vote_reward:      '#FF6B00',
  distribution_royalty: '#00D9FF',
  translation_sale:     '#9D4EDD',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

interface RecentEarning {
  id: string;
  category: string;
  amount: number;
  created_at: string;
}

function getCurrentThreshold(xp: number): LevelThreshold {
  let current = LEVEL_THRESHOLDS[0];
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.minXP) current = t;
  }
  return current;
}

function getNextThreshold(current: LevelThreshold): LevelThreshold | null {
  const idx = LEVEL_THRESHOLDS.findIndex(t => t.level === current.level);
  return LEVEL_THRESHOLDS[idx + 1] ?? null;
}

function getLevelEmoji(level: string): string {
  const map: Record<string, string> = {
    Bronze: '🥉', Silver: '🥈', Gold: '🥇',
    Platinum: '💎', Diamond: '💠', GlobalAmbassador: '🌟',
  };
  return map[level] ?? '🏅';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
}

const CreatorLevelProgress: React.FC<Props> = ({ userId }) => {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState('Bronze');
  const [recentEarnings, setRecentEarnings] = useState<RecentEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const [levelRes, earningsRes] = await Promise.all([
        supabase
          .from('creator_levels')
          .select('level, xp')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('creator_earnings')
          .select('id, category, amount, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;

      if (levelRes.data) {
        setXp(levelRes.data.xp ?? 0);
        setLevel(levelRes.data.level ?? 'Bronze');
      }

      setRecentEarnings((earningsRes.data ?? []) as RecentEarning[]);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const currentThreshold = getCurrentThreshold(xp);
  const nextThreshold = getNextThreshold(currentThreshold);
  const xpInLevel = xp - currentThreshold.minXP;
  const xpNeeded = nextThreshold ? nextThreshold.minXP - currentThreshold.minXP : 1;
  const progressPct = nextThreshold ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;
  const isMaxLevel = currentThreshold.level === 'GlobalAmbassador';
  const levelColor = currentThreshold.color;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0814] text-white p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/10 flex items-center justify-center">
            <Star className="w-5 h-5 text-[#9D4EDD]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Creator Level</h1>
            <p className="text-gray-400 text-sm">Your progress and achievements</p>
          </div>
        </div>

        {/* Level card — current level name colour-coded */}
        <div className="bg-[#120C22] rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Current Level</p>
              {isMaxLevel ? (
                <span
                  className="text-2xl font-black"
                  style={{
                    background: 'linear-gradient(135deg,#9D4EDD,#FFB800,#00D9FF)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {level}
                </span>
              ) : (
                <span className="text-2xl font-black" style={{ color: levelColor }}>
                  {level}
                </span>
              )}
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
              style={{
                background: isMaxLevel
                  ? 'linear-gradient(135deg,#9D4EDD,#FFB800)'
                  : `${levelColor}22`,
                border: `2px solid ${levelColor}55`,
              }}
            >
              {getLevelEmoji(level)}
            </div>
          </div>

          {/* XP progress bar toward next level */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 font-semibold">{xp.toLocaleString()} XP</span>
              {nextThreshold ? (
                <span className="text-gray-400">→ {nextThreshold.level} ({nextThreshold.minXP.toLocaleString()} XP)</span>
              ) : (
                <span style={{ color: levelColor }} className="font-semibold">Max Level!</span>
              )}
            </div>
            <div className="h-3 bg-[#0B0814] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: isMaxLevel
                    ? 'linear-gradient(90deg,#9D4EDD,#FFB800,#00D9FF)'
                    : `linear-gradient(90deg,${levelColor}99,${levelColor})`,
                }}
              />
            </div>
            {/* XP number / XP needed */}
            {nextThreshold ? (
              <p className="text-gray-500 text-xs text-right">
                {(nextThreshold.minXP - xp).toLocaleString()} XP needed for {nextThreshold.level}
              </p>
            ) : (
              <p className="text-xs text-right" style={{ color: levelColor }}>
                You have reached the highest level!
              </p>
            )}
          </div>
        </div>

        {/* Recent XP section — last 10 creator_earnings */}
        <div className="bg-[#120C22] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FFB800]" />
            Recent XP Activity
          </h2>

          {recentEarnings.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No recent activity.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentEarnings.map(earning => {
                const icon = CATEGORY_ICONS[earning.category] ?? '💡';
                const color = CATEGORY_COLORS[earning.category] ?? '#6b7280';
                const xpEarned = XP_PER_CATEGORY[earning.category] ?? 0;
                const label = earning.category
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, c => c.toUpperCase());

                return (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between bg-[#0B0814] rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: `${color}1a` }}
                      >
                        {icon}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-200 text-sm font-medium">{label}</span>
                        <span className="text-gray-500 text-xs">
                          {timeAgo(earning.created_at)} · ${Number(earning.amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[#00D9FF] font-bold text-sm">+{xpEarned} XP</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* "How to earn XP" section — all 7 actions */}
        <div className="bg-[#120C22] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-[#00D9FF]" />
            How to Earn XP
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(XP_PER_CATEGORY).map(([cat, xpAmt]) => {
              const icon = CATEGORY_ICONS[cat] ?? '💡';
              const color = CATEGORY_COLORS[cat] ?? '#6b7280';
              const label = cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div
                  key={cat}
                  className="flex items-center justify-between bg-[#0B0814] rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: `${color}1a` }}
                    >
                      {icon}
                    </div>
                    <span className="text-gray-300 text-sm">{label}</span>
                  </div>
                  <span className="text-[#00D9FF] font-bold text-sm">+{xpAmt} XP</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level thresholds reference */}
        <div className="bg-[#120C22] rounded-2xl p-6 flex flex-col gap-3">
          <h2 className="text-white font-semibold">Level Thresholds</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LEVEL_THRESHOLDS.map(t => (
              <div
                key={t.level}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{
                  borderColor: `${t.color}${currentThreshold.level === t.level ? '99' : '33'}`,
                  background: `${t.color}11`,
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: t.color }}>{t.level}</p>
                  <p className="text-gray-500 text-xs">{t.minXP.toLocaleString()} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorLevelProgress;
