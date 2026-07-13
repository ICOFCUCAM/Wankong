import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Store, Package, DollarSign, Wallet, Plus, Trash2,
  Eye, EyeOff, Clock, TrendingUp, X,
} from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_TYPES = ['Product', 'Music', 'Book', 'Audiobook', 'Video', 'Podcast', 'Course', 'Article'] as const;

type Tab = 'overview' | 'products' | 'revenue' | 'payouts';

interface VendorAccount {
  id: string;
  business_name: string;
  status: string;
  commission_rate: number;
  sales_count: number;
  total_sales_cents: number;
  payment_provider: string;
  phone: string | null;
}

interface VendorProduct {
  id: string;
  title: string;
  product_type: string | null;
  price: number;
  cover_url: string | null;
  status: string;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string;
}

interface Split {
  id: string;
  product_title: string | null;
  gross_cents: number;
  vendor_cents: number;
  platform_cents: number;
  payout_status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function StatCard({ label, value, icon, colour }: {
  label: string; value: string; icon: React.ReactNode; colour: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${colour}20`, color: colour }}>
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-white/40 text-xs mt-0.5">{label}</p>
    </div>
  );
}

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [account,     setAccount]     = useState<VendorAccount | null>(null);
  const [checking,    setChecking]    = useState(true);
  const [tab,         setTab]         = useState<Tab>('overview');
  const [products,    setProducts]    = useState<VendorProduct[]>([]);
  const [splits,      setSplits]      = useState<Split[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showAdd,     setShowAdd]     = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: acct } = await supabase
      .from('vendor_accounts')
      .select('id, business_name, status, commission_rate, sales_count, total_sales_cents, payment_provider, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    setAccount(acct);
    setChecking(false);
    if (!acct) return;

    const [prodRes, splitRes, wRes] = await Promise.all([
      supabase
        .from('ecom_products')
        .select('id, title, product_type, price, cover_url, status, rating_avg, rating_count, created_at')
        .or(`vendor_id.eq.${user.id},creator_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('revenue_splits')
        .select('id, product_title, gross_cents, vendor_cents, platform_cents, payout_status, created_at')
        .eq('vendor_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('creator_withdrawals')
        .select('id, amount, method, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setProducts((prodRes.data as VendorProduct[]) ?? []);
    setSplits((splitRes.data as Split[]) ?? []);
    setWithdrawals((wRes.data as Withdrawal[]) ?? []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const pendingCents  = splits.filter(s => s.payout_status === 'pending').reduce((s, r) => s + r.vendor_cents, 0);
  const lifetimeCents = splits.reduce((s, r) => s + r.vendor_cents, 0);

  const toggleProductStatus = async (p: VendorProduct) => {
    const next = p.status === 'active' ? 'draft' : 'active';
    const { error } = await supabase.from('ecom_products').update({ status: next }).eq('id', p.id);
    if (error) { toast.error('Could not update product'); return; }
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: next } : x));
    toast.success(next === 'active' ? 'Product published' : 'Product unpublished');
  };

  const deleteProduct = async (p: VendorProduct) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('ecom_products').delete().eq('id', p.id);
    if (error) { toast.error('Could not delete product'); return; }
    setProducts(prev => prev.filter(x => x.id !== p.id));
    toast.success('Product deleted');
  };

  const requestPayout = async () => {
    const { data, error } = await supabase.rpc('request_vendor_payout', {
      p_method: account?.payment_provider ?? 'PayPal',
      p_phone:  account?.phone ?? null,
    });
    if (error) { toast.error('Payout request failed'); return; }
    const result = data as { ok: boolean; reason?: string; amount_cents?: number };
    if (!result.ok) {
      toast.error(result.reason === 'below_minimum'
        ? 'Minimum payout is $1.00'
        : 'Payout request failed');
      return;
    }
    toast.success(`Payout of ${usd(result.amount_cents ?? 0)} requested`);
    load();
  };

  // ── Gate states ──────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="flex justify-center py-32">
          <div className="w-6 h-6 border-2 border-[#9D4EDD] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!account) {
    navigate('/vendor/register');
    return null;
  }

