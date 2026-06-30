import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { approveAndPublish } from '@/services/competition/competitionPublisher';
import { CheckCircle, Loader2, XCircle, ExternalLink, Trophy, AlertCircle } from 'lucide-react';

interface Entry {
  id: string;
  title: string;
  performer_name: string | null;
  song_title: string | null;
  category: string | null;
  language: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  wankong_social_urls?: Record<string, string> | null;
  creator_social_urls?: Record<string, string> | null;
  publish_error?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  pending_review: 'bg-amber-500/15 text-amber-400',
  approved:       'bg-blue-500/15 text-blue-400',
  publishing:     'bg-purple-500/15 text-purple-300',
  live:           'bg-emerald-500/15 text-emerald-400',
  rejected:       'bg-red-500/15 text-red-400',
};

export default function CompetitionApprovalQueue() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<string | null>(null);
  const [msg, setMsg]         = useState<string>('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('competition_entries_v2')
      .select('id, title, performer_name, song_title, category, language, video_url, thumbnail_url, status, created_at, wankong_social_urls, creator_social_urls, publish_error')
      .in('status', ['pending_review', 'approved', 'publishing', 'live'])
      .order('created_at', { ascending: false })
      .limit(50);
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setBusy(id); setMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const outcome = await approveAndPublish(id, user?.id ?? '');
      if (outcome.visibleOnHome) {
        const w = Object.keys(outcome.wankongUrls).length;
        const c = Object.keys(outcome.creatorUrls).length;
        setMsg(`Published & live. WANKONG channels: ${w || 'none configured'} · creator channels: ${c || 'none connected'}.`);
      } else {
        setMsg(`Could not publish to WANKONG channels: ${outcome.error ?? 'unknown error'}. Entry kept in approved state.`);
      }
    } catch (e: any) {
      setMsg(e?.message ?? 'Approval failed.');
    }
    await load();
    setBusy(null);
  };

  const reject = async (id: string) => {
    setBusy(id);
    await supabase.from('competition_entries_v2').update({ status: 'rejected' }).eq('id', id);
    await load();
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFB800]/15 flex items-center justify-center"><Trophy className="w-5 h-5 text-[#FFB800]" /></div>
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">Talent Arena — entry approvals</h3>
          <p className="text-white/45 text-sm">Approve an entry to auto-publish it to WANKONG's channels first, then the creator's, then go live on the home page.</p>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#FFB800]" /> {msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading entries…</div>
      ) : entries.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center text-white/40 text-sm">No competition entries yet.</div>
      ) : (
        <div className="space-y-2.5">
          {entries.map(e => (
            <div key={e.id} className="flex items-center gap-3 bg-gray-900/50 border border-gray-800 rounded-xl p-3.5">
              <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0">
                {e.thumbnail_url && <img src={e.thumbnail_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate">{e.title || e.song_title || 'Untitled'}</p>
                <p className="text-white/40 text-xs truncate">
                  {e.performer_name ?? 'Unknown'} · {e.category ?? '—'} · {e.language ?? '—'}
                </p>
                {e.publish_error && <p className="text-red-400 text-[11px] mt-0.5 truncate">⚠ {e.publish_error}</p>}
                {(e.wankong_social_urls && Object.keys(e.wankong_social_urls).length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.entries(e.wankong_social_urls).map(([p, url]) => (
                      <a key={p} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-[#00D9FF] hover:underline">
                        {p} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${STATUS_STYLE[e.status] ?? 'bg-white/10 text-white/60'}`}>
                {e.status.replace('_', ' ')}
              </span>
              {e.video_url && (
                <a href={e.video_url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white shrink-0" title="Preview video"><ExternalLink className="w-4 h-4" /></a>
              )}
              {e.status === 'pending_review' || e.status === 'approved' ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => approve(e.id)} disabled={busy === e.id}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    {busy === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Approve &amp; publish
                  </button>
                  <button onClick={() => reject(e.id)} disabled={busy === e.id}
                    className="px-2.5 py-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-red-400 text-xs rounded-lg transition-colors">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
