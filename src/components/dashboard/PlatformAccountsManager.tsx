import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Youtube, Facebook, Instagram, Music2, Twitter, Save, Loader2, ShieldCheck } from 'lucide-react';

/**
 * Admin-only: manage WANKONG's OWN official social accounts. These tokens are
 * what the pipeline uses to publish an approved competition video to WANKONG's
 * channels FIRST (before the creator's and before it shows on the home page).
 * Stored in platform_social_accounts (admin RLS).
 */

const PLATFORMS = [
  { id: 'youtube',   label: 'YouTube',   Icon: Youtube,   color: '#FF0000' },
  { id: 'tiktok',    label: 'TikTok',    Icon: Music2,    color: '#25F4EE' },
  { id: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', Icon: Instagram, color: '#E1306C' },
  { id: 'twitter',   label: 'X (Twitter)', Icon: Twitter, color: '#1DA1F2' },
] as const;

interface Row { platform: string; display_name: string; account_uid: string; access_token: string; client_id: string; client_secret: string; is_active: boolean; }

const blank = (p: string): Row => ({ platform: p, display_name: '', account_uid: '', access_token: '', client_id: '', client_secret: '', is_active: true });

export default function PlatformAccountsManager() {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_social_accounts').select('platform, display_name, account_uid, access_token, client_id, client_secret, is_active');
    const map: Record<string, Row> = {};
    for (const p of PLATFORMS) map[p.id] = blank(p.id);
    for (const r of Array.isArray(data) ? data : []) {
      map[r.platform] = {
        platform: r.platform,
        display_name: r.display_name ?? '',
        account_uid: r.account_uid ?? '',
        access_token: r.access_token ? '••••••••' : '',
        client_id: r.client_id ?? '',
        client_secret: r.client_secret ? '••••••••' : '',
        is_active: r.is_active ?? true,
      };
    }
    setRows(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (p: string, patch: Partial<Row>) =>
    setRows(prev => ({ ...prev, [p]: { ...prev[p], ...patch } }));

  const save = async (p: string) => {
    setSaving(p); setSavedMsg('');
    const r = rows[p];
    const payload: any = {
      platform: p,
      display_name: r.display_name || null,
      account_uid: r.account_uid || null,
      client_id: r.client_id || null,
      is_active: r.is_active,
      updated_at: new Date().toISOString(),
    };
    // Only overwrite secrets if the admin actually typed new ones (not the mask).
    if (r.access_token && !r.access_token.startsWith('••')) payload.access_token = r.access_token;
    if (r.client_secret && !r.client_secret.startsWith('••')) payload.client_secret = r.client_secret;
    const { error } = await supabase.from('platform_social_accounts').upsert(payload, { onConflict: 'platform' });
    setSavedMsg(error ? `Error: ${error.message}` : `${p} saved.`);
    await load();
    setSaving(null);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-4">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB800] to-[#FF6B00] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">Social integrations</h3>
          <p className="text-white/45 text-sm mt-0.5 max-w-2xl">
            One place for everything per platform: the OAuth app <span className="text-white/70">client id / secret</span>
            (lets creators connect their accounts) and WANKONG's <span className="text-white/70">official account token</span>
            (the channel a video is published to first). Secrets are admin-only and read server-side; only the client id
            is ever exposed to start an OAuth flow.
          </p>
        </div>
      </div>

      {savedMsg && <div className="mb-3 text-sm text-[#00F5A0]">{savedMsg}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map(pm => {
            const r = rows[pm.id] ?? blank(pm.id);
            return (
              <div key={pm.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pm.color}1f` }}>
                    <pm.Icon className="w-4 h-4" style={{ color: pm.color }} />
                  </div>
                  <span className="text-white font-semibold text-sm flex-1">{pm.label}</span>
                  <label className="flex items-center gap-1.5 text-xs text-white/50">
                    <input type="checkbox" checked={r.is_active} onChange={e => update(pm.id, { is_active: e.target.checked })} />
                    Active
                  </label>
                </div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1.5">OAuth app — lets creators connect</p>
                <div className="grid sm:grid-cols-2 gap-2 mb-2.5">
                  <input value={r.client_id} onChange={e => update(pm.id, { client_id: e.target.value })}
                    placeholder="Client ID / key (public)"
                    className="bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/40" />
                  <input value={r.client_secret} onChange={e => update(pm.id, { client_secret: e.target.value })}
                    placeholder="Client secret" type="password"
                    className="bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/40" />
                </div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1.5">WANKONG official account — published to first</p>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input value={r.display_name} onChange={e => update(pm.id, { display_name: e.target.value })}
                    placeholder="Display name (@wankong)"
                    className="bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/40" />
                  <input value={r.account_uid} onChange={e => update(pm.id, { account_uid: e.target.value })}
                    placeholder="Channel / Page / User id"
                    className="bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/40" />
                  <input value={r.access_token} onChange={e => update(pm.id, { access_token: e.target.value })}
                    placeholder="Access token" type="password"
                    className="bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/40" />
                </div>
                <div className="flex justify-end mt-2.5">
                  <button onClick={() => save(pm.id)} disabled={saving === pm.id}
                    className="px-3.5 py-1.5 rounded-lg bg-[#FFB800] text-black text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50">
                    {saving === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
