import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { selectCompetitionWinner } from '@/services/competition/aiScoringService';
import { generatePreviewClip } from '@/services/competition/previewClipService';
import { autoQueueWinnerRelease } from '@/services/distribution/dittoDistributionService';
import { CheckCircle, XCircle, Trophy, Eye, Loader2, Play } from 'lucide-react';

interface Entry {
  id:               string;
  room_id:          string;
  title:            string;
  performer_name:   string | null;
  video_url:        string | null;
  thumbnail_url:    string | null;
  ai_score:         number | null;
  votes_count:      number;
  status:           string;
  duration_seconds: number | null;
  user_id:          string;
}

export default function AdminCompetitionPanel({ roomId }: { roomId?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);
  const [preview, setPreview] = useState<Entry | null>(null);

  const load = async () => {
    let q = supabase
      .from('competition_entries_v2')
      .select('*')
      .in('status', ['pending_review', 'approved', 'live'])
      .order('created_at', { ascending: false });
    if (roomId) q = q.eq('room_id', roomId);
    const { data } = await q;
    setEntries((data as Entry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-comp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_entries_v2' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const approve = async (e: Entry) => {
    setActing(e.id);
    await supabase
      .from('competition_entries_v2')
      .update({ status: 'live', reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', e.id);
    // Generate preview clip
    if (e.video_url) await generatePreviewClip(e.id, e.video_url).catch(() => {});
    setEntries(prev => prev.filter(x => x.id !== e.id));
    setPreview(null);
    setActing(null);
  };

  const reject = async (e: Entry) => {
    setActing(e.id);
    await supabase
      .from('competition_entries_v2')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', e.id);
    setEntries(prev => prev.filter(x => x.id !== e.id));
    setPreview(null);
    setActing(null);
  };

  const pickWinner = async () => {
    if (!roomId) return;
    const winnerId = await selectCompetitionWinner(roomId);
    if (!winnerId) return alert('No live entries to score.');
    const winner = entries.find(e => e.id === winnerId);
    if (winner) {
      // Look up the ecom_product linked to this competition entry (via user_id + title match)
      const { data: productRow } = await supabase
        .from('ecom_products')
        .select('id')
        .eq('vendor_id', winner.user_id)
        .ilike('title', winner.title)
        .limit(1)
        .maybeSingle();

      const trackId = productRow?.id ?? winnerId; // fall back to entry id if no product found
      await autoQueueWinnerRelease(winnerId, trackId).catch(() => {});
    }
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Competition Entries</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{entries.length} pending</span>
          {roomId && (
            <button
              onClick={pickWinner}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] text-xs font-bold rounded-lg hover:bg-[#FFB800]/20 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              Select Winner
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">No entries awaiting review.</div>
      )}

      <div className="space-y-2">
        {entries.map(e => (
          <div key={e.id} className="flex items-center gap-4 p-4 bg-[#0B0814] border border-white/5 rounded-xl">
            <div
              className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center cursor-pointer"
              onClick={() => setPreview(e)}
            >
              {e.thumbnail_url
                ? <img src={e.thumbnail_url} alt="" className="w-full h-full object-cover" />
                : <Play className="w-5 h-5 text-white/40" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{e.title}</p>
              <p className="text-gray-500 text-xs">{e.performer_name ?? 'Unknown'} · {e.duration_seconds ? `${Math.round(e.duration_seconds / 60)}min` : '?'}</p>
              <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                <span>AI: <span className="text-[#00D9FF]">{e.ai_score?.toFixed(1) ?? '—'}</span></span>
                <span>Votes: <span className="text-[#9D4EDD]">{e.votes_count}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setPreview(e)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => approve(e)} disabled={acting === e.id} className="w-8 h-8 rounded-lg bg-[#00F5A0]/10 flex items-center justify-center text-[#00F5A0] hover:bg-[#00F5A0]/20 transition-colors disabled:opacity-50">
                {acting === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              </button>
              <button onClick={() => reject(e)} disabled={acting === e.id} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-[#0B0814] border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-white font-bold">{preview.title}</h4>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            {preview.video_url && (
              <video src={preview.video_url} controls className="w-full rounded-xl max-h-72 object-contain bg-black" />
            )}
            <div className="flex gap-3">
              <button onClick={() => approve(preview)} disabled={acting === preview.id}
                className="flex-1 py-2.5 bg-[#00F5A0]/10 border border-[#00F5A0]/20 text-[#00F5A0] font-bold rounded-xl text-sm hover:bg-[#00F5A0]/20 disabled:opacity-50 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => reject(preview)} disabled={acting === preview.id}
                className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
