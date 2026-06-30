import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import CompetitionLeaderboard from '@/components/competition/CompetitionLeaderboard';

// ── Types ────────────────────────────────────────────────────────────────────

interface CompetitionRoom {
  id: string;
  title: string;
  category?: string;
  prize_description?: string;
  status: string;
}

interface CompetitionEntry {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  performer_name: string | null;
  thumbnail_url: string | null;
  votes_count: number;
  ai_score: number | null;
  status: string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = ['#FFB800', '#C0C0C0', '#CD7F32'];

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [room, setRoom] = useState<CompetitionRoom | null>(null);
  const [entries, setEntries] = useState<CompetitionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    (async () => {
      setLoading(true);
      const [roomRes, entriesRes] = await Promise.all([
        supabase.from('competition_rooms').select('*').eq('id', roomId).single(),
        supabase
          .from('competition_entries_v2')
          .select('id, room_id, user_id, title, performer_name, thumbnail_url, votes_count, ai_score, status, created_at')
          .eq('room_id', roomId)
          .order('votes_count', { ascending: false }),
      ]);

      setRoom(roomRes.data as CompetitionRoom | null);
      setEntries((entriesRes.data ?? []) as CompetitionEntry[]);
      setLoading(false);
    })();
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  const winner = entries.find(e => e.status === 'winner') ?? entries[0] ?? null;
  const podium = entries.slice(0, 3);
  const leaderboard = entries;

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-8 flex-wrap">
          <Link to="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <Link to="/collections/talent-arena" className="hover:text-white">Talent Arena</Link>
          <span>/</span>
          <span className="text-gray-300">Results</span>
        </div>

