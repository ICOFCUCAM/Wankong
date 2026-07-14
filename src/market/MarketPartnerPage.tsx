import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import { Reveal, Magnetic } from './motion';
import { toast } from 'sonner';
import {
  Link2, MousePointerClick, TrendingUp, Wallet, Copy, Check, Loader2,
  Sparkles, Globe, ShieldCheck, Clock, ArrowRight,
} from 'lucide-react';

interface Partner { id: string; code: string; display_name: string | null; payout_email: string | null; status: string; default_commission_bps: number }
interface Stats { clicks: number; conversions: number; earnings_cents: number; pending_cents: number }

const money = (c: number) => `$${((c ?? 0) / 100).toFixed(2)}`;
const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://smartkong.net');

// SmartKong Partner Program — one affiliate account to promote ANY product from
// any store, with a personal tracked link and live earnings.
export default function MarketPartnerPage() {
  const { user, loading: authLoading } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [payout, setPayout] = useState('');
  const [applying, setApplying] = useState(false);
  const [target, setTarget] = useState('');
  const [copied, setCopied] = useState('');
  const [forecast, setForecast] = useState<{ title: string; price: number } | null>(null);
  const [balance, setBalance] = useState(0);
  const [promos, setPromos] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newDisc, setNewDisc] = useState('10');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('my_partner');
    const row = Array.isArray(data) ? data[0] : data;
    setPartner(row ?? null);
    if (row?.status === 'approved') {
      const [s, b, pc, po] = await Promise.all([
        supabase.rpc('my_partner_stats'),
        supabase.rpc('partner_balance'),
        supabase.rpc('my_promo_codes'),
        supabase.rpc('my_payouts'),
      ]);
      setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
      setBalance(typeof b.data === 'number' ? b.data : 0);
      setPromos(pc.data ?? []);
      setPayouts(po.data ?? []);
    }
    setLoading(false);
  }, []);

  const createCode = async () => {
    if (newCode.trim().length < 3) { toast.error('Code must be at least 3 characters'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('create_promo_code', { p_code: newCode.trim(), p_discount_bps: Math.round(Number(newDisc || 0) * 100) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Promo code created'); setNewCode(''); load();
  };

  const withdraw = async () => {
    if (balance <= 0) { toast.info('No balance to withdraw yet.'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('request_payout', { p_method: 'wallet' });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Withdrawal requested'); load();
  };

  useEffect(() => { if (user) load(); else if (!authLoading) setLoading(false); }, [user, authLoading, load]);

  // Commission forecast: resolve the target product and estimate earnings per sale.
  useEffect(() => {
    const handle = target.trim().replace(/^.*\/products\//, '').replace(/^\//, '');
    if (!handle || /^https?:/i.test(target.trim())) { setForecast(null); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('ecom_products')
        .select('title, price').eq('status', 'active').eq('handle', handle).maybeSingle();
      setForecast(data ? { title: data.title, price: (data.price ?? 0) / 100 } : null);
    }, 350);
    return () => clearTimeout(t);
  }, [target]);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    const { error } = await supabase.rpc('become_affiliate', { p_display_name: name, p_payout_email: payout || user?.email });
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Application submitted — we’ll review it shortly.');
    load();
  };

  const link = (t: string) => {
    const clean = t.trim().replace(/^.*\/products\//, '').replace(/^\//, '');
    return `${origin()}/r/${partner?.code}${clean ? `?to=${encodeURIComponent(clean)}` : ''}`;
  };
  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => { setCopied(key); toast.success('Link copied'); setTimeout(() => setCopied(''), 1500); });
  };

  // ── States ──────────────────────────────────────────────────────────────
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <MarketLayout><Seo title="Partner Program" description="Promote any product from any store and earn — SmartKong's universal affiliate program." /><div className="max-w-5xl mx-auto px-4 lg:px-8 py-12">{children}</div></MarketLayout>
  );

  if (loading || authLoading) return <Shell><div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div></Shell>;

  // Not signed in OR not yet a partner → the pitch + apply
  if (!partner) {
    return (
      <Shell>
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="sk-eyebrow justify-center mb-4">SmartKong Partner Program</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[0.98] text-[var(--sk-ink)]">
            Promote anything. <span className="sk-serif sk-aurora-text">Earn everywhere.</span>
          </h1>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed">
            One affiliate account for every store on Earth. Share a link to any product — SmartKong tracks the click, attributes the sale and pays your commission.
          </p>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-3 gap-5">
          {[
            { Icon: Globe, k: 'Any product, any store', v: 'Link a product from thousands of merchants — one account covers them all.' },
            { Icon: TrendingUp, k: 'Live earnings', v: 'Clicks, conversions and commission tracked in real time on your dashboard.' },
            { Icon: ShieldCheck, k: 'Reliable payouts', v: 'Commission is attributed on a 30-day window and paid to your account.' },
          ].map(b => (
            <div key={b.k} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-violet-500/25" style={{ background: 'var(--sk-aurora)' }}><b.Icon className="w-5 h-5" /></div>
              <p className="font-bold text-gray-900">{b.k}</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{b.v}</p>
            </div>
          ))}
        </div>

        {!user ? (
          <div className="mt-10 text-center">
            <Link to="/auth/login" className="inline-block px-7 py-3.5 rounded-xl text-white font-bold shadow-lg shadow-violet-500/25" style={{ background: 'var(--sk-aurora)' }}>Sign in to apply</Link>
          </div>
        ) : (
          <form onSubmit={apply} className="mt-10 max-w-lg mx-auto rounded-2xl border border-gray-200 bg-white p-6">
            <p className="font-bold text-gray-900 mb-4">Apply to become a partner</p>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Display name / brand</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Techie Reviews" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payout email</label>
            <input type="email" value={payout} onChange={e => setPayout(e.target.value)} placeholder={user.email ?? 'you@email.com'} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <Magnetic className="w-full block">
              <button type="submit" disabled={applying} className="w-full py-3.5 rounded-xl text-white font-bold shadow-lg shadow-violet-500/25 disabled:opacity-50" style={{ background: 'var(--sk-aurora)' }}>
                {applying ? 'Submitting…' : 'Apply now'}
              </button>
            </Magnetic>
          </form>
        )}
      </Shell>
    );
  }

  if (partner.status !== 'approved') {
    const pending = partner.status === 'pending';
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-16">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${pending ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
            {pending ? <Clock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-black text-gray-900">{pending ? 'Application under review' : `Application ${partner.status}`}</h1>
          <p className="text-gray-500 mt-2">{pending ? 'We’re reviewing your partner application — you’ll be able to generate links as soon as it’s approved.' : 'Reach out to support if you think this is a mistake.'}</p>
          <Link to="/shop" className="inline-block mt-6 px-6 py-3 rounded-xl border border-gray-300 hover:border-blue-500 hover:text-blue-600 font-semibold text-gray-700 transition-colors">Keep shopping</Link>
        </div>
      </Shell>
    );
  }

  // ── Approved: the partner dashboard ───────────────────────────────────────
  const rate = (partner.default_commission_bps / 100).toFixed(partner.default_commission_bps % 100 ? 2 : 0);
  const baseLink = link('');
  const genLink = link(target);
  const epc = stats && stats.clicks > 0 ? (stats.earnings_cents / 100 / stats.clicks) : 0;

  return (
    <Shell>
      <Reveal>
        <span className="sk-eyebrow mb-2">Partner dashboard</span>
        <h1 className="text-3xl md:text-4xl font-black tracking-[-0.02em] text-gray-900">Your links, <span className="sk-serif sk-aurora-text pr-1">your earnings.</span></h1>
        <p className="text-sm text-gray-500 mt-1">Commission rate <b className="text-gray-700">{rate}%</b> · referral code <b className="text-gray-700">{partner.code}</b></p>
      </Reveal>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { Icon: MousePointerClick, l: 'Clicks', v: String(stats?.clicks ?? 0), t: 'bg-blue-50 text-blue-600' },
          { Icon: TrendingUp, l: 'Conversions', v: String(stats?.conversions ?? 0), t: 'bg-violet-50 text-violet-600' },
          { Icon: Wallet, l: 'Earned', v: money(stats?.earnings_cents ?? 0), t: 'bg-emerald-50 text-emerald-600' },
          { Icon: Sparkles, l: 'EPC', v: `$${epc.toFixed(2)}`, t: 'bg-amber-50 text-amber-600' },
        ].map(s => (
          <div key={s.l} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.t}`}><s.Icon className="w-5 h-5" /></div>
            <p className="text-2xl font-black tracking-tight text-gray-900">{s.v}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.l}{s.l === 'Earned' && stats?.pending_cents ? ` · ${money(stats.pending_cents)} pending` : ''}</p>
          </div>
        ))}
      </div>

      {/* Link generator */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <p className="flex items-center gap-2 font-bold text-gray-900 mb-4"><Link2 className="w-4 h-4 text-blue-600" /> Create a tracked link</p>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Product handle, product URL, or leave blank for your storefront link</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. sony-wh-1000xm5  ·  or paste a /products/… URL" className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => copy(genLink, 'gen')} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm" style={{ background: 'var(--sk-aurora)' }}>
            {copied === 'gen' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy link
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--sk-mist)] px-3 py-2.5">
          <code className="flex-1 text-xs text-gray-600 truncate">{genLink}</code>
        </div>
        {forecast && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              <b>{forecast.title.length > 40 ? forecast.title.slice(0, 40) + '…' : forecast.title}</b> — est. you earn{' '}
              <b>${(forecast.price * partner.default_commission_bps / 10000).toFixed(2)}</b> per sale
              <span className="text-emerald-600/80"> ({rate}% of ${forecast.price.toFixed(2)})</span>
            </p>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span>Your storefront link:</span>
          <button onClick={() => copy(baseLink, 'base')} className="inline-flex items-center gap-1 text-blue-600 font-medium">{copied === 'base' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {baseLink}</button>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* Promo codes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="font-bold text-gray-900 mb-1">Creator promo codes</p>
          <p className="text-xs text-gray-400 mb-4">A code attributes the sale to you even if the click cookie is lost.</p>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="YOURCODE" className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex items-center gap-1 border border-gray-300 rounded-xl px-3">
              <input value={newDisc} onChange={e => setNewDisc(e.target.value)} type="number" min="0" max="90" className="w-14 py-2.5 text-sm focus:outline-none" /><span className="text-sm text-gray-400">% off</span>
            </div>
            <button onClick={createCode} disabled={busy} className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--sk-aurora)' }}>Create</button>
          </div>
          {promos.length === 0 ? (
            <p className="text-xs text-gray-400">No codes yet.</p>
          ) : (
            <div className="space-y-2">
              {promos.map(c => (
                <div key={c.id} className="flex items-center gap-2 rounded-xl bg-[var(--sk-mist)] px-3 py-2">
                  <code className="text-sm font-bold text-gray-900">{c.code}</code>
                  <span className="text-xs text-gray-400">{(c.discount_bps / 100).toFixed(0)}% off · {c.uses} use{c.uses === 1 ? '' : 's'}{c.max_uses ? ` / ${c.max_uses}` : ''}</span>
                  <button onClick={() => copy(c.code, 'c' + c.id)} className="ml-auto text-blue-600">{copied === 'c' + c.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Balance / withdraw */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="font-bold text-gray-900 mb-1">Balance</p>
          <p className="text-xs text-gray-400 mb-4">Withdraw your earned commission on demand.</p>
          <div className="rounded-2xl bg-[var(--sk-mist)] p-5 flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400">Available</p>
              <p className="text-3xl font-black tracking-tight text-gray-900">{money(balance)}</p>
            </div>
            <button onClick={withdraw} disabled={busy || balance <= 0} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold shadow-lg shadow-violet-500/25 disabled:opacity-40" style={{ background: 'var(--sk-aurora)' }}>
              <Wallet className="w-4 h-4" /> Withdraw
            </button>
          </div>
          {payouts.length > 0 && (
            <div className="space-y-2">
              {payouts.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{p.created_at?.slice(0, 10)} · {p.method}</span>
                  <span className="flex items-center gap-2"><b className="text-gray-900">{money(p.amount_cents)}</b><span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-400 flex items-center gap-1.5">
        Anyone who clicks your link and buys within 30 days earns you {rate}% commission. <Link to="/shop" className="text-blue-600 font-medium inline-flex items-center gap-1">Find products to promote <ArrowRight className="w-3.5 h-3.5" /></Link>
      </p>
    </Shell>
  );
}
