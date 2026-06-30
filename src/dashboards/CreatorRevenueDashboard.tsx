import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Loader2, TrendingUp } from 'lucide-react';

type Period = 'month' | 'quarter' | 'all';

interface Earning {
  category: string;
  amount: number;
}

interface CategoryMeta {
  label: string;
  icon: string;
  color: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  music_stream:         { label: 'Music Streams',          icon: '🎵', color: '#9D4EDD' },
  book_sale:            { label: 'Book Sales',              icon: '📚', color: '#00D9FF' },
  audiobook_play:       { label: 'Audiobook Plays',         icon: '🎧', color: '#00F5A0' },
  competition_win:      { label: 'Competition Wins',        icon: '🏆', color: '#FFB800' },
  fan_vote_reward:      { label: 'Fan Vote Rewards',        icon: '❤',  color: '#FF6B00' },
  distribution_royalty: { label: 'Distribution Royalties',  icon: '💿', color: '#00D9FF' },
  translation_sale:     { label: 'Translation Sales',       icon: '🌍', color: '#9D4EDD' },
};

const PERIOD_LABELS: Record<Period, string> = {
  month:   'This Month',
  quarter: 'This Quarter',
  all:     'All Time',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[];

function getPeriodStart(period: Period): string | null {
  const now = new Date();
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  if (period === 'quarter') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d.toISOString();
  }
  return null;
}

interface CreatorRevenueDashboardProps {
  userId: string;
}

const CreatorRevenueDashboard: React.FC<CreatorRevenueDashboardProps> = ({ userId }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      let query = supabase
        .from('creator_earnings')
        .select('category, amount')
        .eq('user_id', userId);

      const since = getPeriodStart(period);
      if (since) query = query.gte('created_at', since);

      const { data, error: fetchErr } = await query;
      if (cancelled) return;

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }

      // Group by category, ensure all 7 appear
      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        grouped[row.category] = (grouped[row.category] ?? 0) + Number(row.amount);
      }

      const result: Earning[] = ALL_CATEGORIES.map(cat => ({
        category: cat,
        amount: grouped[cat] ?? 0,
      }));

      // Include any unknown categories
      for (const [cat, amt] of Object.entries(grouped)) {
        if (!CATEGORY_META[cat]) result.push({ category: cat, amount: amt });
      }

      result.sort((a, b) => b.amount - a.amount);
      setEarnings(result);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, period]);

  const total = earnings.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-[#0B0814] text-white p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#FFB800]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
              <p className="text-gray-400 text-sm">Track your creator earnings</p>
            </div>
          </div>

          {/* Period tabs: 'month' | 'quarter' | 'all' */}
          <div className="flex gap-1 bg-[#120C22] rounded-xl p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  period === p
                    ? 'bg-[#FFB800] text-[#0B0814]'
                    : 'text-gray-400 hover:text-white',
                ].join(' ')}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Total earnings card — large gold text */}
        <div className="bg-[#120C22] rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">Total Earnings</p>
            <p className="text-[#FFB800] text-5xl font-bold mt-1 tracking-tight">
              ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-gray-500 text-xs mt-1">{PERIOD_LABELS[period]}</p>
          </div>
          <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-[#FFB800]/10 items-center justify-center">
            <TrendingUp className="w-8 h-8 text-[#FFB800]" />
          </div>
        </div>

        {/* 7 category rows */}
        <div className="bg-[#120C22] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-base">Earnings by Category</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-sm py-4">{error}</div>
          ) : (
            <div className="flex flex-col gap-4">
              {earnings.map(({ category, amount }) => {
                const meta = CATEGORY_META[category] ?? {
                  label: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  icon: '💵',
                  color: '#6b7280',
                };
                const pct = total > 0 ? (amount / total) * 100 : 0;

                return (
                  <div key={category} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                      {/* Icon + label */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base"
                          style={{ background: `${meta.color}1a` }}
                        >
                          {meta.icon}
                        </div>
                        <span className="text-gray-200 text-sm font-medium truncate">
                          {meta.label}
                        </span>
                      </div>
                      {/* Amount + % */}
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[#FFB800] font-bold text-sm">
                          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-gray-500 text-xs">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    {/* CSS width % bar */}
                    <div className="h-1.5 bg-[#0B0814] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorRevenueDashboard;
