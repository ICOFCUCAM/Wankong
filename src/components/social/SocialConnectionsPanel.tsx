import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Youtube, Facebook, Instagram, Music2, Twitter, Check, Loader2, Link2, Unlink } from 'lucide-react';
import type { Platform } from '@/services/competition/competitionPublisher';

/**
 * Lets a creator connect their social accounts. Once connected, an approved
 * competition entry is auto-published to WANKONG's official channels first and
 * then to the creator's own connected channels (see competitionPublisher.ts).
 *
 * Connecting initiates the platform's OAuth consent flow when the matching
 * client id is configured via env. The authorization-code → token exchange is
 * completed server-side (the client secret must never live in the browser); a
 * small edge function persists the row into `social_accounts`.
 */

interface PlatformMeta {
  id: Platform;
  label: string;
  Icon: typeof Youtube;
  color: string;
  /** env var holding the public OAuth client id/key */
  clientEnv: string;
  /** builds the OAuth consent URL */
  authUrl: (clientId: string, redirectUri: string) => string;
}

const REDIRECT = typeof window !== 'undefined' ? `${window.location.origin}/settings/social/callback` : '';

const PLATFORMS: PlatformMeta[] = [
  {
    id: 'youtube', label: 'YouTube', Icon: Youtube, color: '#FF0000', clientEnv: 'VITE_YOUTUBE_CLIENT_ID',
    authUrl: (c, r) => `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c}&redirect_uri=${encodeURIComponent(r)}&response_type=code&access_type=offline&prompt=consent&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload')}&state=youtube`,
  },
  {
    id: 'tiktok', label: 'TikTok', Icon: Music2, color: '#25F4EE', clientEnv: 'VITE_TIKTOK_CLIENT_KEY',
    authUrl: (c, r) => `https://www.tiktok.com/v2/auth/authorize/?client_key=${c}&redirect_uri=${encodeURIComponent(r)}&response_type=code&scope=${encodeURIComponent('video.publish,video.upload')}&state=tiktok`,
  },
  {
    id: 'facebook', label: 'Facebook', Icon: Facebook, color: '#1877F2', clientEnv: 'VITE_FACEBOOK_APP_ID',
    authUrl: (c, r) => `https://www.facebook.com/v18.0/dialog/oauth?client_id=${c}&redirect_uri=${encodeURIComponent(r)}&response_type=code&scope=${encodeURIComponent('pages_manage_posts,pages_read_engagement')}&state=facebook`,
  },
  {
    id: 'instagram', label: 'Instagram', Icon: Instagram, color: '#E1306C', clientEnv: 'VITE_FACEBOOK_APP_ID',
    authUrl: (c, r) => `https://www.facebook.com/v18.0/dialog/oauth?client_id=${c}&redirect_uri=${encodeURIComponent(r)}&response_type=code&scope=${encodeURIComponent('instagram_content_publish,instagram_basic,pages_show_list')}&state=instagram`,
  },
  {
    id: 'twitter', label: 'X (Twitter)', Icon: Twitter, color: '#1DA1F2', clientEnv: 'VITE_TWITTER_CLIENT_ID',
    authUrl: (c, r) => `https://twitter.com/i/oauth2/authorize?client_id=${c}&redirect_uri=${encodeURIComponent(r)}&response_type=code&scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}&state=twitter&code_challenge=challenge&code_challenge_method=plain`,
  },
];

interface Connected {
  platform: string;
  username: string | null;
}

export default function SocialConnectionsPanel() {
  const [connected, setConnected] = useState<Connected[]>([]);
  const [clientIds, setClientIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [accts, ids] = await Promise.all([
      supabase.from('social_accounts').select('platform, username').eq('user_id', user.id),
      supabase.rpc('oauth_client_ids'),   // admin-configured public client ids
    ]);
    setConnected(Array.isArray(accts.data) ? accts.data : []);
    const idMap: Record<string, string> = {};
    for (const r of Array.isArray(ids.data) ? ids.data : []) if (r.client_id) idMap[r.platform] = r.client_id;
    setClientIds(idMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isConnected = (p: Platform) => connected.some(c => c.platform === p);

  const connect = (pm: PlatformMeta) => {
    // Prefer the admin-configured client id (Admin → Integrations); fall back to env.
    const clientId = clientIds[pm.id] || ((import.meta as any).env?.[pm.clientEnv] as string | undefined);
    if (!clientId) {
      alert(`${pm.label} is not configured yet. An admin needs to add its OAuth client id under Admin → Integrations.`);
      return;
    }
    // Send the creator to the platform's OAuth consent screen. The callback
    // route completes the token exchange server-side and stores the account.
    window.location.href = pm.authUrl(clientId, REDIRECT);
  };

  const disconnect = async (p: Platform) => {
    setBusy(p);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('social_accounts').delete().eq('user_id', user.id).eq('platform', p);
    await load();
    setBusy(null);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center shrink-0">
          <Link2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">Connected accounts</h3>
          <p className="text-white/45 text-sm mt-0.5 max-w-xl">
            Connect your channels so that when your competition entry is approved, WANKONG auto-publishes it to
            our official channels first, then to your own connected accounts.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {PLATFORMS.map(pm => {
            const on = isConnected(pm.id);
            return (
              <div key={pm.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${pm.color}1f` }}>
                  <pm.Icon className="w-5 h-5" style={{ color: pm.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold">{pm.label}</p>
                  <p className={`text-xs ${on ? 'text-[#00F5A0]' : 'text-white/40'}`}>
                    {on ? 'Connected' : 'Not connected'}
                  </p>
                </div>
                {on ? (
                  <button
                    onClick={() => disconnect(pm.id)}
                    disabled={busy === pm.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {busy === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />} Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connect(pm)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 flex items-center gap-1.5"
                    style={{ background: `linear-gradient(135deg, ${pm.color}, ${pm.color}cc)` }}
                  >
                    <Link2 className="w-3.5 h-3.5" /> Connect
                  </button>
                )}
                {on && <Check className="w-4 h-4 text-[#00F5A0] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
