import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Link2, KeyRound, Download, DollarSign, RefreshCw, Trash2, Plus,
  AlertTriangle, CheckCircle, ExternalLink, X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AFFILIATE_NETWORKS, networkById } from '@/lib/affiliateNetworks';

type Tab = 'products' | 'accounts' | 'import' | 'commissions';

// A tracked link must carry the network's tracking parameter
function linkIssue(source: string | null, url: string | null): string | null {
  if (!url) return 'Missing affiliate link';
  if (/example\.com|YOUR[_-]|XXXX|placeholder/i.test(url)) return 'Placeholder link';
  const u = url.toLowerCase();
  switch (source) {
    case 'amazon':  return u.includes('tag=') ? null : 'Missing tag= parameter';
    case 'cj':      return (u.includes('sid=') || u.includes('anrdoezrs') || u.includes('cj.com')) ? null : 'Missing sid= parameter';
    case 'rakuten': return u.includes('mid=') ? null : 'Missing mid= parameter';
    case 'temu':    return (u.includes('campaign_id') || u.includes('promo')) ? null : 'Missing campaign/promo parameter';
    default:        return null;
  }
}

async function adminApi(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/affiliate-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export default function AdminAffiliatesPage() {
  const [tab, setTab] = useState<Tab>('products');

  return (
    <div className="max-w-5xl">
      <h2 className="text-xl font-bold mb-1">Affiliate Engine</h2>
      <p className="text-white/40 text-sm mb-6">
        Monetize external products — network accounts, tracked links, catalog imports and commissions.
      </p>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {([
          { key: 'products',    label: 'Affiliate Products', icon: <Link2 className="w-3.5 h-3.5" /> },
          { key: 'accounts',    label: 'Network Accounts',   icon: <KeyRound className="w-3.5 h-3.5" /> },
          { key: 'import',      label: 'CJ Import',          icon: <Download className="w-3.5 h-3.5" /> },
          { key: 'commissions', label: 'Commissions',        icon: <DollarSign className="w-3.5 h-3.5" /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'products'    && <AffiliateProducts />}
      {tab === 'accounts'    && <NetworkAccounts />}
      {tab === 'import'      && <CjImport />}
      {tab === 'commissions' && <Commissions />}
    </div>
  );
}

// ── Affiliate products / link manager ──────────────────────────────────────────

function AffiliateProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<string | null>(null);
  const [editUrl,  setEditUrl]  = useState('');
  const [busy,     setBusy]     = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('ecom_products')
      .select('id, title, vendor, affiliate_source, affiliate_url, original_url, click_count, price, status')
      .eq('is_affiliate', true)
      .order('created_at', { ascending: false })
      .limit(200);
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveUrl = async (id: string) => {
    const { error } = await supabase.from('ecom_products').update({ affiliate_url: editUrl.trim() || null }).eq('id', id);
    if (error) { toast.error('Could not save link'); return; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, affiliate_url: editUrl.trim() || null } : p));
    setEditing(null);
    toast.success('Link updated');
  };

  const generateLink = async (p: any) => {
    if (!p.original_url || !p.affiliate_source) { toast.error('Product has no original URL / source'); return; }
    setBusy(p.id);
    try {
      const { link } = await adminApi('generate_link', { provider: p.affiliate_source, originalUrl: p.original_url });
      const { error } = await supabase.from('ecom_products').update({ affiliate_url: link }).eq('id', p.id);
      if (error) throw error;
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, affiliate_url: link } : x));
      toast.success('Tracked link generated');
    } catch (err: any) {
      toast.error(err.message);
    }
    setBusy(null);
  };

  const issues = products.filter(p => linkIssue(p.affiliate_source, p.affiliate_url));

  if (loading) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 text-white/30 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {issues.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {issues.length} product{issues.length > 1 ? 's have' : ' has'} broken or untracked affiliate links.
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-white/40 text-sm py-10 text-center">
          No affiliate products yet — import some from the CJ Import tab.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map(p => {
            const issue = linkIssue(p.affiliate_source, p.affiliate_url);
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-medium truncate max-w-[320px]">{p.title}</p>
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-white/60 uppercase font-semibold">
                        {p.affiliate_source ?? 'unknown'}
                      </span>
                      {issue ? (
                        <span className="flex items-center gap-1 text-amber-400 text-[11px]"><AlertTriangle className="w-3 h-3" />{issue}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px]"><CheckCircle className="w-3 h-3" />Tracked</span>
                      )}
                    </div>
                    <p className="text-white/35 text-xs mt-0.5">
                      {p.vendor ?? 'Partner'} · ${((p.price ?? 0) / 100).toFixed(2)} · {p.click_count ?? 0} clicks
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.affiliate_url && (
                      <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 text-white/40 hover:text-white transition-colors" title="Open link">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => generateLink(p)}
                      disabled={busy === p.id}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 rounded-lg text-xs text-white font-medium transition-colors"
                    >
                      {busy === p.id ? 'Generating…' : 'Generate'}
                    </button>
                    <button
                      onClick={() => { setEditing(editing === p.id ? null : p.id); setEditUrl(p.affiliate_url ?? ''); }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs text-white font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {editing === p.id && (
                  <div className="flex gap-2 mt-3">
                    <input
                      type="url" value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      placeholder="https://partner.com/product?tag=yourtag"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#9D4EDD]"
                    />
                    <button onClick={() => saveUrl(p.id)}
                      className="px-4 py-2 bg-[#9D4EDD] hover:bg-[#7C3AED] rounded-lg text-xs text-white font-semibold transition-colors">
                      Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Network accounts ───────────────────────────────────────────────────────────

function NetworkAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState<Record<string, string>>({ provider: 'amazon', label: '' });

  const load = useCallback(async () => {
    const { data } = await supabase.from('affiliate_accounts').select('*').order('created_at', { ascending: false });
    setAccounts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const network = networkById(form.provider) ?? AFFILIATE_NETWORKS[0];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const credentials = Object.fromEntries(
      network.fields
        .map(f => [f.key, form[f.key]?.trim() ?? ''])
        .filter(([, v]) => v)
    );
    const row: Record<string, unknown> = {
      provider:    network.id,
      label:       form.label.trim(),
      credentials,
    };

    const { error } = await supabase.from('affiliate_accounts').insert([row]);
    setSaving(false);
    if (error) { toast.error('Could not save account'); return; }
    toast.success('Account added');
    setShowForm(false);
    setForm({ provider: 'amazon', label: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this affiliate account?')) return;
    const { error } = await supabase.from('affiliate_accounts').delete().eq('id', id);
    if (error) { toast.error('Could not delete'); return; }
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const toggleActive = async (a: any) => {
    const { error } = await supabase.from('affiliate_accounts').update({ is_active: !a.is_active }).eq('id', a.id);
    if (error) return;
    setAccounts(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !a.is_active } : x));
  };

  if (loading) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 text-white/30 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 px-4 py-2 bg-[#9D4EDD] hover:bg-[#7C3AED] rounded-xl text-sm text-white font-semibold transition-colors">
        {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {showForm ? 'Cancel' : 'Add Network Account'}
      </button>

      {showForm && (
        <form onSubmit={save} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/55 mb-1">Network</label>
              <select
                value={form.provider}
                onChange={e => setForm({ provider: e.target.value, label: form.label })}
                className="w-full bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#9D4EDD]"
              >
                {AFFILIATE_NETWORKS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Label</label>
              <input
                type="text" required value={form.label ?? ''}
                onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Main account"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#9D4EDD]"
              />
            </div>
          </div>
          {network.fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs text-white/55 mb-1">{f.label}</label>
              <input
                type={f.secret ? 'password' : 'text'} value={form[f.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#9D4EDD]"
              />
            </div>
          ))}
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 rounded-xl text-sm text-white font-semibold transition-colors">
            {saving ? 'Saving…' : 'Save Account'}
          </button>
        </form>
      )}

      {accounts.length === 0 ? (
        <p className="text-white/40 text-sm py-8 text-center">
          No affiliate network accounts yet. Add your Amazon Associates tag, CJ token, Rakuten or Temu credentials.
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs text-white font-bold">{networkById(a.provider)?.name ?? a.provider}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{a.label}</p>
                <p className="text-white/35 text-xs">Added {a.created_at?.slice(0, 10)}</p>
              </div>
              <button onClick={() => toggleActive(a)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase transition-colors ${
                  a.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/40'
                }`}>
                {a.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => remove(a.id)} className="p-2 text-white/40 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CJ product import ──────────────────────────────────────────────────────────

function CjImport() {
  const [keywords,  setKeywords]  = useState('');
  const [results,   setResults]   = useState<any[]>([]);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setSelected(new Set());
    try {
      const { products } = await adminApi('cj_search_products', { keywords, limit: 50 });
      setResults(products ?? []);
      if ((products ?? []).length === 0) toast.info('No products found');
    } catch (err: any) {
      toast.error(err.message);
    }
    setSearching(false);
  };

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const doImport = async () => {
    setImporting(true);
    try {
      const chosen = results.filter(r => selected.has(r.catalogId));
      const { imported } = await adminApi('cj_import_products', { products: chosen });
      toast.success(`Imported ${imported} product${imported === 1 ? '' : 's'} into the marketplace`);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(err.message);
    }
    setImporting(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <input
          type="text" value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="Search the CJ catalog (e.g. headphones, kitchen, fitness)…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#9D4EDD]"
        />
        <button type="submit" disabled={searching || !keywords.trim()}
          className="px-5 py-2.5 bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 rounded-xl text-sm text-white font-semibold transition-colors">
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {selected.size > 0 && (
        <button onClick={doImport} disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl text-sm text-white font-semibold transition-colors">
          <Download className="w-4 h-4" />
          {importing ? 'Importing…' : `Import ${selected.size} selected`}
        </button>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {results.map(r => (
          <button key={r.catalogId} onClick={() => toggle(r.catalogId)}
            className={`flex gap-3 p-3 rounded-xl border text-left transition-all ${
              selected.has(r.catalogId) ? 'border-[#9D4EDD] bg-[#9D4EDD]/10' : 'border-white/10 bg-white/5 hover:border-white/25'
            }`}>
            <img src={r.imageUrl ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${r.catalogId}`}
              alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-white/5" />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium line-clamp-2">{r.name}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {r.advertiserName} · {r.price != null ? `$${Number(r.price).toFixed(2)}` : 'N/A'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Commissions ────────────────────────────────────────────────────────────────

function Commissions() {
  const [rows,    setRows]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(100);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    try {
      const { synced } = await adminApi('cj_sync_commissions', {});
      toast.success(`Synced ${synced} commission record${synced === 1 ? '' : 's'}`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSyncing(false);
  };

  const totalCommission = rows.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0);
  const totalSales      = rows.reduce((s, r) => s + Number(r.sale_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-6">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wide">Commissions earned</p>
            <p className="text-2xl font-bold text-emerald-400">${totalCommission.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wide">Driven sales</p>
            <p className="text-2xl font-bold text-white">${totalSales.toFixed(2)}</p>
          </div>
        </div>
        <button onClick={sync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 rounded-xl text-sm text-white font-medium transition-colors">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync last 30 days (CJ)
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-white/40 text-sm py-10 text-center">No commission records yet — run a sync once your CJ account is connected.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Advertiser', 'Date', 'Sale', 'Commission', 'Status'].map(h => (
                  <th key={h} className="text-left text-white/40 font-semibold py-3 px-4 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="py-3 px-4 text-white">{r.advertiser_name ?? r.advertiser_id ?? '—'}</td>
                  <td className="py-3 px-4 text-white/50">{(r.event_date ?? r.created_at)?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-white/70">${Number(r.sale_amount).toFixed(2)}</td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">${Number(r.commission_amount).toFixed(2)}</td>
                  <td className="py-3 px-4 text-white/50 capitalize">{r.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
