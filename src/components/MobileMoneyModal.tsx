import React, { useState } from 'react';
import { X, Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  amount:  number;   // USD amount (will be shown in local currency)
  orderId: string;
  onClose:   () => void;
  onSuccess: (ref: string) => void;
}

type Provider = 'mpesa' | 'mtn' | 'airtel';
type Stage    = 'form' | 'waiting' | 'success' | 'error';

interface ProviderConfig {
  name:     string;
  logo:     string;
  color:    string;
  prefix:   string;
  format:   string;
  currency: string;
  rate:     number;  // approximate USD → local
  hint:     string;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  mpesa: {
    name:     'M-Pesa',
    logo:     '🟢',
    color:    '#00A651',
    prefix:   '+254',
    format:   '7XX XXX XXX',
    currency: 'KES',
    rate:     130,
    hint:     'Kenya, Tanzania, Rwanda, Uganda, DRC',
  },
  mtn: {
    name:     'MTN MoMo',
    logo:     '🟡',
    color:    '#FFC700',
    prefix:   '+233',
    format:   'XX XXX XXXX',
    currency: 'GHS',
    rate:     12,
    hint:     'Ghana, Uganda, Rwanda, Cameroon, Ivory Coast',
  },
  airtel: {
    name:     'Airtel Money',
    logo:     '🔴',
    color:    '#E40613',
    prefix:   '+254',
    format:   '7XX XXX XXX',
    currency: 'KES',
    rate:     130,
    hint:     'Kenya, Uganda, Rwanda, Zambia, Malawi',
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function MobileMoneyModal({ amount, orderId, onClose, onSuccess }: Props) {
  const [provider,   setProvider]   = useState<Provider>('mpesa');
  const [phone,      setPhone]      = useState('');
  const [stage,      setStage]      = useState<Stage>('form');
  const [error,      setError]      = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [pollCount,  setPollCount]  = useState(0);

  const cfg = PROVIDERS[provider];
  const localAmount = Math.ceil(amount * cfg.rate);

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 3)  return digits;
    if (digits.length <= 6)  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  };

  const isValid = () => phone.replace(/\D/g, '').length >= 9;

  const handleRequest = async () => {
    if (!isValid()) { setError('Enter a valid phone number'); return; }
    setError('');
    setStage('waiting');

    try {
      const res = await fetch('/api/mpesa-stk-push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone:     cfg.prefix + phone.replace(/\D/g, '').replace(/^0/, ''),
          amount:    localAmount,
          orderId,
          accountRef: 'WANKONG',
        }),
      });

      const data = await res.json() as { checkoutRequestId?: string; error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Payment request failed');
      }

      setCheckoutId(data.checkoutRequestId ?? '');
      startPolling(data.checkoutRequestId ?? '');
    } catch (err: any) {
      setError(err.message);
      setStage('form');
    }
  };

  const startPolling = (id: string) => {
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      setPollCount(attempts);

      // After 2 min give up
      if (attempts > 24) {
        clearInterval(iv);
        setError('Payment timed out. Please try again or use a different method.');
        setStage('error');
        return;
      }

      try {
        const r = await fetch(`/api/mpesa-status?checkoutRequestId=${id}`);
        const d = await r.json() as { status?: string; mpesaRef?: string };
        if (d.status === 'completed') {
          clearInterval(iv);
          setStage('success');
          onSuccess(d.mpesaRef ?? id);
        } else if (d.status === 'failed') {
          clearInterval(iv);
          setError('Payment was declined or cancelled. Please try again.');
          setStage('error');
        }
      } catch { /* keep polling */ }
    }, 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0D1733] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#00D9FF]" />
            <h2 className="text-white font-bold">Mobile Money</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Amount */}
          <div className="text-center py-2">
            <p className="text-3xl font-black text-white">${amount.toFixed(2)}</p>
            <p className="text-white/40 text-sm">≈ {cfg.currency} {localAmount.toLocaleString()}</p>
          </div>

          {stage === 'success' ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-bold text-lg">Payment Confirmed!</p>
              <p className="text-white/50 text-sm mt-1">Your order is being processed.</p>
            </div>
          ) : stage === 'waiting' ? (
            <div className="text-center py-4 space-y-3">
              <Loader2 className="w-12 h-12 text-[#00D9FF] mx-auto animate-spin" />
              <p className="text-white font-semibold">Check your phone</p>
              <p className="text-white/50 text-sm">
                A payment prompt has been sent to your {cfg.name} number.<br />
                Enter your PIN to confirm.
              </p>
              <p className="text-white/20 text-xs">Waiting… ({pollCount * 5}s)</p>
            </div>
          ) : (
            <>
              {/* Provider selector */}
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2">Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(PROVIDERS) as [Provider, ProviderConfig][]).map(([key, p]) => (
                    <button key={key} onClick={() => setProvider(key)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                        provider === key
                          ? 'border-current text-white scale-[1.03]'
                          : 'border-white/10 text-white/40 hover:border-white/25'
                      }`}
                      style={provider === key ? { borderColor: p.color, color: p.color, background: `${p.color}15` } : {}}>
                      <span className="text-xl">{p.logo}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
                <p className="text-white/25 text-[10px] mt-1.5">{cfg.hint}</p>
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">Phone Number</label>
                <div className="flex items-center bg-[#0B0814] border border-white/10 rounded-xl overflow-hidden focus-within:border-[#00D9FF]/50 transition-colors">
                  <span className="px-3 text-sm font-mono text-white/50 border-r border-white/10 shrink-0">{cfg.prefix}</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    placeholder={cfg.format}
                    className="flex-1 bg-transparent px-3 py-3 text-white placeholder-white/20 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleRequest}
                disabled={!isValid()}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg,${cfg.color},${cfg.color}99)` }}
              >
                Send {cfg.name} Request — {cfg.currency} {localAmount.toLocaleString()}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
