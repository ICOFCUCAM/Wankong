import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { transcribeEntry } from '@/pipelines/competition/SubtitleGeneratorWorker';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Captions } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface CompetitionEntry {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  performer_name: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  language: string | null;
  votes_count: number;
  ai_score: number | null;
  status: string;
  created_at: string;
}

interface CompetitionClip {
  id: string;
  entry_id: string;
  duration_s: number;
  clip_url?: string;
  clip_views: number;
  ranking_score?: number;
  status: string;
}

interface SubtitleRow {
  id: string;
  entry_id: string;
  language: string;
  vtt_url?: string;
  status: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function RelatedCard({ entry }: { entry: CompetitionEntry }) {
  return (
    <Link
      to={`/competition/watch/${entry.id}`}
      className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 hover:border-white/20 transition-all group"
    >
      <div className="w-16 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
        {entry.thumbnail_url ? (
          <img
            src={entry.thumbnail_url}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex items-center justify-center text-lg">
            🎤
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold line-clamp-2">{entry.title}</p>
        {entry.performer_name && (
          <p className="text-gray-400 text-[10px] mt-0.5 truncate">{entry.performer_name}</p>
        )}
        <p className="text-gray-500 text-[10px] mt-0.5">
          ❤ {(entry.votes_count ?? 0).toLocaleString()} votes
        </p>
      </div>
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WatchPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { userRole, isAdmin } = useAuth();

  const [entry, setEntry] = useState<CompetitionEntry | null>(null);
  const [clips, setClips] = useState<CompetitionClip[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleRow[]>([]);
  const [related, setRelated] = useState<CompetitionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [liveVotes, setLiveVotes] = useState(0);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  const [activeVttUrl, setActiveVttUrl] = useState<string | null>(null);
  const [activeClipIdx, setActiveClipIdx] = useState<number>(-1); // -1 = main video

  const [transcribing, setTranscribing] = useState(false);
  const [transcriptMsg, setTranscriptMsg] = useState<string | null>(null);

  // Fetch entry + clips + subtitles + related
  useEffect(() => {
    if (!entryId) return;
    setLoading(true);

    (async () => {
      const [entryRes, clipsRes, subsRes] = await Promise.all([
        supabase
          .from('competition_entries_v2')
          .select('*')
          .eq('id', entryId)
          .single(),
        supabase
          .from('competition_clips')
          .select('*')
          .eq('entry_id', entryId)
          .eq('status', 'done')
          .order('duration_s', { ascending: false }),
        supabase
          .from('competition_subtitles')
          .select('*')
          .eq('entry_id', entryId),
      ]);

      const e = entryRes.data as CompetitionEntry | null;
      setEntry(e);
      setLiveVotes(e?.votes_count ?? 0);
      setClips((clipsRes.data ?? []) as CompetitionClip[]);
      setSubtitles((subsRes.data ?? []) as SubtitleRow[]);

      if (e?.room_id) {
        const { data: relData } = await supabase
          .from('competition_entries_v2')
          .select('id, room_id, user_id, title, performer_name, thumbnail_url, votes_count, ai_score, status, category, language, video_url, created_at')
          .eq('room_id', e.room_id)
          .neq('id', entryId)
          .in('status', ['live', 'approved', 'winner'])
          .order('votes_count', { ascending: false })
          .limit(3);
        setRelated((relData ?? []) as CompetitionEntry[]);
      }

      setLoading(false);
    })();
  }, [entryId]);

  // Realtime votes counter
  useEffect(() => {
    if (!entryId) return;
    const channel = supabase
      .channel(`watch-votes-${entryId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'competition_votes', filter: `entry_id=eq.${entryId}` },
        () => setLiveVotes(v => v + 1)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [entryId]);

  // Apply subtitle VTT to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove previous injected tracks
    Array.from(video.querySelectorAll('track[data-wk]')).forEach(t => t.remove());

    if (activeVttUrl) {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.src = activeVttUrl;
      track.label = 'Subtitles';
      track.default = true;
      track.setAttribute('data-wk', '1');
      video.appendChild(track);
      Array.from(video.textTracks).forEach(t => {
        t.mode = t.label === 'Subtitles' ? 'showing' : 'hidden';
      });
    } else {
      Array.from(video.textTracks).forEach(t => { t.mode = 'hidden'; });
    }
  }, [activeVttUrl]);

  const handleGenerateSubtitles = async () => {
    if (!entryId || !entry?.video_url || transcribing) return;
    setTranscribing(true);
    setTranscriptMsg('Generating subtitles…');
    try {
      await transcribeEntry(entryId, entry.video_url);
      // Refresh subtitle rows
      const { data } = await supabase
        .from('competition_subtitles')
        .select('*')
        .eq('entry_id', entryId);
      setSubtitles((data ?? []) as SubtitleRow[]);
      setTranscriptMsg('Subtitles generated successfully.');
    } catch {
      setTranscriptMsg('Subtitle generation failed. Try again.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleVote = async () => {
    if (voted || voting || !entryId) return;
    setVoting(true);
    setVoted(true);
    setLiveVotes(v => v + 1);

    try {
      await supabase.from('competition_votes').insert({
        entry_id: entryId,
        session_id:
          sessionStorage.getItem('wk_session_id') ||
          (() => {
            const id = crypto.randomUUID();
            sessionStorage.setItem('wk_session_id', id);
            return id;
          })(),
        created_at: new Date().toISOString(),
      });
    } catch { /* ignore */ }

    setVoting(false);
  };

  // Determine current video src
  const currentVideoSrc = (): string | null => {
    if (activeClipIdx >= 0 && clips[activeClipIdx]?.clip_url) {
      return clips[activeClipIdx].clip_url!;
    }
    return entry?.video_url ?? null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center gap-4 text-white">
        <div className="text-5xl">🎤</div>
        <p className="text-xl font-bold">Entry not found</p>
        <button
          onClick={() => navigate('/collections/talent-arena')}
          className="text-[#9D4EDD] hover:underline text-sm"
        >
          Browse Talent Arena
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    live: 'text-[#00F5A0]', approved: 'text-[#00D9FF]',
    winner: 'text-[#FFB800]', pending: 'text-gray-400',
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-6 flex-wrap">
          <Link to="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <Link to="/collections/talent-arena" className="hover:text-white">Talent Arena</Link>
          <span>/</span>
          <Link to={`/talent-arena/room/${entry.room_id}`} className="hover:text-white">Room</Link>
          <span>/</span>
          <span className="text-gray-300 truncate max-w-[200px]">{entry.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video column */}
          <div className="lg:col-span-2">
            {/* HTML5 video player */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video mb-4 shadow-2xl">
              {currentVideoSrc() ? (
                <video
                  key={`${entryId}-${activeClipIdx}`}
                  ref={videoRef}
                  src={currentVideoSrc()!}
                  controls
                  poster={entry.thumbnail_url ?? undefined}
                  className="w-full h-full object-contain"
                  playsInline
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/40 to-[#00D9FF]/20 flex flex-col items-center justify-center gap-4">
                  <span className="text-6xl">🎤</span>
                  <p className="text-gray-400 text-sm">Video unavailable</p>
                </div>
              )}
            </div>

            {/* Clip selector (if clips available) */}
            {clips.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveClipIdx(-1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    activeClipIdx === -1
                      ? 'bg-[#00D9FF] text-[#0B0814]'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  Full Video
                </button>
                {clips.map((clip, i) => (
                  <button
                    key={clip.id}
                    onClick={() => setActiveClipIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeClipIdx === i
                        ? 'bg-[#00D9FF] text-[#0B0814]'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Clip {i + 1} ({clip.duration_s}s)
                  </button>
                ))}
              </div>
            )}

            {/* Subtitle selector — language pills */}
            {(subtitles.length > 0 || (isAdmin || userRole === 'artist')) && (
              <div className="mb-4 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Subtitles</p>
                  {/* Generate button — only for admin / artist */}
                  {(isAdmin || userRole === 'artist') && (
                    <button
                      onClick={handleGenerateSubtitles}
                      disabled={transcribing || !entry?.video_url}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#9D4EDD]/15 text-[#9D4EDD] border border-[#9D4EDD]/30 hover:bg-[#9D4EDD]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {transcribing
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Captions className="w-3 h-3" />}
                      {transcribing ? 'Generating…' : 'Generate Subtitles'}
                    </button>
                  )}
                </div>
                {transcriptMsg && (
                  <p className="text-xs text-[#9D4EDD]/70 mb-2">{transcriptMsg}</p>
                )}
                {subtitles.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveVttUrl(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        !activeVttUrl
                          ? 'bg-[#9D4EDD] text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                      }`}
                    >
                      Off
                    </button>
                    {subtitles.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveVttUrl(sub.vtt_url ?? null)}
                        disabled={!sub.vtt_url || sub.status !== 'done'}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all disabled:opacity-40 ${
                          activeVttUrl === sub.vtt_url
                            ? 'bg-[#9D4EDD] text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {sub.language}
                      </button>
                    ))}
                  </div>
                )}
                {subtitles.length === 0 && !transcribing && (
                  <p className="text-gray-600 text-xs">No subtitles yet. Click "Generate Subtitles" to create them.</p>
                )}
              </div>
            )}

            {/* Entry info */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white mb-1">{entry.title}</h1>
              {entry.performer_name && (
                <p className="text-gray-400 text-sm mb-3">{entry.performer_name}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {entry.category && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#9D4EDD]/10 text-[#9D4EDD] border border-[#9D4EDD]/20">
                    {entry.category}
                  </span>
                )}
                {entry.language && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20">
                    {entry.language.toUpperCase()}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 capitalize ${statusColors[entry.status] ?? 'text-gray-400'}`}>
                  {entry.status === 'winner' ? '🏆 Winner' : entry.status}
                </span>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-5">
            {/* Votes (realtime) + AI score + Vote button */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-5">
                <div>
                  <p className="text-4xl font-black text-[#00D9FF]">{liveVotes.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Community Votes</p>
                  <span className="inline-flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse" />
                    <span className="text-[10px] text-gray-500">Live</span>
                  </span>
                </div>
                {entry.ai_score != null && (
                  <div className="text-right ml-auto">
                    <p className="text-3xl font-black text-[#9D4EDD]">{entry.ai_score.toFixed(1)}</p>
                    <p className="text-gray-500 text-xs mt-0.5">AI Score</p>
                  </div>
                )}
              </div>

              {/* Vote button */}
              <button
                onClick={handleVote}
                disabled={voted || voting}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  voted
                    ? 'bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/20 cursor-default'
                    : 'bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-[#0B0814] hover:opacity-90 shadow-lg shadow-orange-500/20'
                }`}
              >
                {voted ? '♥ Voted! Thank you' : voting ? 'Casting vote…' : '♡ Vote for this performance'}
              </button>
            </div>

            {/* Entry info panel */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Entry Details</p>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Performer', value: entry.performer_name ?? 'Unknown' },
                  { label: 'Category', value: entry.category ?? '—' },
                  { label: 'Language', value: entry.language?.toUpperCase() ?? '—' },
                  { label: 'Status', value: entry.status === 'winner' ? '🏆 Winner' : entry.status, gold: entry.status === 'winner' },
                  { label: 'AI Score', value: entry.ai_score != null ? entry.ai_score.toFixed(1) : 'Pending' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-gray-500">{item.label}</span>
                    <span className={item.gold ? 'text-[#FFB800] font-bold' : 'text-gray-200'}>{item.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate(`/talent-arena/room/${entry.room_id}`)}
                className="w-full mt-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-xs hover:bg-white/10 transition-colors font-medium"
              >
                View All Entries in Room →
              </button>
            </div>

            {/* Related entries (3 from same room) */}
            {related.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">More from this Room</p>
                <div className="space-y-2">
                  {related.map(rel => <RelatedCard key={rel.id} entry={rel} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
