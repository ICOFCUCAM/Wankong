import { supabase } from '@/lib/supabase';

/**
 * Competition video → social publishing pipeline.
 *
 * Order is enforced: a video is published to WANKONG's OWN official social
 * accounts FIRST. Only once that succeeds is it published to the creator's
 * connected accounts and made visible on the home Talent Arena. This matches
 * the product rule: "videos automatically go to the WANKONG social account by
 * default before they can show on the home page, and also to their own
 * accounts."
 *
 * Live posting requires real OAuth tokens:
 *   • WANKONG official tokens   → platform_social_accounts (admin-managed)
 *   • Creator tokens            → social_accounts (per-creator, via Connect UI)
 * When a token is missing the platform is skipped (not an error) so the
 * pipeline degrades gracefully until credentials are configured.
 */

export type Platform = 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'twitter';

export const PUBLISH_PLATFORMS: Platform[] = ['youtube', 'tiktok', 'facebook', 'instagram', 'twitter'];

export interface PlatformResult {
  platform: Platform;
  url: string | null;
  skipped?: boolean;   // no token connected for this platform
  error?: string;
}

interface VideoMeta {
  title: string;
  description: string;
  videoUrl: string;
  thumbUrl?: string | null;
}

interface AccountToken {
  access_token: string;
  account_uid?: string | null;
}

// ── Per-platform publishers (token-agnostic: works for WANKONG or creator) ──────

async function pubYouTube(meta: VideoMeta, acct: AccountToken): Promise<PlatformResult> {
  try {
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${acct.access_token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify({
          snippet: { title: meta.title, description: meta.description, tags: ['wankong', 'talentarena'], categoryId: '10' },
          status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
        }),
      },
    );
    if (!initRes.ok) return { platform: 'youtube', url: null, error: `init ${initRes.status}` };
    const uploadUri = initRes.headers.get('Location');
    if (!uploadUri) return { platform: 'youtube', url: null, error: 'no upload uri' };

    const videoRes = await fetch(meta.videoUrl);
    if (!videoRes.ok) return { platform: 'youtube', url: null, error: 'cannot fetch video' };
    const blob = await videoRes.blob();

    const upRes = await fetch(uploadUri, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${acct.access_token}`, 'Content-Type': blob.type || 'video/mp4' },
      body: blob,
    });
    if (!upRes.ok) return { platform: 'youtube', url: null, error: `upload ${upRes.status}` };
    const data = (await upRes.json()) as { id?: string };
    return data.id
      ? { platform: 'youtube', url: `https://www.youtube.com/watch?v=${data.id}` }
      : { platform: 'youtube', url: null, error: 'no video id' };
  } catch (e: any) {
    return { platform: 'youtube', url: null, error: e?.message || 'youtube failed' };
  }
}

async function pubTikTok(meta: VideoMeta, acct: AccountToken): Promise<PlatformResult> {
  // TikTok Content Posting API — pull-from-URL flow.
  try {
    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${acct.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: { title: `${meta.title} #wankong #talentarena`, privacy_level: 'PUBLIC_TO_EVERYONE' },
        source_info: { source: 'PULL_FROM_URL', video_url: meta.videoUrl },
      }),
    });
    const data = (await res.json()) as { data?: { publish_id?: string }; error?: { message?: string } };
    if (data.error?.message && data.error.message !== 'ok') return { platform: 'tiktok', url: null, error: data.error.message };
    return data.data?.publish_id
      ? { platform: 'tiktok', url: `https://www.tiktok.com/@${acct.account_uid ?? 'wankong'}` }
      : { platform: 'tiktok', url: null, error: 'no publish id' };
  } catch (e: any) {
    return { platform: 'tiktok', url: null, error: e?.message || 'tiktok failed' };
  }
}

