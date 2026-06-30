import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transaction {
  id:          string;
  type:        string;
  description: string;
  amount:      number;
  status:      string;
  created_at:  string;
}

interface Balances {
  available:     number;
  pending:       number;
  subscriptions: number;
  distributions: number;
  tips:          number;
  competitions:  number;
}

const ZERO: Balances = {
  available: 0, pending: 0, subscriptions: 0,
  distributions: 0, tips: 0, competitions: 0,
};

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function relDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WalletView() {
  const { user } = useAuth();
  const [balances,        setBalances]        = useState<Balances>(ZERO);
  const [transactions,    setTransactions]    = useState<Transaction[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [txFilter,        setTxFilter]        = useState('all');
  const [withdrawMethod,  setWithdrawMethod]  = useState<'stripe' | 'mpesa' | 'mtn' | 'paystack'>('stripe');
  const [withdrawAmount,  setWithdrawAmount]  = useState('');
  const [phoneNumber,     setPhoneNumber]     = useState('');
  const [showWithdraw,    setShowWithdraw]    = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawing,     setWithdrawing]     = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData(user.id);
  }, [user]);

  const loadData = async (uid: string) => {
    setLoading(true);

    // Fetch earnings + withdrawal history in parallel
    const [txRes, withdrawRes, balRes] = await Promise.all([
      supabase
        .from('creator_earnings')
        .select('id, category, description, amount, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('creator_withdrawals')
        .select('id, amount, description, method, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('creator_balances')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle(),
    ]);

    // Map earnings (amounts stored as numeric dollars → convert to cents for display)
    const earnings: Transaction[] = (txRes.data ?? []).map((r: any) => ({
      id:          r.id,
      type:        r.category ?? 'royalty',
      description: r.description ?? 'Earnings',
      amount:      Math.round((r.amount ?? 0) * 100),
      status:      'completed',
      created_at:  r.created_at,
    }));

    // Map withdrawals (amount stored as numeric dollars, show as negative)
    const withdrawals: Transaction[] = (withdrawRes.data ?? []).map((r: any) => ({
      id:          r.id,
      type:        'payout',
      description: r.description ?? `Withdrawal via ${r.method ?? 'Unknown'}`,
      amount:      -Math.round((r.amount ?? 0) * 100),
      status:      r.status ?? 'pending',
      created_at:  r.created_at,
    }));

    // Merge and sort by date descending
    const txList: Transaction[] = [...earnings, ...withdrawals]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);

    // Build balances from fetched row or derive from transactions
    if (balRes.data) {
      setBalances({
        available:     balRes.data.available_cents    ?? 0,
        pending:       balRes.data.pending_cents      ?? 0,
        subscriptions: balRes.data.subscriptions_cents ?? 0,
        distributions: balRes.data.distributions_cents ?? 0,
        tips:          balRes.data.tips_cents         ?? 0,
        competitions:  balRes.data.competitions_cents ?? 0,
      });
    } else {
      // Derive from transactions
      const completed = txList.filter(t => t.status === 'completed');
      const pending   = txList.filter(t => t.status === 'pending');
      const derived: Balances = { ...ZERO };
      derived.available = completed.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);
      derived.pending   = pending.reduce(  (s, t) => s + (t.amount > 0 ? t.amount : 0), 0);
      for (const t of completed) {
        if (t.type === 'subscription')        derived.subscriptions += t.amount > 0 ? t.amount : 0;
        else if (t.type === 'distribution')   derived.distributions += t.amount > 0 ? t.amount : 0;
        else if (t.type === 'tip')            derived.tips          += t.amount > 0 ? t.amount : 0;
        else if (t.type === 'competition')    derived.competitions  += t.amount > 0 ? t.amount : 0;
      }
      setBalances(derived);
    }

    setLoading(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setWithdrawing(true);
    const amountCents = Math.round(parseFloat(withdrawAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) { setWithdrawing(false); return; }

    // Record withdrawal request in the dedicated withdrawals table
    const methodLabel =
      withdrawMethod === 'stripe'  ? 'Stripe' :
      withdrawMethod === 'mpesa'   ? 'Mobile Money' :
      withdrawMethod === 'mtn'     ? 'Mobile Money' : 'Bank Transfer';
    await supabase.from('creator_withdrawals').insert([{
      user_id:     user.id,
      amount:      amountCents / 100,
      description: `Withdrawal via ${withdrawMethod.toUpperCase()}`,
      status:      'pending',
      method:      methodLabel,
      phone:       phoneNumber || null,
    }]);

    setWithdrawing(false);
    setWithdrawSuccess(true);
    setTimeout(() => {
      setWithdrawSuccess(false);
      setShowWithdraw(false);
      setWithdrawAmount('');
      setPhoneNumber('');
      if (user) loadData(user.id);
    }, 2500);
  };

  const filtered = txFilter === 'all'
    ? transactions
    : transactions.filter(t => t.type === txFilter);

  const totalBalance = balances.available + balances.pending;

  const balanceCards = [
    { label: 'Available Balance', value: balances.available,     color: 'emerald' },
    { label: 'Pending',           value: balances.pending,       color: 'amber'   },
    { label: 'Subscriptions',     value: balances.subscriptions, color: 'indigo'  },
    { label: 'Distributions',     value: balances.distributions, color: 'blue'    },
    { label: 'Tips',              value: balances.tips,          color: 'pink'    },
    { label: 'Competition Rewards', value: balances.competitions, color: 'purple' },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20'   },
    indigo:  { bg: 'bg-[#9D4EDD]/10',  text: 'text-[#B794F4]',  border: 'border-[#9D4EDD]/20'  },
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20'    },
    pink:    { bg: 'bg-pink-500/10',    text: 'text-pink-400',    border: 'border-pink-500/20'    },
    purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20'  },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          <p className="text-gray-400 mt-1">Manage your earnings and payouts</p>
        </div>
        <button
          onClick={() => setShowWithdraw(true)}
          className="bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Withdraw
        </button>
      </div>

      {/* Total balance hero */}
      <div className="bg-gradient-to-br from-[#9D4EDD] to-purple-700 rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80 mb-1">Total Balance</p>
        {loading ? (
          <div className="h-10 w-40 bg-white/20 rounded animate-pulse" />
        ) : (
          <p className="text-4xl font-bold">{fmt(totalBalance)}</p>
        )}
        <p className="text-sm opacity-60 mt-2">Across all income streams</p>
      </div>

      {/* Balance breakdown cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {balanceCards.map(card => {
            const c = colorMap[card.color];
            return (
              <div key={card.label} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
                <p className="text-xs text-gray-400 mb-1">{card.label}</p>
                <p className={`text-lg font-bold ${c.text}`}>{fmt(card.value)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Withdraw modal */}
      {showWithdraw && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowWithdraw(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Withdraw Funds</h3>
            {withdrawSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium">Withdrawal Requested!</p>
                <p className="text-sm text-gray-400 mt-1">Processing in 1–3 business days</p>
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'stripe'   as const, label: 'Stripe',    desc: 'Bank Transfer' },
                      { id: 'mpesa'    as const, label: 'M-Pesa',    desc: 'Kenya'         },
                      { id: 'mtn'      as const, label: 'MTN MoMo',  desc: 'West Africa'   },
                      { id: 'paystack' as const, label: 'Paystack',  desc: 'Nigeria'       },
                    ]).map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setWithdrawMethod(m.id)}
                        className={`p-3 rounded-xl text-left transition-all ${
                          withdrawMethod === m.id
                            ? 'bg-[#9D4EDD]/20 border-[#9D4EDD] border'
                            : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Available: {fmt(balances.available)}</p>
                </div>
                {(withdrawMethod === 'mpesa' || withdrawMethod === 'mtn') && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="+254 7XX XXX XXX"
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="flex-1 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {withdrawing ? 'Processing…' : 'Withdraw'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Transaction History</h3>
          <div className="flex items-center gap-2 overflow-x-auto">
            {['all', 'subscription', 'tip', 'royalty', 'distribution', 'payout', 'competition'].map(f => (
              <button
                key={f}
                onClick={() => setTxFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  txFilter === f
                    ? 'bg-[#9D4EDD] text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-2.5 bg-white/5 rounded w-1/3" />
                </div>
                <div className="w-16 h-4 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {txFilter === 'all' ? 'No transactions yet.' : `No ${txFilter} transactions found.`}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    <svg className={`w-5 h-5 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d={tx.amount > 0 ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.description}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {tx.type.replace('_', ' ')} · {relDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{fmt(tx.amount)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tx.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
