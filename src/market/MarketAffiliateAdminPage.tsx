import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import {
  AFFILIATE_NETWORKS, NETWORK_CATEGORIES, networkById, buildTrackedLink,
  type AffiliateNetwork,
} from '@/lib/affiliateNetworks';
import {
  KeyRound, Search, Plus, Trash2, X, ExternalLink, Copy,
  CheckCircle2, Link2, Loader2, ShieldAlert, DownloadCloud, RefreshCw, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  provider: string;
  label: string;
  credentials: Record<string, string> | null;
  is_active: boolean;
  created_at: string;
  auto_sync?: boolean;
  sync_keywords?: string | null;
  feed_url?: string | null;
  import_limit?: number | null;
  last_synced_at?: string | null;
  last_sync_status?: string | null;
}

// Call the affiliate-admin API with the signed-in admin's JWT.
async function callEngine(body: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/affiliate-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

// SmartKong affiliate backend — connect any of the 30+ supported networks.
// Accounts are stored in affiliate_accounts (admin-only RLS) and power
// tracked-link generation across both SmartKong and Wankong.
export default function MarketAffiliateAdminPage() {
  const { user, isAdmin } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [connecting, setConnecting] = useState<AffiliateNetwork | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('affiliate_accounts')
      .select('id, provider, label, credentials, is_active, created_at, auto_sync, sync_keywords, feed_url, import_limit, last_synced_at, last_sync_status')
      .order('created_at', { ascending: false });
    setAccounts((data as Account[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const connectedProviders = useMemo(() => new Set(accounts.map(a => a.provider)), [accounts]);

  const visibleNetworks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return AFFILIATE_NETWORKS.filter(n => !q || n.name.toLowerCase().includes(q) || n.id.includes(q));
  }, [search]);

  const toggleActive = async (a: Account) => {
    const { error } = await supabase.from('affiliate_accounts').update({ is_active: !a.is_active }).eq('id', a.id);
    if (error) { toast.error('Could not update account'); return; }
    setAccounts(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !a.is_active } : x));
  };

  const remove = async (a: Account) => {
    if (!window.confirm(`Disconnect ${a.label}? Tracked links using this account will stop being generated.`)) return;
    const { error } = await supabase.from('affiliate_accounts').delete().eq('id', a.id);
    if (error) { toast.error('Could not delete account'); return; }
    setAccounts(prev => prev.filter(x => x.id !== a.id));
    toast.success('Account disconnected');
  };

  // ── Gates ────────────────────────────────────────────────────────────────
  if (!user || !isAdmin) {
    return (
      <MarketLayout>
        <div className="text-center py-32 max-w-md mx-auto px-4">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin access required</h1>
          <p className="text-gray-500 text-sm mb-6">
            The affiliate backend is only available to SmartKong administrators.
          </p>
          <Link to={user ? '/' : '/auth/login'} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            {user ? 'Back to marketplace' : 'Sign in'}
          </Link>
        </div>
      </MarketLayout>
    );
  }

  return (
    <MarketLayout>
      <Seo title="Affiliate Backend" noIndex />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Affiliate Backend</h1>
            <p className="text-sm text-gray-500">
              Connect your accounts on {AFFILIATE_NETWORKS.length - 1}+ networks — every product link gets tracked with your IDs.
            </p>
          </div>
        </div>

        {/* Connected accounts */}
        <section className="mt-8">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
            Connected accounts ({accounts.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /></div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl p-6 text-center">
              No accounts connected yet — pick a network below to get started.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.map(a => {
                const network = networkById(a.provider);
                return (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{network?.name ?? a.provider}</p>
                      <p className="text-xs text-gray-400 truncate">{a.label} · added {a.created_at?.slice(0, 10)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(a)}
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          a.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Off'}
                      </button>
                      <button onClick={() => remove(a)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Import Engine: one-button bulk import + auto-sync */}
        {accounts.some(a => a.is_active) && (
          <ImportEngine accounts={accounts.filter(a => a.is_active)} onChanged={load} />
        )}

        {/* Link tester */}
        {accounts.some(a => a.is_active) && <LinkTester accounts={accounts.filter(a => a.is_active)} />}

        {/* Network catalog */}
        <section className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">All networks</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search networks…"
                className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {(Object.keys(NETWORK_CATEGORIES) as Array<keyof typeof NETWORK_CATEGORIES>).map(cat => {
            const networks = visibleNetworks.filter(n => n.category === cat);
            if (networks.length === 0) return null;
            return (
              <div key={cat} className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{NETWORK_CATEGORIES[cat]}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {networks.map(n => (
                    <div key={n.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{n.name}</p>
                          {n.website && (
                            <a href={n.website} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-gray-400 hover:text-blue-600 inline-flex items-center gap-1">
                              {n.website.replace(/^https?:\/\/(www\.)?/, '')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        {connectedProviders.has(n.id) && (
                          <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                          </span>
                        )}
                      </div>
                      {n.notes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{n.notes}</p>}
                      <button
                        onClick={() => setConnecting(n)}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {connectedProviders.has(n.id) ? 'Add another account' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {connecting && (
        <ConnectModal
          network={connecting}
          onClose={() => setConnecting(null)}
          onSaved={() => { setConnecting(null); load(); }}
        />
      )}
    </MarketLayout>
  );
}

// ── Connect form ────────────────────────────────────────────────────────────────

function ConnectModal({ network, onClose, onSaved }: {
  network: AffiliateNetwork;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label,  setLabel]  = useState(`${network.name} account`);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of network.fields) {
      if (f.required && !values[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    const credentials = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)
    );
    const { error } = await supabase.from('affiliate_accounts').insert([{
      provider:    network.id,
      label:       label.trim() || network.name,
      credentials,
    }]);
    setSaving(false);
    if (error) { toast.error('Could not save account'); return; }
    toast.success(`${network.name} connected`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Connect {network.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {network.notes && (
            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">{network.notes}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Label</label>
            <input
              type="text" value={label} maxLength={80}
              onChange={e => setLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {network.fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {f.label}{f.required && <span className="text-red-500"> *</span>}
              </label>
              <input
                type={f.secret ? 'password' : 'text'}
                value={values[f.key] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <button
            type="submit" disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Connecting…' : 'Connect Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tracked-link tester ─────────────────────────────────────────────────────────

function LinkTester({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [url,       setUrl]       = useState('');
  const [result,    setResult]    = useState('');

  const account = accounts.find(a => a.id === accountId) ?? accounts[0];

  const generate = (e: React.FormEvent) => {
    e.preventDefault();
    setResult('');
    if (!account) return;
    const network = networkById(account.provider);
    if (!network) { toast.error('Unknown network'); return; }
    try {
      const link = buildTrackedLink(network, url.trim(), account.credentials ?? {});
      setResult(link);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <section className="mt-10 bg-gray-50 border border-gray-200 rounded-2xl p-5">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Tracked-link generator</h2>
      <form onSubmit={generate} className="flex flex-col sm:flex-row gap-2">
        <select
          value={account?.id ?? ''}
          onChange={e => setAccountId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{networkById(a.provider)?.name ?? a.provider} — {a.label}</option>
          ))}
        </select>
        <input
          type="url" required value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://store.com/product-page"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Generate
        </button>
      </form>
      {result && (
        <div className="flex items-center gap-2 mt-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
          <code className="flex-1 text-xs text-gray-700 truncate">{result}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied'); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}

// ── Import Engine — one button imports a network's whole catalog; auto-sync
// keeps registering new products as they appear on the network. ────────────────
function ImportEngine({ accounts, onChanged }: { accounts: Account[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [editing, setEditing] = useState<Record<string, { sync_keywords: string; feed_url: string; import_limit: string }>>({});

  const loadRuns = useCallback(async () => {
    try { const { runs } = await callEngine({ action: 'sync_runs', limit: 8 }); setRuns(runs); } catch { /* first load */ }
  }, []);
  useEffect(() => { loadRuns(); }, [loadRuns]);

  const cfg = (a: Account) => editing[a.id] ?? {
    sync_keywords: a.sync_keywords ?? '',
    feed_url: a.feed_url ?? '',
    import_limit: String(a.import_limit ?? 1000),
  };
  const setCfg = (a: Account, patch: Partial<{ sync_keywords: string; feed_url: string; import_limit: string }>) =>
    setEditing(prev => ({ ...prev, [a.id]: { ...cfg(a), ...patch } }));

  const saveCfg = async (a: Account) => {
    const c = cfg(a);
    setBusy(`cfg-${a.id}`);
    try {
      await callEngine({ action: 'update_sync_config', accountId: a.id, sync_keywords: c.sync_keywords, feed_url: c.feed_url, import_limit: Number(c.import_limit) });
      toast.success('Sync settings saved');
      onChanged();
    } catch (err: any) { toast.error(err.message); }
    setBusy(null);
  };

  const toggleAuto = async (a: Account) => {
    setBusy(`auto-${a.id}`);
    try {
      await callEngine({ action: 'update_sync_config', accountId: a.id, auto_sync: !a.auto_sync });
      toast.success(!a.auto_sync ? 'Auto-sync ON — new products register automatically' : 'Auto-sync off');
      onChanged();
    } catch (err: any) { toast.error(err.message); }
    setBusy(null);
  };

  const importAll = async (a: Account) => {
    setBusy(`import-${a.id}`);
    const t = toast.loading(`Importing the ${a.label} catalog — this can take a minute…`);
    try {
      const r = await callEngine({ action: 'bulk_import', accountId: a.id });
      toast.dismiss(t);
      if (r.error) toast.error(`Import stopped: ${r.error}`);
      else toast.success(`Done — ${r.imported} new products, ${r.updated} updated (${r.found} found)`);
      onChanged(); loadRuns();
    } catch (err: any) { toast.dismiss(t); toast.error(err.message); }
    setBusy(null);
  };

  const syncAll = async () => {
    setBusy('sync-all');
    const t = toast.loading('Syncing every auto-sync account…');
    try {
      const r = await callEngine({ action: 'sync_all' });
      toast.dismiss(t);
      toast.success(`Synced ${r.accounts} account${r.accounts === 1 ? '' : 's'}`);
      onChanged(); loadRuns();
    } catch (err: any) { toast.dismiss(t); toast.error(err.message); }
    setBusy(null);
  };

  return (
    <section className="mt-10 bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
          <DownloadCloud className="w-4 h-4 text-blue-600" /> Import engine
        </h2>
        <button
          onClick={syncAll} disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy === 'sync-all' ? 'animate-spin' : ''}`} /> Sync all now
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        One click imports a connected network's catalog (Amazon, CJ, eBay and Rakuten via API — every other network via its product-feed URL). Auto-sync re-runs on a schedule so new products register themselves as they appear.
      </p>

      <div className="space-y-3">
        {accounts.map(a => {
          const c = cfg(a);
          const network = networkById(a.provider);
          return (
            <div key={a.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-semibold text-gray-900">{network?.name ?? a.provider} <span className="text-gray-400 font-normal">· {a.label}</span></p>
                  <p className="text-[11px] text-gray-400">
                    {a.last_synced_at ? `Last sync ${a.last_synced_at.slice(0, 16).replace('T', ' ')} — ${a.last_sync_status ?? ''}` : 'Never synced'}
                  </p>
                </div>
                <button
                  onClick={() => toggleAuto(a)} disabled={busy !== null}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${a.auto_sync ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                  title="Automatically register new products on a schedule"
                >
                  <Zap className="w-3 h-3" /> Auto-sync {a.auto_sync ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => importAll(a)} disabled={busy !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  {busy === `import-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
                  Import all products
                </button>
              </div>

              <div className="grid sm:grid-cols-[1fr_1fr_110px_auto] gap-2 mt-3">
                <input
                  value={c.sync_keywords}
                  onChange={e => setCfg(a, { sync_keywords: e.target.value })}
                  placeholder="Keywords filter (optional — e.g. electronics)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  value={c.feed_url}
                  onChange={e => setCfg(a, { feed_url: e.target.value })}
                  placeholder="Product feed URL (CSV/JSON — for networks without an API)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number" min={1} max={5000}
                  value={c.import_limit}
                  onChange={e => setCfg(a, { import_limit: e.target.value })}
                  title="Max products per run"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => saveCfg(a)} disabled={busy !== null}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  {busy === `cfg-${a.id}` ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {runs.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recent runs</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-1.5 pr-4 font-medium">When</th>
                  <th className="py-1.5 pr-4 font-medium">Network</th>
                  <th className="py-1.5 pr-4 font-medium">Trigger</th>
                  <th className="py-1.5 pr-4 font-medium">Found</th>
                  <th className="py-1.5 pr-4 font-medium">New</th>
                  <th className="py-1.5 pr-4 font-medium">Updated</th>
                  <th className="py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className="border-t border-gray-100 text-gray-600">
                    <td className="py-1.5 pr-4 whitespace-nowrap">{r.started_at?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-1.5 pr-4">{r.provider}</td>
                    <td className="py-1.5 pr-4">{r.trigger}</td>
                    <td className="py-1.5 pr-4">{r.found}</td>
                    <td className="py-1.5 pr-4 font-semibold text-emerald-600">{r.imported}</td>
                    <td className="py-1.5 pr-4">{r.updated}</td>
                    <td className="py-1.5">{r.error ? <span className="text-red-500">{String(r.error).slice(0, 60)}</span> : <span className="text-emerald-600">ok</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
