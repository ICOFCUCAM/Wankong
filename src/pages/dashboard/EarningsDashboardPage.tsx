import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { startEarningsListener } from '@/pipelines/levels/LevelUpgradeWorker';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, DollarSign } from 'lucide-react';

const PAYOUT_THRESHOLD = 10; // minimum $10 to request first withdrawal

// ── Types ────────────────────────────────────────────────────────────────────

interface Earning {
  id: string;
  category: string;
  amount: number;
  period: string;
  paid: boolean;
  created_at: string;
}

interface CreatorLevel {
  level: string;
  xp: number;
}

type Period = 'month' | 'quarter' | 'all';

const CATEGORY_LABELS: Record<string, string> = {
  music_stream:         'Music Streams',
  book_sale:            'Book Sales',
  audiobook_play:       'Audiobook Plays',
  competition_win:      'Competition Wins',
  fan_vote_reward:      'Fan Vote Rewards',
  distribution_royalty: 'Distribution Royalties',
  translation_sale:     'Translation Sales',
};

const CATEGORY_ICONS: Record<string, string> = {
  music_stream: '🎵', book_sale: '📚', audiobook_play: '🎧',
  competition_win: '🏆', fan_vote_reward: '❤', distribution_royalty: '💿', translation_sale: '🌍',
};

const CATEGORY_COLORS: Record<string, string> = {
  music_stream: '#9D4EDD', book_sale: '#00D9FF', audiobook_play: '#00F5A0',
  competition_win: '#FFB800', fan_vote_reward: '#FF6B00', distribution_royalty: '#00D9FF', translation_sale: '#9D4EDD',
};

// Level thresholds for XP bar
const LEVEL_THRESHOLDS: { level: string; minXP: number; color: string }[] = [
  { level: 'Bronze',           minXP: 0,     color: '#CD7F32' },
  { level: 'Silver',           minXP: 500,   color: '#C0C0C0' },
  { level: 'Gold',             minXP: 2000,  color: '#FFB800' },
  { level: 'Platinum',         minXP: 5000,  color: '#E5E4E2' },
  { level: 'Diamond',          minXP: 10000, color: '#00D9FF' },
  { level: 'GlobalAmbassador', minXP: 25000, color: '#9D4EDD' },
];

function getLevelColor(level: string): string {
  return LEVEL_THRESHOLDS.find(t => t.level === level)?.color ?? '#CD7F32';
}

function getNextThresholdXP(xp: number): number {
  for (const t of LEVEL_THRESHOLDS) {
    if (xp < t.minXP) return t.minXP;
  }
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].minXP;
}

function getCurrentThresholdXP(xp: number): number {
  let min = 0;
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.minXP) min = t.minXP;
  }
  return min;
}

// ── Withdrawal Modal ──────────────────────────────────────────────────────────

