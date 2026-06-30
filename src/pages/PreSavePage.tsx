import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bell, BellOff, Check, Music, Calendar, Share2, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Release {
  id:          string;
  title:       string;
  artist_id:   string;
  artist_name: string;
  cover_url?:  string;
  publish_at?: string;
  genre?:      string;
  label?:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countdown(to: string): string {
  const diff = new Date(to).getTime() - Date.now();
  if (diff <= 0) return 'Released';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PreSavePage() {
  const { releaseId } = useParams<{ releaseId: string }>();
  const { user }      = useAuth();

  const [release,   setRelease]   = useState<Release | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saved,     setSaved]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [timeLeft,  setTimeLeft]  = useState('');
  const [email,     setEmail]     = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Fetch release info
  useEffect(() => {
    if (!releaseId) return;
    (async () => {
      const { data } = await supabase
        .from('tracks')
        .select('id, title, genre, artwork_url, publish_at, artist_id, profiles:artist_id(full_name, label_name)')
        .eq('id', releaseId)
        .maybeSingle();

      if (data) {
        setRelease({
          id:          data.id,
          title:       data.title,
          artist_id:   data.artist_id || '',
          artist_name: (data as any).profiles?.full_name || 'Unknown Artist',
          cover_url:   data.artwork_url,
          publish_at:  data.publish_at,
          genre:       data.genre,
          label:       (data as any).profiles?.label_name,
        });
      }
      setLoading(false);
    })();
  }, [releaseId]);

  // Countdown ticker
  useEffect(() => {
    if (!release?.publish_at) return;
    setTimeLeft(countdown(release.publish_at));
    const t = setInterval(() => setTimeLeft(countdown(release.publish_at!)), 30_000);
    return () => clearInterval(t);
  }, [release]);

  // Check if user already pre-saved
  useEffect(() => {
    if (!user || !releaseId) return;
    supabase
      .from('presaves')
      .select('id')
      .eq('user_id', user.id)
      .eq('release_id', releaseId)
      .maybeSingle()
      .then(({ data }) => { if (data) setSaved(true); });
  }, [user, releaseId]);

  const handlePreSave = async () => {
    if (saved || saving) return;
    if (!user) {
      window.location.href = `/auth/login?next=/presave/${releaseId}`;
      return;
    }
    setSaving(true);
    await supabase.from('presaves').upsert([{
      user_id:    user.id,
      release_id: releaseId,
      created_at: new Date().toISOString(),
    }], { onConflict: 'user_id,release_id' });
    // Notify the creator (fire-and-forget)
    if (release?.artist_id) {
      supabase.from('user_notifications').insert([{
        user_id:    release.artist_id,
        type:       'presave',
        title:      'New Pre-save!',
        body:       `Someone pre-saved "${release.title}"`,
        read:       false,
        created_at: new Date().toISOString(),
      }]).then(() => {});
    }
    setSaved(true);
    setSaving(false);
  };

  const handleEmailNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !releaseId) return;
    await supabase.from('presave_emails').upsert([{
      email,
      release_id: releaseId,
      created_at: new Date().toISOString(),
    }], { onConflict: 'email,release_id' });
    setEmailSent(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center text-center px-6">
        <Music className="w-12 h-12 text-white/20 mb-4" />
        <h1 className="text-white text-xl font-bold mb-2">Release not found</h1>
        <Link to="/" className="text-[#00D9FF] text-sm hover:underline">Back to Home</Link>
      </div>
    );
  }

  const releaseDate = release.publish_at
    ? new Date(release.publish_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(157,78,221,0.15) 0%, #0B0814 70%)' }}>

      <div className="w-full max-w-sm">

        {/* Cover art */}
        <div className="relative mx-auto w-56 h-56 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 mb-8">
          {release.cover_url
            ? <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
                <Music className="w-20 h-20 text-white/20" />
              </div>}

          {/* "Coming soon" ribbon */}
          {release.publish_at && new Date(release.publish_at) > new Date() && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black text-[#0B0814]"
              style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}>
              COMING SOON
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="text-center mb-6">
          <h1 className="text-white text-2xl font-black mb-1">{release.title}</h1>
          <p className="text-white/50">{release.artist_name}</p>
          {release.genre && <p className="text-white/30 text-xs mt-1">{release.genre}</p>}
        </div>

        {/* Countdown */}
        {releaseDate && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <Calendar className="w-4 h-4 text-[#9D4EDD]" />
            <div className="text-center">
              <p className="text-white/50 text-xs">Releases {releaseDate}</p>
              {timeLeft && timeLeft !== 'Released' && (
                <p className="text-[#00D9FF] font-black text-lg tabular-nums">{timeLeft}</p>
              )}
            </div>
          </div>
        )}

        {/* Pre-save CTA */}
        <button
          onClick={handlePreSave}
          disabled={saved || saving}
          className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all mb-3 ${
            saved
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'text-white hover:opacity-90'
          }`}
          style={saved ? undefined : { background: 'linear-gradient(135deg,#9D4EDD,#00D9FF)' }}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <><Check className="w-5 h-5" /> Pre-saved!</>
          ) : (
            <><Bell className="w-5 h-5" /> Pre-save & Get Notified</>
          )}
        </button>

        {/* Email fallback (for non-logged-in visitors) */}
        {!user && !emailSent && (
          <form onSubmit={handleEmailNotify} className="flex gap-2 mb-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Or enter email for release alert"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#9D4EDD]/50"
            />
            <button type="submit"
              className="px-3 py-2.5 rounded-xl bg-[#9D4EDD]/20 border border-[#9D4EDD]/30 text-[#9D4EDD] text-sm font-semibold hover:bg-[#9D4EDD]/30 transition-colors">
              Notify
            </button>
          </form>
        )}
        {emailSent && (
          <p className="text-center text-emerald-400 text-sm mb-3">
            <Check className="w-4 h-4 inline mr-1" />
            We'll email you when it drops!
          </p>
        )}

        {/* Share row */}
        <div className="flex items-center gap-2">
          <button onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/25 hover:text-white transition-all">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button onClick={() => navigator.share?.({ title: release.title, url: window.location.href }).catch(() => {})}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/25 hover:text-white transition-all">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-white/25 text-xs hover:text-white/50 transition-colors">Powered by WANKONG</Link>
        </div>
      </div>
    </div>
  );
}
