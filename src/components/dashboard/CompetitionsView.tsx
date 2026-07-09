import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';
import { formatCurrency } from '@/lib/constants';

interface Room {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  prize_pool: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  cover_url: string | null;
  entry_count: number;
}

interface LeaderEntry {
  id: string;
  rank: number;
  name: string;
  username: string;
  avatar: string;
  ai_score: number | null;
  votes_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  open:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  closed:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
  judging:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  draft:     'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function fmtPrize(raw: string | null): string {
  if (!raw) return '—';
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return formatCurrency(n);
}

export default function CompetitionsView() {
  const { isAuthenticated, setShowAuthModal, setAuthMode } = useApp();
  const [activeTab,    setActiveTab]    = useState<'all' | 'open' | 'judging' | 'completed'>('all');
  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [leaderboard,  setLeaderboard]  = useState<LeaderEntry[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [joinedRooms,  setJoinedRooms]  = useState<Set<string>>(new Set());
  const [voteState,    setVoteState]    = useState<Record<string, boolean>>({});
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    supabase
      .from('competition_rooms')
      .select('id, title, category, description, prize_pool, start_date, end_date, status, cover_url')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          // Count entries per room
          const ids = data.map((r: any) => r.id);
          const { data: counts } = await supabase
            .from('competition_entries_v2')
            .select('room_id')
            .in('room_id', ids)
            .in('status', ['live', 'approved', 'winner']);

          const countMap: Record<string, number> = {};
          (counts ?? []).forEach((e: any) => {
            countMap[e.room_id] = (countMap[e.room_id] ?? 0) + 1;
          });

          setRooms(data.map((r: any) => ({
            ...r,
            entry_count: countMap[r.id] ?? 0,
          })));

          // Load leaderboard for the first open room
          const openRoom = data.find((r: any) => r.status === 'open' || r.status === 'judging');
          if (openRoom) {
            const { data: entries } = await supabase
              .from('competition_entries_v2')
              .select('id, user_id, performer_name, ai_score, votes_count, profiles:user_id(display_name, username, avatar_url)')
              .eq('room_id', openRoom.id)
              .in('status', ['live', 'approved', 'winner'])
              .order('votes_count', { ascending: false })
              .limit(5);

            if (entries) {
              setLeaderboard(entries.map((e: any, i: number) => {
                const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
                return {
                  id:          e.id,
                  rank:        i + 1,
                  name:        profile?.display_name ?? e.performer_name ?? 'Creator',
                  username:    profile?.username ?? '',
                  avatar:      profile?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${e.user_id}`,
                  ai_score:    e.ai_score,
                  votes_count: e.votes_count ?? 0,
                };
              }));
            }
          }
        }
        setLoading(false);
      });
  }, []);

  const filtered = activeTab === 'all' ? rooms : rooms.filter(r => r.status === activeTab);

  const handleJoin = (roomId: string) => {
    if (!isAuthenticated) { setAuthMode('register'); setShowAuthModal(true); return; }
    setJoinedRooms(prev => { const next = new Set(prev); next.add(roomId); return next; });
  };

  const handleVote = (entryId: string) => {
    if (!isAuthenticated) { setAuthMode('login'); setShowAuthModal(true); return; }
    setVoteState(prev => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Competitions</h1>
        <p className="text-gray-400 mt-1">Compete, get scored by AI, and win prizes</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {(['all', 'open', 'judging', 'completed'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-40 bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-white/5 rounded w-2/3" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No competitions in this category.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(room => (
            <div key={room.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:border-[#9D4EDD]/20 transition-all group">
              <div className="relative h-40 overflow-hidden">
                {room.cover_url ? (
                  <img src={room.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-purple-600/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[room.status] ?? STATUS_COLORS.draft}`}>{room.status}</span>
                </div>
                {room.category && (
                  <div className="absolute bottom-3 left-3">
                    <span className="text-xs text-gray-300 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">{room.category}</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-1">{room.title}</h3>
                {room.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{room.description}</p>}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-lg font-bold text-emerald-400">{fmtPrize(room.prize_pool)}</p>
                    <p className="text-[10px] text-gray-500">Prize Pool</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-lg font-bold text-[#B794F4]">{room.entry_count}</p>
                    <p className="text-[10px] text-gray-500">Entries</p>
                  </div>
                </div>
                {(room.start_date || room.end_date) && (
                  <p className="text-xs text-gray-500 mb-4">
                    {room.start_date?.slice(0, 10)} — {room.end_date?.slice(0, 10)}
                  </p>
                )}
                <div className="flex gap-3">
                  {room.status === 'open' && !joinedRooms.has(room.id) ? (
                    <button onClick={() => handleJoin(room.id)} className="flex-1 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-medium py-2.5 rounded-xl transition-colors">Join Competition</button>
                  ) : room.status === 'open' && joinedRooms.has(room.id) ? (
                    <button className="flex-1 bg-emerald-600/20 text-emerald-400 font-medium py-2.5 rounded-xl border border-emerald-500/30 cursor-default">Joined</button>
                  ) : room.status === 'draft' ? (
                    <button className="flex-1 bg-blue-600/20 text-blue-400 font-medium py-2.5 rounded-xl border border-blue-500/30 cursor-default">Coming Soon</button>
                  ) : null}
                  <button onClick={() => setSelectedRoom(room)} className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors">Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-800">
            <h3 className="text-lg font-bold text-white">Live Leaderboard</h3>
            <p className="text-sm text-gray-400 mt-1">AI Score (40%) + Public Votes (20%) + Engagement (20%) + Judge Score (20%)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left p-4">Rank</th>
                  <th className="text-left p-4">Creator</th>
                  <th className="text-right p-4">AI Score</th>
                  <th className="text-right p-4">Votes</th>
                  <th className="text-right p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {leaderboard.map((entry, i) => (
                  <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={entry.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-medium text-white">{entry.name}</p>
                          {entry.username && <p className="text-xs text-gray-500">@{entry.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-medium text-[#B794F4]">{entry.ai_score != null ? entry.ai_score.toFixed(1) : '—'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm text-gray-300">{entry.votes_count.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleVote(entry.id)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${voteState[entry.id] ? 'bg-[#9D4EDD]/20 text-[#B794F4] border border-[#9D4EDD]/30' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                        {voteState[entry.id] ? 'Voted' : 'Vote'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedRoom(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {selectedRoom.cover_url ? (
              <img src={selectedRoom.cover_url} alt="" className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-[#9D4EDD]/30 to-purple-600/30" />
            )}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{selectedRoom.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[selectedRoom.status] ?? STATUS_COLORS.draft}`}>{selectedRoom.status}</span>
              </div>
              {selectedRoom.description && <p className="text-gray-400 text-sm mb-4">{selectedRoom.description}</p>}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Prize Pool</p>
                  <p className="text-lg font-bold text-emerald-400">{fmtPrize(selectedRoom.prize_pool)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Entries</p>
                  <p className="text-lg font-bold text-[#B794F4]">{selectedRoom.entry_count}</p>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-medium text-white mb-2">Scoring Formula</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  {[['AI Performance Score','40%'],['Public Votes','20%'],['Engagement Score','20%'],['Judge Score','20%']].map(([label, pct]) => (
                    <div key={label} className="flex justify-between">
                      <span>{label}</span><span className="text-[#B794F4]">{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="w-full bg-gray-800 text-gray-300 py-3 rounded-xl hover:bg-gray-700 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