interface WithdrawalModalProps {
  userId: string;
  maxAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

function WithdrawalModal({ userId, maxAmount, onClose, onSuccess }: WithdrawalModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('PayPal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError('Enter a valid amount.'); return; }
    if (num > maxAmount) { setError(`Maximum withdrawal is $${maxAmount.toFixed(2)}.`); return; }
    if (num < 10) { setError('Minimum withdrawal is $10.'); return; }

    setSubmitting(true);
    setError('');

    const { error: insertErr } = await supabase.from('creator_withdrawals').insert({
      user_id: userId,
      amount: num,
      method,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (insertErr) { setError(insertErr.message); return; }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0B0814] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Request Withdrawal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Amount (USD) — min $10</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="10"
                step="0.01"
                max={maxAmount}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FFB800]/50"
                placeholder="0.00"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Available: <span className="text-[#FFB800]">${maxAmount.toFixed(2)}</span></p>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Payout Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FFB800]/50"
            >
              {['PayPal', 'Bank Transfer', 'Mobile Money'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl font-semibold disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Submit Withdrawal Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EarningsDashboardPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [creatorLevel, setCreatorLevel] = useState<CreatorLevel | null>(null);
  const [withdrawals, setWithdrawals] = useState<{ id: string; amount: number; method: string; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  // Period state: 'month' | 'quarter' | 'all'
  const [period, setPeriod] = useState<Period>('month');
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  // Get user via supabase.auth.getUser() — redirect to '/' if not logged in
  useEffect(() => {
    let unsubscribeEarnings: (() => void) | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/'); return; }
      setUserId(user.id);

      // Wire real-time listener: auto-awards XP whenever a new earnings row is inserted
      unsubscribeEarnings = startEarningsListener(user.id);

      Promise.all([
        supabase
          .from('creator_earnings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        // Current level: fetches from creator_levels
        supabase
          .from('creator_levels')
          .select('level, xp')
          .eq('user_id', user.id)
          .maybeSingle(),
        // Withdrawal history
        supabase
          .from('creator_withdrawals')
          .select('id, amount, method, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]).then(([earningsRes, levelRes, withdrawalsRes]) => {
        setEarnings((earningsRes.data ?? []) as Earning[]);
        setCreatorLevel(levelRes.data as CreatorLevel | null);
        setWithdrawals((withdrawalsRes.data ?? []) as any[]);
        setLoading(false);
      });
    });

    return () => { unsubscribeEarnings?.(); };
  }, [navigate]);

  // Filter earnings by period
  const filteredEarnings = earnings.filter(e => {
    if (period === 'all') return true;
    const eDate = new Date(e.created_at);
    const now = new Date();
    if (period === 'month') {
      return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
    }
    if (period === 'quarter') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return eDate >= threeMonthsAgo;
    }
    return true;
  });

  const totalFiltered = filteredEarnings.reduce((s, e) => s + Number(e.amount), 0);
  const allTimeTotal = earnings.reduce((s, e) => s + Number(e.amount), 0);

  // Category breakdown bars
  const earningsByCategory = filteredEarnings.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const maxBar = Math.max(...Object.values(earningsByCategory), 1);

  // XP bar
  const xp = creatorLevel?.xp ?? 0;
  const levelColor = getLevelColor(creatorLevel?.level ?? 'Bronze');
  const currentMin = getCurrentThresholdXP(xp);
  const nextMin = getNextThresholdXP(xp);
  const xpPct = nextMin > currentMin ? Math.min(((xp - currentMin) / (nextMin - currentMin)) * 100, 100) : 100;

  const PERIODS: { id: Period; label: string }[] = [
    { id: 'month',   label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'all',     label: 'All Time' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFB800] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      {showWithdrawal && userId && (
        <WithdrawalModal
          userId={userId}
          maxAmount={allTimeTotal}
          onClose={() => setShowWithdrawal(false)}
          onSuccess={() => {
            setShowWithdrawal(false);
            setWithdrawalSuccess(true);
            // Refresh withdrawal list
            if (userId) {
              supabase.from('creator_withdrawals')
                .select('id, amount, method, status, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20)
                .then(({ data }) => setWithdrawals((data ?? []) as any[]));
            }
          }}
        />
      )}

      {withdrawalSuccess && (
        <div className="fixed bottom-6 right-6 z-40 bg-[#00F5A0]/10 border border-[#00F5A0]/30 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-[#00F5A0] text-xl">✓</span>
          <div>
            <p className="text-white font-medium text-sm">Withdrawal submitted!</p>
            <p className="text-gray-400 text-xs">We'll process it within 2–5 business days.</p>
          </div>
          <button onClick={() => setWithdrawalSuccess(false)} className="text-gray-500 hover:text-white ml-2">&times;</button>
        </div>
      )}

      {/* Hero — large gold total earnings number */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#100D2E] to-[#0B0814] border-b border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB800] to-[#FF6B00] flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#FFB800] text-sm font-medium uppercase tracking-widest">Earnings Dashboard</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Earnings</p>
              {/* Large gold total earnings number */}
              <p className="text-5xl font-black text-[#FFB800]">${allTimeTotal.toFixed(2)}</p>
              <p className="text-gray-500 text-sm mt-1">All time · USD</p>
            </div>
            {/* Withdrawal modal trigger button */}
            <button
              onClick={() => setShowWithdrawal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              <DollarSign className="w-5 h-5" />
              Withdraw Funds
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 space-y-10">

        {/* Current level — badge + XP bar */}
        {creatorLevel && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Creator Level</p>
                <span
                  className="text-xl font-black"
                  style={{ color: levelColor }}
                >
                  {creatorLevel.level}
                </span>
                <span className="text-gray-400 text-sm ml-3">{xp.toLocaleString()} XP</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Next level at</p>
                <p className="text-white font-bold">{nextMin.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%`, background: `linear-gradient(90deg, ${levelColor}99, ${levelColor})` }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1.5">{xp.toLocaleString()} / {nextMin.toLocaleString()} XP</p>
          </div>
        )}

        {/* Payout Threshold / Withdrawal Eligibility */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Withdrawal Eligibility</p>
              <p className="text-sm text-white font-medium">
                Minimum balance required:{' '}
                <span className="text-[#FFB800]">${PAYOUT_THRESHOLD.toFixed(2)}</span>
              </p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                allTimeTotal >= PAYOUT_THRESHOLD
                  ? 'text-[#00F5A0] border-[#00F5A0]/30 bg-[#00F5A0]/10'
                  : 'text-[#FFB800] border-[#FFB800]/30 bg-[#FFB800]/10'
              }`}
            >
              {allTimeTotal >= PAYOUT_THRESHOLD ? 'Ready to Withdraw' : 'Awaiting Threshold'}
            </span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((allTimeTotal / PAYOUT_THRESHOLD) * 100, 100)}%`,
                background:
                  allTimeTotal >= PAYOUT_THRESHOLD
                    ? 'linear-gradient(90deg, #00F5A0, #00D9FF)'
                    : 'linear-gradient(90deg, #FFB800, #FF6B00)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>${allTimeTotal.toFixed(2)} earned</span>
            <span>
              {allTimeTotal >= PAYOUT_THRESHOLD
                ? 'Threshold reached ✓'
                : `$${(PAYOUT_THRESHOLD - allTimeTotal).toFixed(2)} to go`}
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  period === p.id
                    ? 'bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="text-center mb-8 py-5 bg-white/3 border border-white/5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">{PERIODS.find(p => p.id === period)?.label} Earnings</p>
            <p className="text-3xl font-black text-[#FFB800]">${totalFiltered.toFixed(2)}</p>
          </div>

          {/* Category breakdown bars */}
          <h2 className="text-lg font-bold text-white mb-5">Breakdown by Category</h2>
          {Object.keys(earningsByCategory).length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white/3 border border-white/5 rounded-2xl">
              No earnings for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(earningsByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const pct = (amount / maxBar) * 100;
                  const color = CATEGORY_COLORS[cat] ?? '#6b7280';
                  const icon = CATEGORY_ICONS[cat] ?? '💵';
                  return (
                    <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span>{icon}</span>
                        <div className="flex items-center justify-between flex-1">
                          <span className="text-sm text-white font-medium">{CATEGORY_LABELS[cat] ?? cat}</span>
                          <span className="text-[#FFB800] font-bold text-sm">${Number(amount).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Recent transactions: date, category icon, amount */}
        {filteredEarnings.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-5">Recent Transactions</h2>
            <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 font-medium py-4 px-5">Date</th>
                    <th className="text-left text-gray-400 font-medium py-4 px-5">Category</th>
                    <th className="text-left text-gray-400 font-medium py-4 px-5">Status</th>
                    <th className="text-right text-gray-400 font-medium py-4 px-5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEarnings.slice(0, 20).map(e => (
                    <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      <td className="py-3.5 px-5 text-gray-300">
                        {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-5 text-gray-300">
                        <span className="mr-1.5">{CATEGORY_ICONS[e.category] ?? '💵'}</span>
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          e.paid
                            ? 'text-[#00F5A0] border-[#00F5A0]/30 bg-[#00F5A0]/10'
                            : 'text-[#FFB800] border-[#FFB800]/30 bg-[#FFB800]/10'
                        }`}>
                          {e.paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-[#FFB800]">
                        ${Number(e.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-5">Withdrawal Requests</h2>
            <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 px-5 text-left text-gray-500 font-medium">Date</th>
                    <th className="py-3 px-5 text-left text-gray-500 font-medium">Method</th>
                    <th className="py-3 px-5 text-left text-gray-500 font-medium">Status</th>
                    <th className="py-3 px-5 text-right text-gray-500 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {withdrawals.map(w => {
                    const statusColor = w.status === 'paid' ? 'text-[#00F5A0] border-[#00F5A0]/30 bg-[#00F5A0]/10'
                      : w.status === 'approved' || w.status === 'processing' ? 'text-[#00D9FF] border-[#00D9FF]/30 bg-[#00D9FF]/10'
                      : w.status === 'rejected' ? 'text-red-400 border-red-400/30 bg-red-400/10'
                      : 'text-[#FFB800] border-[#FFB800]/30 bg-[#FFB800]/10';
                    return (
                      <tr key={w.id} className="hover:bg-white/3 transition-colors">
                        <td className="py-3.5 px-5 text-gray-400">
                          {new Date(w.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-5 text-gray-300">{w.method}</td>
                        <td className="py-3.5 px-5">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${statusColor}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-[#FFB800]">
                          ${Number(w.amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