        {/* Room header */}
        <div className="text-center mb-10">
          <p className="text-[#FFB800] text-sm font-medium uppercase tracking-widest mb-2">Competition Results</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            {room?.title ?? 'Results'}
          </h1>
          <p className="text-gray-400">
            {room?.category}{room?.category && ' · '}{entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* Winner card — gold border, "WINNER 🏆" banner, large display */}
        {winner && (
          <div className="bg-gradient-to-r from-[#FFB800]/20 to-[#FF6B00]/10 border-2 border-[#FFB800]/60 rounded-3xl p-8 text-center mb-12 shadow-[0_0_40px_rgba(255,184,0,0.15)]">
            <div className="text-5xl mb-3">🏆</div>
            <div className="inline-block bg-[#FFB800] text-[#0B0814] font-black px-5 py-1 rounded-full text-sm mb-6 tracking-widest uppercase">
              WINNER 🏆
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#FFB800]/50">
                {winner.thumbnail_url ? (
                  <img src={winner.thumbnail_url} alt={winner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFB800]/30 to-[#FF6B00]/10 flex items-center justify-center text-4xl">🎤</div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-1">{winner.title}</h2>
                <p className="text-gray-400 mb-4">{winner.performer_name ?? 'Unknown Performer'}</p>
              </div>
              <div className="flex justify-center gap-10">
                <div>
                  <p className="text-3xl font-black text-[#FFB800]">{(winner.votes_count ?? 0).toLocaleString()}</p>
                  <p className="text-gray-400 text-xs">Votes</p>
                </div>
                {winner.ai_score != null && (
                  <div>
                    <p className="text-3xl font-black text-[#9D4EDD]">{winner.ai_score.toFixed(1)}</p>
                    <p className="text-gray-400 text-xs">AI Score</p>
                  </div>
                )}
              </div>
              <Link
                to={`/competition/watch/${winner.id}`}
                className="mt-2 inline-flex items-center gap-2 px-8 py-3 bg-[#FFB800] text-[#0B0814] font-bold rounded-xl hover:bg-[#e6a600] transition-colors"
              >
                ▶ Watch Performance
              </Link>
            </div>
          </div>
        )}

        {/* Podium — top 3 side by side with rank medals 🥇🥈🥉 */}
        {podium.length >= 2 && (
          <div className="mb-12">
            <h2 className="text-xl font-black text-white mb-6 text-center">Top Performers</h2>
            <div className="grid grid-cols-3 gap-4">
              {podium.map((entry, i) => (
                <Link
                  key={entry.id}
                  to={`/competition/watch/${entry.id}`}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="text-3xl mb-2">{MEDALS[i]}</div>
                  <div
                    className="w-16 h-16 rounded-xl overflow-hidden mb-3 group-hover:scale-105 transition-transform border-2"
                    style={{ borderColor: `${PODIUM_COLORS[i]}60` }}
                  >
                    {entry.thumbnail_url ? (
                      <img src={entry.thumbnail_url} alt={entry.title} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-2xl"
                        style={{ background: `${PODIUM_COLORS[i]}22` }}
                      >🎤</div>
                    )}
                  </div>
                  <p className="text-white text-sm font-bold line-clamp-1">{entry.title}</p>
                  <p className="text-gray-400 text-xs truncate w-full">{entry.performer_name ?? ''}</p>
                  <p className="font-bold text-sm mt-1" style={{ color: PODIUM_COLORS[i] }}>
                    ❤ {(entry.votes_count ?? 0).toLocaleString()}
                  </p>
                  {entry.ai_score != null && (
                    <p className="text-gray-500 text-xs">AI: {entry.ai_score.toFixed(1)}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Real-time leaderboard */}
        {roomId && (
          <div className="mb-10">
            <CompetitionLeaderboard roomId={roomId} isLive={room?.status === 'active'} />
          </div>
        )}

        {/* Full leaderboard: rank, thumbnail, title, performer, votes, AI score */}
        {leaderboard.length > 0 ? (
          <div>
            <h2 className="text-xl font-black text-white mb-4">All Entries</h2>
            <div className="bg-[#1A2240] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[48px_1fr_auto_auto] gap-3 px-5 py-3 border-b border-white/10">
                <span className="text-gray-500 text-xs font-semibold">#</span>
                <span className="text-gray-500 text-xs font-semibold">Performer</span>
                <span className="text-gray-500 text-xs font-semibold">Votes</span>
                <span className="text-gray-500 text-xs font-semibold text-right">AI</span>
              </div>
              <div className="divide-y divide-white/5">
                {leaderboard.map((entry, i) => {
                  const rank = i + 1;
                  const isWinner = entry.status === 'winner';
                  return (
                    <Link
                      key={entry.id}
                      to={`/competition/watch/${entry.id}`}
                      className={[
                        'grid grid-cols-[48px_1fr_auto_auto] gap-3 items-center px-5 py-3.5 hover:bg-white/5 transition-colors',
                        rank === 1 ? 'bg-[#FFB800]/5' : rank === 2 ? 'bg-[#C0C0C0]/5' : rank === 3 ? 'bg-[#CD7F32]/5' : '',
                      ].join(' ')}
                    >
                      <span className={`text-sm font-bold ${rank === 1 ? 'text-[#FFB800]' : rank === 2 ? 'text-[#C0C0C0]' : rank === 3 ? 'text-[#CD7F32]' : 'text-gray-500'}`}>
                        {rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}
                      </span>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          {entry.thumbnail_url ? (
                            <img src={entry.thumbnail_url} alt={entry.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex items-center justify-center text-sm">🎤</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold truncate">
                            {entry.title}{isWinner && <span className="ml-1 text-[#FFB800]">🏆</span>}
                          </p>
                          <p className="text-gray-400 text-xs truncate">{entry.performer_name ?? ''}</p>
                        </div>
                      </div>
                      <span className="text-[#00D9FF] font-bold text-sm tabular-nums">
                        {(entry.votes_count ?? 0).toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-sm text-right tabular-nums">
                        {entry.ai_score != null ? entry.ai_score.toFixed(1) : '—'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏁</div>
            <p className="text-gray-400">No entries in this competition yet.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