async function pubFacebook(meta: VideoMeta, acct: AccountToken): Promise<PlatformResult> {
  try {
    const fd = new FormData();
    fd.append('file_url', meta.videoUrl);
    fd.append('title', meta.title);
    fd.append('description', `${meta.description}\n\n#wankong #talentarena`);
    fd.append('access_token', acct.access_token);
    const pageId = acct.account_uid ?? 'me';
    const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/videos`, { method: 'POST', body: fd });
    const data = (await res.json()) as { id?: string; error?: { message: string } };
    return data.id
      ? { platform: 'facebook', url: `https://www.facebook.com/${data.id}` }
      : { platform: 'facebook', url: null, error: data.error?.message ?? 'fb failed' };
  } catch (e: any) {
    return { platform: 'facebook', url: null, error: e?.message || 'facebook failed' };
  }
}

async function pubInstagram(meta: VideoMeta, acct: AccountToken): Promise<PlatformResult> {
  try {
    const igId = acct.account_uid;
    if (!igId) return { platform: 'instagram', url: null, error: 'no ig account id' };
    const create = await fetch(`https://graph.facebook.com/v18.0/${igId}/media`, {
      method: 'POST',
      body: new URLSearchParams({
        media_type: 'REELS',
        video_url: meta.videoUrl,
        caption: `${meta.title}\n\n${meta.description}\n\n#wankong #talentarena`,
        access_token: acct.access_token,
      }),
    });
    const cData = (await create.json()) as { id?: string; error?: { message: string } };
    if (!cData.id) return { platform: 'instagram', url: null, error: cData.error?.message ?? 'ig container failed' };
    // Poll for processing then publish
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const st = await fetch(`https://graph.facebook.com/v18.0/${cData.id}?fields=status_code&access_token=${acct.access_token}`);
      const sData = (await st.json()) as { status_code?: string };
      if (sData.status_code === 'FINISHED') break;
      if (sData.status_code === 'ERROR') return { platform: 'instagram', url: null, error: 'ig processing error' };
    }
    const pub = await fetch(`https://graph.facebook.com/v18.0/${igId}/media_publish`, {
      method: 'POST',
      body: new URLSearchParams({ creation_id: cData.id, access_token: acct.access_token }),
    });
    const pData = (await pub.json()) as { id?: string; error?: { message: string } };
    return pData.id
      ? { platform: 'instagram', url: `https://www.instagram.com/reel/${pData.id}/` }
      : { platform: 'instagram', url: null, error: pData.error?.message ?? 'ig publish failed' };
  } catch (e: any) {
    return { platform: 'instagram', url: null, error: e?.message || 'instagram failed' };
  }
}

