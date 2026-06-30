/**
 * WANKONG — social-oauth-callback Edge Function
 *
 * Completes the OAuth authorization-code flow for a creator connecting a social
 * account, then stores the resulting tokens in `social_accounts`. The client
 * secret lives here (server-side) and must never reach the browser.
 *
 * Invocation (from the /settings/social/callback page, with the user's JWT):
 *   POST /functions/v1/social-oauth-callback
 *   Headers: Authorization: Bearer <user access token>
 *   Body: { platform, code, redirect_uri, code_verifier? }
 *
 * Environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET          (YouTube)
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET         (TikTok)
 *   FACEBOOK_APP_ID, FACEBOOK_APP_SECRET            (Facebook + Instagram)
 *   TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET        (X / Twitter)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface TokenResult {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
  platform_uid?: string | null;
  username?: string | null;
}

const env = (k: string) => Deno.env.get(k) ?? '';

async function exchangeGoogle(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  const t = await res.json();
  if (!t.access_token) throw new Error(t.error_description || 'Google token exchange failed');
  let username: string | null = null, uid: string | null = null;
  try {
    const ch = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    const cd = await ch.json();
    uid = cd.items?.[0]?.id ?? null;
    username = cd.items?.[0]?.snippet?.title ?? null;
  } catch { /* identity optional */ }
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in, platform_uid: uid, username };
}

async function exchangeTikTok(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: env('TIKTOK_CLIENT_KEY'), client_secret: env('TIKTOK_CLIENT_SECRET'),
      code, grant_type: 'authorization_code', redirect_uri: redirectUri,
    }),
  });
  const t = await res.json();
  if (!t.access_token) throw new Error(t.error_description || t.error || 'TikTok token exchange failed');
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in, platform_uid: t.open_id, username: null };
}

async function exchangeFacebook(code: string, redirectUri: string, wantInstagram = false): Promise<TokenResult> {
  const res = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({
    client_id: env('FACEBOOK_APP_ID'), client_secret: env('FACEBOOK_APP_SECRET'),
    redirect_uri: redirectUri, code,
  })}`);
  const t = await res.json();
  if (!t.access_token) throw new Error(t.error?.message || 'Facebook token exchange failed');

  let uid: string | null = null, username: string | null = null;
  try {
    if (wantInstagram) {
      // Resolve the connected Instagram business account id via the first Page.
      const pages = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${t.access_token}`);
      const pd = await pages.json();
      const page = pd.data?.[0];
      uid = page?.instagram_business_account?.id ?? null;
      username = page?.name ?? null;
    } else {
      const pages = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name&access_token=${t.access_token}`);
      const pd = await pages.json();
      uid = pd.data?.[0]?.id ?? null;
      username = pd.data?.[0]?.name ?? null;
    }
  } catch { /* identity optional */ }
  return { access_token: t.access_token, refresh_token: null, expires_in: t.expires_in, platform_uid: uid, username };
}

async function exchangeTwitter(code: string, redirectUri: string, codeVerifier: string): Promise<TokenResult> {
  const basic = btoa(`${env('TWITTER_CLIENT_ID')}:${env('TWITTER_CLIENT_SECRET')}`);
  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({
      code, grant_type: 'authorization_code', client_id: env('TWITTER_CLIENT_ID'),
      redirect_uri: redirectUri, code_verifier: codeVerifier || 'challenge',
    }),
  });
  const t = await res.json();
  if (!t.access_token) throw new Error(t.error_description || 'Twitter token exchange failed');
  let uid: string | null = null, username: string | null = null;
  try {
    const me = await fetch('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${t.access_token}` } });
    const md = await me.json();
    uid = md.data?.id ?? null;
    username = md.data?.username ?? null;
  } catch { /* identity optional */ }
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in, platform_uid: uid, username };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Not authenticated' }, 401);

    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_KEY'));
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: 'Invalid session' }, 401);
    const userId = userData.user.id;

    const { platform, code, redirect_uri, code_verifier } = await req.json();
    if (!platform || !code || !redirect_uri) return json({ error: 'Missing platform/code/redirect_uri' }, 400);

    let result: TokenResult;
    switch (platform) {
      case 'youtube':   result = await exchangeGoogle(code, redirect_uri); break;
      case 'tiktok':    result = await exchangeTikTok(code, redirect_uri); break;
      case 'facebook':  result = await exchangeFacebook(code, redirect_uri, false); break;
      case 'instagram': result = await exchangeFacebook(code, redirect_uri, true); break;
      case 'twitter':   result = await exchangeTwitter(code, redirect_uri, code_verifier); break;
      default: return json({ error: `Unsupported platform: ${platform}` }, 400);
    }

    const expiry = result.expires_in ? new Date(Date.now() + result.expires_in * 1000).toISOString() : null;
    const { error: upErr } = await supabase.from('social_accounts').upsert({
      user_id: userId,
      platform,
      platform_uid: result.platform_uid ?? null,
      username: result.username ?? null,
      access_token: result.access_token,
      refresh_token: result.refresh_token ?? null,
      token_expiry: expiry,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    if (upErr) return json({ error: `Failed to store account: ${upErr.message}` }, 500);
    return json({ success: true, platform, username: result.username });
  } catch (e) {
    return json({ error: (e as Error).message || 'OAuth callback failed' }, 500);
  }
});