  if (account.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {account.status === 'pending' ? 'Application under review' : `Account ${account.status}`}
          </h1>
          <p className="text-white/50">
            {account.status === 'pending'
              ? 'Your vendor dashboard unlocks once your application is approved.'
              : 'Please contact support for more information.'}
          </p>
          <Link to="/" className="inline-block mt-6 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-colors">
            Back to Wankong
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const vendorShare = Math.round((1 - account.commission_rate) * 100);

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#9D4EDD]/20 rounded-2xl flex items-center justify-center">
              <Store className="w-5 h-5 text-[#B794F4]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{account.business_name}</h1>
              <p className="text-white/40 text-sm">Vendor dashboard · you keep {vendorShare}% of every sale</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-colors w-fit"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'products', label: `Products (${products.length})` },
            { key: 'revenue',  label: 'Revenue' },
            { key: 'payouts',  label: 'Payouts' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-[#9D4EDD] text-white' : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Items sold"        value={String(account.sales_count)}        icon={<Package className="w-4 h-4" />}    colour="#00D9FF" />
              <StatCard label="Gross sales"       value={usd(account.total_sales_cents)}     icon={<TrendingUp className="w-4 h-4" />} colour="#9D4EDD" />
              <StatCard label="Lifetime earnings" value={usd(lifetimeCents)}                 icon={<DollarSign className="w-4 h-4" />} colour="#00F5A0" />
              <StatCard label="Available payout"  value={usd(pendingCents)}                  icon={<Wallet className="w-4 h-4" />}     colour="#FFB800" />
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3">Recent sales</h3>
              {splits.length === 0 ? (
                <p className="text-white/40 text-sm">No sales yet — publish products to start earning.</p>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5">
                  {splits.slice(0, 6).map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{s.product_title ?? 'Product'}</p>
                        <p className="text-white/35 text-xs">{s.created_at?.slice(0, 10)}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-emerald-400 text-sm font-semibold">+{usd(s.vendor_cents)}</p>
                        <p className="text-white/30 text-xs">of {usd(s.gross_cents)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products */}
        {tab === 'products' && (
          products.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50 mb-4">No products yet.</p>
              <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-colors">
                Add your first product
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <img
                    src={p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`}
                    alt="" className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${p.id}`} className="text-white text-sm font-medium truncate hover:text-[#B794F4] block">
                      {p.title}
                    </Link>
                    <p className="text-white/40 text-xs">
                      {p.product_type ?? 'Product'} · {(p.price ?? 0) > 0 ? usd(p.price) : 'Free'}
                      {(p.rating_count ?? 0) > 0 && <> · ★ {Number(p.rating_avg).toFixed(1)} ({p.rating_count})</>}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
                    p.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/50'
                  }`}>
                    {p.status}
                  </span>
                  <button
                    onClick={() => toggleProductStatus(p)}
                    title={p.status === 'active' ? 'Unpublish' : 'Publish'}
                    className="p-2 text-white/40 hover:text-white transition-colors shrink-0"
                  >
                    {p.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteProduct(p)}
                    title="Delete"
                    className="p-2 text-white/40 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Revenue */}
        {tab === 'revenue' && (
          splits.length === 0 ? (
            <p className="text-white/40 text-sm py-12 text-center">No revenue yet.</p>
          ) : (
            <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Product', 'Date', 'Gross', 'Your share', 'Platform fee', 'Payout'].map(h => (
                      <th key={h} className="text-left text-white/40 font-semibold py-3 px-4 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {splits.map(s => (
                    <tr key={s.id}>
                      <td className="py-3 px-4 text-white max-w-[240px] truncate">{s.product_title ?? 'Product'}</td>
                      <td className="py-3 px-4 text-white/50">{s.created_at?.slice(0, 10)}</td>
                      <td className="py-3 px-4 text-white/70">{usd(s.gross_cents)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-medium">{usd(s.vendor_cents)}</td>
                      <td className="py-3 px-4 text-white/50">{usd(s.platform_cents)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          s.payout_status === 'paid'      ? 'bg-emerald-500/15 text-emerald-400' :
                          s.payout_status === 'requested' ? 'bg-amber-500/15 text-amber-400' :
                                                            'bg-white/10 text-white/50'
                        }`}>{s.payout_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Payouts */}
        {tab === 'payouts' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Available for payout</p>
                <p className="text-3xl font-black text-white">{usd(pendingCents)}</p>
                <p className="text-white/35 text-xs mt-1">Paid via {account.payment_provider} · minimum $1.00</p>
              </div>
              <button
                onClick={requestPayout}
                disabled={pendingCents < 100}
                className="px-6 py-3 bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
              >
                Request Payout
              </button>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3">Payout history</h3>
              {withdrawals.length === 0 ? (
                <p className="text-white/40 text-sm">No payout requests yet.</p>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5">
                  {withdrawals.map(w => (
                    <div key={w.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">${Number(w.amount).toFixed(2)} via {w.method}</p>
                        <p className="text-white/35 text-xs">{w.created_at?.slice(0, 10)}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                        w.status === 'paid'     ? 'bg-emerald-500/15 text-emerald-400' :
                        w.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                                                  'bg-amber-500/15 text-amber-400'
                      }`}>{w.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />

      {showAdd && (
        <AddProductModal
          userId={user!.id}
          vendorName={account.business_name}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); setTab('products'); }}
        />
      )}
    </div>
  );
}

// ── Add product modal ───────────────────────────────────────────────────────────

function AddProductModal({ userId, vendorName, onClose, onCreated }: {
  userId: string;
  vendorName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [cover,  setCover]  = useState<File | null>(null);
  const [form,   setForm]   = useState({
    title: '', product_type: 'Product', price: '', description: '', genre: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let coverUrl: string | null = null;
      if (cover) {
        const path = `covers/${userId}/${Date.now()}-${cover.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: upErr } = await supabase.storage
          .from('book-files')
          .upload(path, cover, { contentType: cover.type, upsert: false });
        if (!upErr) {
          coverUrl = supabase.storage.from('book-files').getPublicUrl(path).data.publicUrl;
        }
      }

      const priceCents = Math.max(0, Math.round(parseFloat(form.price || '0') * 100));
      const handle = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

      const { error } = await supabase.from('ecom_products').insert([{
        vendor_id:    userId,
        creator_id:   userId,
        vendor:       vendorName,
        title:        form.title.trim(),
        handle,
        product_type: form.product_type,
        description:  form.description.trim() || null,
        genre:        form.genre.trim() || null,
        price:        priceCents,
        cover_url:    coverUrl,
        status:       'active',
      }]);
      if (error) throw error;

      toast.success('Product published!');
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create product');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0B0814] border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <h2 className="text-white font-bold">Add Product</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Title *</label>
            <input
              type="text" required maxLength={140}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Type</label>
              <select
                value={form.product_type}
                onChange={e => setForm(p => ({ ...p, product_type: e.target.value }))}
                className="w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
              >
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Price (USD)</label>
              <input
                type="number" min="0" step="0.01" placeholder="0 = free"
                value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Genre / Category</label>
            <input
              type="text" maxLength={60}
              value={form.genre}
              onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Description</label>
            <textarea
              rows={3} maxLength={2000}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Cover image</label>
            <input
              type="file" accept="image/*"
              onChange={e => setCover(e.target.files?.[0] ?? null)}
              className="w-full text-white/60 text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs file:font-medium hover:file:bg-white/15"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? 'Publishing…' : 'Publish Product'}
          </button>
        </form>
      </div>
    </div>
  );
}
