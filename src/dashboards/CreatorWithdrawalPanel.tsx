import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Smartphone,
  Building,
} from 'lucide-react';

interface CreatorWithdrawalPanelProps {
  userId: string;
}

type PaymentMethod = 'PayPal' | 'Bank Transfer' | 'Mobile Money';

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  PayPal:          <CreditCard className="w-4 h-4" />,
  'Bank Transfer': <Building className="w-4 h-4" />,
  'Mobile Money':  <Smartphone className="w-4 h-4" />,
};

// pending=gold, approved=green, paid=cyan
const STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending:  { color: '#FFB800', icon: <Clock className="w-3.5 h-3.5" />,       label: 'Pending' },
  approved: { color: '#00F5A0', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Approved' },
  paid:     { color: '#00D9FF', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Paid' },
  rejected: { color: '#ef4444', icon: <XCircle className="w-3.5 h-3.5" />,     label: 'Rejected' },
};

const MIN_WITHDRAWAL = 10;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const CreatorWithdrawalPanel: React.FC<CreatorWithdrawalPanelProps> = ({ userId }) => {
  // Fetches creator_earnings total (sum of amount where paid=false)
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PayPal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoadingBalance(true);

    // Fetch unpaid earnings sum
    const earningsRes = await supabase
      .from('creator_earnings')
      .select('amount')
      .eq('user_id', userId)
      .eq('paid', false);

    const unpaid = (earningsRes.data ?? []).reduce(
      (sum, r) => sum + Number(r.amount), 0
    );
    setUnpaidBalance(unpaid);

    // Fetch withdrawal history — may not exist yet, handle gracefully
    try {
      const histRes = await supabase
        .from('creator_withdrawals')
        .select('id, amount, method, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setWithdrawals((histRes.data ?? []) as Withdrawal[]);
    } catch {
      setWithdrawals([]);
    }

    setLoadingBalance(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal is $${MIN_WITHDRAWAL}.`);
      return;
    }
    if (amountNum > unpaidBalance) {
      setError('Insufficient balance.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertErr } = await supabase.from('creator_withdrawals').insert({
        user_id: userId,
        amount: amountNum,
        method,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;

      setSuccessMsg(`Withdrawal of $${amountNum.toFixed(2)} submitted successfully!`);
      setAmount('');
      await fetchData();
    } catch (err: any) {
      setError(err?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-[#FFB800]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Withdrawal Panel</h1>
            <p className="text-gray-400 text-sm">Manage your earnings payout</p>
          </div>
        </div>

        {/* Available balance in gold (large) */}
        <div className="bg-[#1A2240] rounded-2xl p-6">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Available Balance</p>
          {loadingBalance ? (
            <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
          ) : (
            <p className="text-[#FFB800] text-4xl font-black">
              ${unpaidBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-1">From unpaid earnings</p>
        </div>

        {/* Withdrawal form */}
        <div className="bg-[#1A2240] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-base">Request Withdrawal</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 bg-[#00F5A0]/10 border border-[#00F5A0]/30 rounded-lg px-4 py-3 text-[#00F5A0] text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Amount — number, min=$10 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Amount (USD) — min ${MIN_WITHDRAWAL}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={MIN_WITHDRAWAL}
                  max={unpaidBalance}
                  step={0.01}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors text-sm w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => setAmount(unpaidBalance.toFixed(2))}
                className="text-[#00D9FF] text-xs font-medium self-start hover:underline"
              >
                Use max (${unpaidBalance.toFixed(2)})
              </button>
            </div>

            {/* Method — select PayPal | Bank Transfer | Mobile Money */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['PayPal', 'Bank Transfer', 'Mobile Money'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={[
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all duration-150',
                      method === m
                        ? 'bg-[#00D9FF]/10 border-[#00D9FF] text-[#00D9FF]'
                        : 'bg-[#0B0814] border-[#2d3a5a] text-gray-400 hover:border-[#00D9FF]',
                    ].join(' ')}
                  >
                    {METHOD_ICONS[m]}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingBalance || unpaidBalance < MIN_WITHDRAWAL}
              className="w-full flex items-center justify-center gap-2 bg-[#FFB800] hover:bg-[#e6a600] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0814] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
              ) : (
                <><DollarSign className="w-5 h-5" /> Request Withdrawal</>
              )}
            </button>
          </form>
        </div>

        {/* History table */}
        <div className="bg-[#1A2240] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-base">Withdrawal History</h2>

          {withdrawals.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No withdrawals yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {withdrawals.map(w => {
                const statusMeta = STATUS_STYLES[w.status] ?? STATUS_STYLES.pending;
                const mIcon = METHOD_ICONS[w.method as PaymentMethod];
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between bg-[#0B0814] rounded-xl px-4 py-3"
                  >
                    {/* date + method */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FFB800]/10 flex items-center justify-center text-[#FFB800]">
                        {mIcon ?? <CreditCard className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white text-sm font-medium">{w.method}</span>
                        <span className="text-gray-500 text-xs">{formatDate(w.created_at)}</span>
                      </div>
                    </div>
                    {/* amount + status badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[#FFB800] font-bold text-sm">
                        ${Number(w.amount).toFixed(2)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${statusMeta.color}1a`, color: statusMeta.color }}
                      >
                        {statusMeta.icon}
                        {statusMeta.label}
                      </span>
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

export default CreatorWithdrawalPanel;
