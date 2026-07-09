import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthorEarningsPanelProps {
  userId: string;
}

type EarningCategory =
  | 'book_sale'
  | 'audiobook_play'
  | 'translation_sale'
  | 'fan_vote_reward';

interface EarningRow {
  id: string;
  category: string;
  amount: number;
  period: string;
  paid: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TRACKED_CATEGORIES: {
  key: EarningCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}[] = [
  {
    key: 'book_sale',
    label: 'Book Sales',
    icon: '📚',
    color: '#00D9FF',
    bgColor: 'rgba(0, 217, 255, 0.15)',
  },
  {
    key: 'audiobook_play',
    label: 'Audiobook Plays',
    icon: '🎧',
    color: '#9D4EDD',
    bgColor: 'rgba(157, 78, 221, 0.15)',
  },
  {
    key: 'translation_sale',
    label: 'Translation Sales',
    icon: '🌍',
    color: '#00F5A0',
    bgColor: 'rgba(0, 245, 160, 0.15)',
  },
  {
    key: 'fan_vote_reward',
    label: 'Fan Vote Rewards',
    icon: '❤',
    color: '#FFB800',
    bgColor: 'rgba(255, 184, 0, 0.15)',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ── Component ──────────────────────────────────────────────────────────────

export function AuthorEarningsPanel({ userId }: AuthorEarningsPanelProps) {
  const [rows, setRows] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError('');

    supabase
      .from('creator_earnings')
      .select('id, category, amount, period, paid')
      .eq('user_id', userId)
      .then(({ data, error: dbErr }) => {
        if (dbErr) {
          setError(dbErr.message);
        } else {
          setRows((data ?? []) as EarningRow[]);
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Aggregate totals per tracked category
  const categoryTotals: Record<EarningCategory, number> = {
    book_sale: 0,
    audiobook_play: 0,
    translation_sale: 0,
    fan_vote_reward: 0,
  };

  for (const row of rows) {
    if (row.category in categoryTotals) {
      categoryTotals[row.category as EarningCategory] += row.amount;
    }
  }

  const totalEarnings = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const maxCategoryValue = Math.max(...Object.values(categoryTotals), 1);

  // Group by period for the period table
  const periodMap = new Map<string, number>();
  for (const row of rows) {
    periodMap.set(row.period, (periodMap.get(row.period) ?? 0) + row.amount);
  }
  const periods = Array.from(periodMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6);

  if (loading) {
    return (
      <div className="bg-[#0B0814] rounded-2xl border border-white/10 p-8 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#00D9FF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0B0814] rounded-2xl border border-red-500/20 p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0814] rounded-2xl border border-white/10 overflow-hidden space-y-0">
      {/* ── Total earnings hero ── */}
      <div className="bg-gradient-to-r from-[#FFB800]/15 to-[#FF6B00]/10 border-b border-white/10 px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFB800]/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-[#FFB800]" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Total Earnings
            </p>
            <p className="text-2xl font-bold text-[#FFB800] leading-tight">
              {formatCurrency(totalEarnings)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{rows.length} records</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {rows.filter((r) => r.paid).length} paid
          </p>
        </div>
      </div>

      {/* ── Category bar chart ── */}
      <div className="px-6 py-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <DollarSign size={15} className="text-[#00D9FF]" />
          Earnings by Category
        </h3>

        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No earnings recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {TRACKED_CATEGORIES.map(({ key, label, icon, color, bgColor }) => {
              const amount = categoryTotals[key];
              const widthPct =
                maxCategoryValue > 0
                  ? Math.max(2, (amount / maxCategoryValue) * 100)
                  : 2;

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-300 flex items-center gap-1.5">
                      <span aria-hidden="true">{icon}</span>
                      {label}
                    </span>
                    <span className="font-bold" style={{ color }}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  {/* Bar track */}
                  <div className="h-2.5 bg-white/6 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}55`,
                      }}
                    />
                  </div>
                  {/* Percentage label */}
                  <p className="text-[10px] text-gray-600">
                    {totalEarnings > 0
                      ? `${((amount / totalEarnings) * 100).toFixed(1)}% of total`
                      : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Period breakdown ── */}
      {periods.length > 0 && (
        <div className="border-t border-white/10 px-6 py-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Recent Periods</h3>
          <div className="space-y-2">
            {periods.map(([period, amount]) => {
              const barPct =
                periods.length > 0
                  ? Math.max(
                      4,
                      (amount / Math.max(...periods.map(([, v]) => v))) * 100,
                    )
                  : 4;

              return (
                <div key={period} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{period}</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] transition-all duration-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="border-t border-white/10 px-6 py-4">
        <div className="flex flex-wrap gap-3">
          {TRACKED_CATEGORIES.map(({ key, label, icon, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-400">
                <span aria-hidden="true">{icon}</span> {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuthorEarningsPanel;
