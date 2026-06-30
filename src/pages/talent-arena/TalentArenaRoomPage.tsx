import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useCompetitionVotes } from '@/hooks/useCompetitionVotes';
import { Trophy, Play, Heart, Star, Clock, ChevronRight, Loader2 } from 'lucide-react';

interface Room {
  id: string; title: string; category: string; description: string;
  prize_pool: string; end_date: string; status: string; cover_url: string | null;
}
interface Entry {
  id: string; title: string; performer_name: string; category: string;
  language: string; song_title: string; thumbnail_url: string | null;
  preview_clip_url: string | null; duration_seconds: number | null;
  ai_score: number | null; votes_count: number; status: string; is_winner: boolean;
}

function Countdown({ to }: { to: string }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(to).getTime() - Date.now();
      if (diff <= 0) { setLeft('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}d ${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [to]);
  return <span>{left}</span>;
}

function VoteButton({ entryId }: { entryId: string }) {
  const { votes, voted, castVote } = useCompetitionVotes(entryId);
  return (
    <button onClick={castVote} disabled={voted}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
        voted
          ? 'bg-[#FF6B00]/20 text-[#FF6B00] cursor-default'
          : 'bg-white/10 text-white hover:bg-[#FF6B00]/20 hover:text-[#FF6B00]'
      }`}>
      <Heart className={`w-3.5 h-3.5 ${voted ? 'fill-[#FF6B00]' : ''}`} />
      {votes.toLocaleString()} {voted ? '(voted)' : 'Vote'}
    </button>
  );
}

function EntryCard({ entry, rank }: { entry: Entry; rank: number }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`bg-[#0D1B3E] border rounded-2xl overflow-hidden transition-all ${
      entry.is_winner ? 'border-[#FFB800]/40 shadow-[0_0_24px_rgba(255,184,0,0.08)]' : 'border-white/5 hover:border-white/10'
    }`}>
      {/* Thumbnail / preview */}
      <div className="relative aspect-video bg-black">
        {entry.thumbnail_url
          ? <img src={entry.thumbnail_url} alt={entry.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/20 flex items-center justify-center">
              <Play className="w-10 h-10 text-white/20" />
            </div>}

        {entry.preview_clip_url && (
          <button
            onClick={() => setPlaying(p => !p)}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </div>
          </button>
        )}

        {/* Rank badge */}
        <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
          rank === 1 ? 'bg-[#FFB800] text-black' :
          rank === 2 ? 'bg-gray-400 text-black' :
          rank === 3 ? 'bg-amber-700 text-white' :
                       'bg-white/20 text-white'
        }`}>
          #{rank}
        </div>

        {entry.is_winner && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[#FFB800] text-black text-[10px] font-black rounded-full">
            <Trophy className="w-3 h-3" /> WINNER
          </div>
        )}

        {entry.duration_seconds && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded">
            {Math.floor(entry.duration_seconds / 60)}:{String(entry.duration_seconds % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Video preview (plays inline) */}
      {playing && entry.preview_clip_url && (
        <video src={entry.preview_clip_url} autoPlay controls className="w-full max-h-48 object-contain bg-black" />
      )}

      <div className="p-4">
        <p className="text-white font-semibold text-sm truncate">{entry.title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{entry.performer_name} · {entry.song_title}</p>

        {/* Score */}
        {entry.ai_score != null && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-3 h-3 text-[#FFB800] fill-[#FFB800]" />
            <span className="text-xs text-gray-400">AI Score: <span className="text-[#FFB800] font-semibold">{entry.ai_score.toFixed(1)}</span></span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{entry.category}</span>
          <VoteButton entryId={entry.id} />
        </div>
      </div>
    </div>
  );
}

export default function TalentArenaRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room,    setRoom]    = useState<Room | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'leaderboard' | 'latest'>('leaderboard');

  useEffect(() => {
    if (!roomId) return;

    Promise.all([
      supabase.from('competition_rooms').select('*').eq('id', roomId).single(),
      supabase.from('competition_entries_v2').select('*, created_at')
        .eq('room_id', roomId).in('status', ['live','winner'])
        .order('votes_count', { ascending: false }),
    ]).then(([roomRes, entriesRes]) => {
      if (roomRes.data) setRoom(roomRes.data as Room);
      setEntries((entriesRes.data as Entry[]) ?? []);
      setLoading(false);
    });

    // Realtime votes
    const ch = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'competition_entries_v2', filter: `room_id=eq.${roomId}` },
        payload => {
          setEntries(prev => prev.map(e => e.id === (payload.new as any).id ? { ...e, ...(payload.new as any) } : e)
            .sort((a, b) => b.votes_count - a.votes_count));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const sorted = tab === 'leaderboard'
    ? [...entries].sort((a, b) => {
        const scoreA = (a.ai_score ?? 0) * 0.6 + (a.votes_count) * 0.4;
        const scoreB = (b.ai_score ?? 0) * 0.6 + (b.votes_count) * 0.4;
        return scoreB - scoreA;
      })
    : [...entries].sort((a, b) => new Date(b.created_at ?? b.id).getTime() - new Date(a.created_at ?? a.id).getTime());

  if (loading) return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#FFB800] animate-spin" />
    </div>
  );

  if (!room) return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center text-gray-400">
      Competition room not found.
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Room hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        {room.cover_url && (
          <img src={room.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0814]" />
        <div className="relative max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Link to="/talent-arena" className="hover:text-white transition-colors">Talent Arena</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-300">{room.title}</span>
          </div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-[#FFB800]" />
                <span className="text-xs font-semibold text-[#FFB800] uppercase tracking-wide">{room.category}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{room.title}</h1>
              <p className="text-gray-400 text-sm max-w-xl">{room.description}</p>
            </div>
            <div className="flex flex-col gap-2 text-right shrink-0">
              {room.prize_pool && (
                <div className="px-4 py-2 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-xl">
                  <p className="text-[#FFB800] font-black text-lg">{room.prize_pool}</p>
                  <p className="text-gray-500 text-xs">Prize Pool</p>
                </div>
              )}
              {room.end_date && (
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <Countdown to={room.end_date} /> remaining
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <Link to={`/talent-arena/upload`} className="px-6 py-2.5 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">
              Enter Competition
            </Link>
            <span className="text-gray-500 text-sm">{entries.length} entries</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Tab toggle */}
        <div className="flex gap-1 bg-[#0D1B3E] border border-white/10 rounded-xl p-1 w-fit mb-8">
          {(['leaderboard', 'latest'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                tab === t ? 'bg-[#FFB800] text-black' : 'text-gray-400 hover:text-white'
              }`}>
              {t === 'leaderboard' ? '🏆 Leaderboard' : '🆕 Latest'}
            </button>
          ))}
        </div>

        {/* Leaderboard top-3 podium */}
        {tab === 'leaderboard' && sorted.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[sorted[1], sorted[0], sorted[2]].map((e, i) => {
              const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
              return e ? (
                <div key={e.id} className={`text-center p-4 rounded-2xl border ${
                  realRank === 1
                    ? 'bg-[#FFB800]/10 border-[#FFB800]/30 order-first md:-mt-4'
                    : 'bg-[#0D1B3E] border-white/5'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black mx-auto mb-2 ${
                    realRank === 1 ? 'bg-[#FFB800] text-black' :
                    realRank === 2 ? 'bg-gray-400 text-black' : 'bg-amber-700 text-white'
                  }`}>#{realRank}</div>
                  <p className="text-white text-xs font-semibold truncate">{e.performer_name}</p>
                  <p className="text-gray-500 text-[10px] truncate">{e.title}</p>
                  <p className="text-[#FFB800] text-sm font-bold mt-1">{e.votes_count.toLocaleString()} votes</p>
                </div>
              ) : <div key={i} />;
            })}
          </div>
        )}

        {/* Grid */}
        {sorted.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No live entries yet — be the first to compete!</p>
            <Link to="/talent-arena/upload" className="px-6 py-3 bg-[#FFB800] text-black font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">
              Submit Entry
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sorted.map((e, idx) => <EntryCard key={e.id} entry={e} rank={idx + 1} />)}
          </div>
        )}
      </div>
    </div>
  );
}