async function pubTwitter(meta: VideoMeta, acct: AccountToken): Promise<PlatformResult> {
  try {
    const text = [`🎤 ${meta.title}`, meta.description?.slice(0, 180), 'Watch & vote on WANKONG #talentarena'].filter(Boolean).join('\n\n').slice(0, 280);
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${acct.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { platform: 'twitter', url: null, error: `tweet ${res.status}` };
    const data = (await res.json()) as { data?: { id: string } };
    return data.data?.id
      ? { platform: 'twitter', url: `https://twitter.com/${acct.account_uid ?? 'wankong'}/status/${data.data.id}` }
      : { platform: 'twitter', url: null, error: 'no tweet id' };
  } catch (e: any) {
    return { platform: 'twitter', url: null, error: e?.message || 'twitter failed' };
  }
}

const PUBLISHERS: Record<Platform, (m: VideoMeta, a: AccountToken) => Promise<PlatformResult>> = {
  youtube: pubYouTube,
  tiktok: pubTikTok,
  facebook: pubFacebook,
  instagram: pubInstagram,
  twitter: pubTwitter,
};

// ── Token sources ───────────────────────────────────────────────────────────────

async function wankongTokens(): Promise<Map<Platform, AccountToken>> {
  const map = new Map<Platform, AccountToken>();
  const { data } = await supabase
    .from('platform_social_accounts')
    .select('platform, access_token, account_uid, is_active');
  for (const row of data ?? []) {
    if (row.is_active && row.access_token && PUBLISH_PLATFORMS.includes(row.platform)) {
      map.set(row.platform as Platform, { access_token: row.access_token, account_uid: row.account_uid });
    }
  }
  return map;
}

async function creatorTokens(userId: string): Promise<Map<Platform, AccountToken>> {
  const map = new Map<Platform, AccountToken>();
  const { data } = await supabase
    .from('social_accounts')
    .select('platform, access_token, platform_uid')
    .eq('user_id', userId);
  for (const row of data ?? []) {
    if (row.access_token && PUBLISH_PLATFORMS.includes(row.platform)) {
      map.set(row.platform as Platform, { access_token: row.access_token, account_uid: row.platform_uid });
    }
  }
  return map;
}

async function publishWith(meta: VideoMeta, tokens: Map<Platform, AccountToken>): Promise<{ urls: Record<string, string>; results: PlatformResult[] }> {
  const results = await Promise.all(
    PUBLISH_PLATFORMS.map(async (p): Promise<PlatformResult> => {
      const acct = tokens.get(p);
      if (!acct) return { platform: p, url: null, skipped: true };
      return PUBLISHERS[p](meta, acct);
    }),
  );
  const urls: Record<string, string> = {};
  for (const r of results) if (r.url) urls[r.platform] = r.url;
  return { urls, results };
}

export interface PublishOutcome {
  entryId: string;
  wankongUrls: Record<string, string>;
  creatorUrls: Record<string, string>;
  wankongPublished: boolean;
  visibleOnHome: boolean;
  error?: string;
}

/**
 * Publish an APPROVED competition entry: WANKONG official accounts first, then
 * the creator's connected accounts, then flip it live on the home page.
 */
export async function publishCompetitionEntry(entryId: string): Promise<PublishOutcome> {
  const { data: entry, error } = await supabase
    .from('competition_entries_v2')
    .select('id, user_id, title, song_title, performer_name, video_url, thumbnail_url, status')
    .eq('id', entryId)
    .single();

  if (error || !entry) throw new Error(`Entry ${entryId} not found: ${error?.message}`);
  if (entry.status !== 'approved') throw new Error(`Entry ${entryId} is not approved (status: ${entry.status})`);

  const meta: VideoMeta = {
    title: entry.title || entry.song_title || 'WANKONG Talent Arena',
    description: `${entry.performer_name ?? ''} performs ${entry.song_title ?? ''} on WANKONG Talent Arena.`.trim(),
    videoUrl: entry.video_url,
    thumbUrl: entry.thumbnail_url,
  };

  await supabase.from('competition_entries_v2').update({ status: 'publishing', publish_error: null }).eq('id', entryId);

  // 1. WANKONG official accounts FIRST.
  const wTokens = await wankongTokens();
  const wankong = await publishWith(meta, wTokens);
  const wankongPublished = wTokens.size === 0 || Object.keys(wankong.urls).length > 0;

  // Hard requirement: do not proceed to the home page or creator accounts unless
  // the WANKONG-first step succeeded (or there are simply no official accounts
  // configured yet — in which case we let it through so the platform still works).
  if (!wankongPublished) {
    const errs = wankong.results.filter(r => r.error).map(r => `${r.platform}: ${r.error}`).join('; ');
    await supabase.from('competition_entries_v2')
      .update({ status: 'approved', publish_error: `WANKONG publish failed — ${errs}` })
      .eq('id', entryId);
    return { entryId, wankongUrls: wankong.urls, creatorUrls: {}, wankongPublished: false, visibleOnHome: false, error: errs };
  }

  // 2. Creator's own connected accounts.
  const cTokens = await creatorTokens(entry.user_id);
  const creator = await publishWith(meta, cTokens);

  // 3. Go live on the home Talent Arena.
  await supabase.from('competition_entries_v2').update({
    wankong_published_at: new Date().toISOString(),
    wankong_social_urls: wankong.urls,
    creator_published_at: new Date().toISOString(),
    creator_social_urls: creator.urls,
    visible_on_home: true,
    status: 'live',
    publish_error: null,
  }).eq('id', entryId);

  return {
    entryId,
    wankongUrls: wankong.urls,
    creatorUrls: creator.urls,
    wankongPublished: true,
    visibleOnHome: true,
  };
}

/**
 * Admin action: approve an entry, then run the publish pipeline.
 */
export async function approveAndPublish(entryId: string, adminId: string): Promise<PublishOutcome> {
  await supabase.from('competition_entries_v2')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId })
    .eq('id', entryId);
  return publishCompetitionEntry(entryId);
}
