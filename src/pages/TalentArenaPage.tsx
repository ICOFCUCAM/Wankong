import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CompetitionRoomCard, { RoomCardData } from '@/components/competition/CompetitionRoomCard';
import CompetitionCountdown from '@/components/competition/CompetitionCountdown';
import DefaultPerformanceThumbnail from '@/components/media/DefaultPerformanceThumbnail';
import SubtitleSelector from '@/components/SubtitleSelector';
import { Trophy, Play, Heart, Bell, Upload, Star, Loader2, ChevronRight, TrendingUp, Clock } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Entry {
  id: string;
  competitionId: string;
  artistName: string;
  title: string;
  mediaUrl: string;
  mediaType: 'audio' | 'video';
  votes: number;
  hasVoted?: boolean;
  avatarColor: string;
  thumbnailUrl?: string | null;
}

interface WeeklyWinner {
  week: string;
  competitionTitle: string;
  artistName: string;
  prize: string;
  votes: number;
  gradient?: string;
}

interface UpcomingComp {
  id: string;
  title: string;
  category: string;
  prize: string;
  startsAt: string;
  gradient: string;
}

const GRADIENTS = [
  'from-[#9D4EDD]/50 to-[#00D9FF]/30',
  'from-[#FFB800]/40 to-[#FF6B00]/20',
  'from-[#00F5A0]/40 to-[#00D9FF]/20',
  'from-[#FF6B00]/40 to-[#9D4EDD]/20',
  'from-[#00D9FF]/50 to-[#9D4EDD]/30',
];

const CATEGORY_FILTERS = ['All', 'Music', 'Dance', 'Comedy', 'Spoken Word', 'Choir', 'Gospel', 'Traditional', 'Afrobeats'];
const SORT_OPTIONS = ['Most Voted', 'Newest', 'Trending', "Editor's Picks"];

// Session-level vote dedup
const votedSet = new Set<string>();

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden animate-pulse">
      <div className="h-40 bg-white/5" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-white/10 rounded w-3/4" />
        <div className="h-2 bg-white/5 rounded w-1/2" />
        <div className="h-8 bg-white/5 rounded mt-3" />
        <div className="h-8 bg-gradient-to-r from-[#9D4EDD]/20 to-[#00D9FF]/20 rounded" />
      </div>
    </div>
  );
}

// ── Vote Button (inline, session-level) ───────────────────────────────────────
function InlineVoteButton({ entry, onVote }: { entry: Entry; onVote: (id: string) => void }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const voted      = votedSet.has(entry.id);

  const handleClick = async () => {
    if (!user) { navigate('/auth/login'); return; }
    if (voted) return;
    votedSet.add(entry.id);
    onVote(entry.id);
    try {
      await supabase.from('competition_votes').insert({
        entry_id:   entry.id,
        user_id:    user.id,
        session_id: sessionStorage.getItem('vid') || Math.random().toString(36).slice(2),
      });
    } catch { /* server dedup handles conflicts */ }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
        ${voted ? 'bg-[#FF6B00]/20 text-[#FF6B00] cursor-default' : 'bg-white/10 text-white hover:bg-[#FF6B00]/20 hover:text-[#FF6B00]'}`}
    >
      <Heart className={`w-3.5 h-3.5 ${voted ? 'fill-[#FF6B00]' : ''}`} />
      {entry.votes.toLocaleString()} {voted ? '(voted)' : 'Vote'}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TalentArenaPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const userRole  = user?.user_metadata?.role || 'user';
  const isSinger  = ['singer_artist', 'admin'].includes(userRole);

  const [loading,      setLoading]      = useState(true);
  const [category,     setCategory]     = useState('All');
  const [sort,         setSort]         = useState('Most Voted');
  const [entries,      setEntries]      = useState<Entry[]>([]);
  const [liveRooms,    setLiveRooms]    = useState<RoomCardData[]>([]);
  const [upcoming,     setUpcoming]     = useState<UpcomingComp[]>([]);
  const [winners,      setWinners]      = useState<WeeklyWinner[]>([]);
  const [notified,     setNotified]     = useState<Set<string>>(new Set());
  const [heroBg,       setHeroBg]       = useState(0);
  const [arenaStats,   setArenaStats]   = useState({ totalPrizes: 0, highestVotes: 0, activeEntries: 0, totalRooms: 0 });

  // Video modal + subtitle state
  const [videoModal,    setVideoModal]    = useState<Entry | null>(null);
  const [activeVttUrl,  setActiveVttUrl]  = useState<string | null>(null);

  // Submission form state (preserved from original)
  const [subForm, setSubForm] = useState({ competitionId: '', title: '', mediaType: 'audio' as 'audio' | 'video', mediaFile: null as File | null });
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subSuccess,    setSubSuccess]    = useState(false);

  // Animate hero gradient
  useEffect(() => {
    const id = setInterval(() => setHeroBg(p => (p + 1) % 3), 4000);
    return () => clearInterval(id);
  }, []);

  // Load real data
  useEffect(() => {
    const load = async () => {
      const [roomsRes, entriesRes, activeCountRes, prizeSumRes, maxVotesRes] = await Promise.all([
        supabase
          .from('competition_rooms')
          .select('id, title, category, description, prize_pool, end_date, status, cover_url')
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('competition_entries_v2')
          .select('id, room_id, title, performer_name, video_url, preview_clip_url, thumbnail_url, votes_count, is_winner, reviewed_at, profiles:user_id(display_name, avatar_url), competition_rooms:room_id(title, prize_pool)')
          .in('status', ['live', 'approved', 'winner'])
          .order('votes_count', { ascending: false })
          .limit(18),
        // Active entries count
        supabase.from('competition_entries_v2').select('*', { count: 'exact', head: true }).eq('status', 'live'),
        // Total prize pool across all rooms
        supabase.from('competition_rooms').select('prize_pool').neq('status', 'draft'),
        // Highest vote count
        supabase.from('competition_entries_v2').select('votes_count').order('votes_count', { ascending: false }).limit(1),
      ]);

      const totalPrizes  = (prizeSumRes.data ?? []).reduce((s: number, r: any) => s + Number(r.prize_pool ?? 0), 0);
      const highestVotes = (maxVotesRes.data ?? [])[0]?.votes_count ?? 0;
      setArenaStats({
        totalPrizes,
        highestVotes,
        activeEntries: activeCountRes.count ?? 0,
        totalRooms:    (roomsRes.data ?? []).length,
      });

      const rooms = roomsRes.data ?? [];

      // Partition rooms
      const live: RoomCardData[]    = [];
      const upcoming: UpcomingComp[] = [];
      rooms.forEach((r: any, i: number) => {
        const gradient = GRADIENTS[i % GRADIENTS.length];
        if (r.status === 'open') {
          live.push({
            id:          r.id,
            title:       r.title,
            category:    r.category,
            description: r.description,
            prize_info:  r.prize_pool,
            deadline:    r.end_date,
            banner_url:  r.cover_url,
            status:      'live',
            gradient,
          });
        } else if (r.status === 'draft' || r.status === 'closed') {
          upcoming.push({
            id:       r.id,
            title:    r.title,
            category: r.category ?? '',
            prize:    r.prize_pool ?? '—',
            startsAt: r.end_date ?? new Date(Date.now() + 21 * 86400000).toISOString(),
            gradient,
          });
        }
      });
      setLiveRooms(live);
      setUpcoming(upcoming.slice(0, 3));

      // Winners from is_winner entries
      const allEntries = entriesRes.data ?? [];
      const winnerRows = allEntries.filter((e: any) => e.is_winner);
      setWinners(winnerRows.slice(0, 3).map((e: any, i: number) => {
        const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
        const room    = Array.isArray(e.competition_rooms) ? e.competition_rooms[0] : e.competition_rooms;
        return {
          week:             e.reviewed_at ? `Week of ${new Date(e.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '—',
          competitionTitle: room?.title ?? 'Competition',
          artistName:       profile?.display_name ?? e.performer_name ?? 'Artist',
          prize:            room?.prize_pool ?? '—',
          votes:            e.votes_count ?? 0,
          gradient:         GRADIENTS[i % GRADIENTS.length],
        };
      }));

      // Voteable entries (non-winner live entries)
      const voteEntries = allEntries.filter((e: any) => !e.is_winner).map((e: any, i: number) => {
        const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
        return {
          id:            e.id,
          competitionId: e.room_id ?? '',
          artistName:    profile?.display_name ?? e.performer_name ?? 'Artist',
          title:         e.title ?? 'Untitled',
          mediaUrl:      e.video_url ?? e.preview_clip_url ?? '',
          mediaType:     e.video_url ? 'video' as const : 'audio' as const,
          votes:         e.votes_count ?? 0,
          avatarColor:   GRADIENTS[i % GRADIENTS.length].replace('from-', 'from-').replace('/50', '').replace('/40', ''),
          thumbnailUrl:  e.thumbnail_url ?? null,
        };
      });
      setEntries(voteEntries);
      setLoading(false);
    };
    load();
  }, []);

  // Realtime votes subscription
  useEffect(() => {
    const ch = supabase
      .channel('talent-arena-votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'competition_votes' }, payload => {
        setEntries(prev => prev.map(e => e.id === payload.new.entry_id ? { ...e, votes: e.votes + 1 } : e));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleVote = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, votes: e.votes + 1 } : e));
  };

  const handleNotify = async (compId: string) => {
    if (!user) { navigate('/auth/login'); return; }
    setNotified(prev => new Set(prev).add(compId));
    try {
      await supabase.from('competition_notifications').insert({ competition_id: compId, user_id: user.id });
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    setSubSubmitting(true);
    try {
      await supabase.from('admin_logs').insert({
        action: 'talent_entry_submitted',
        entity_type: 'competition_entry',
        entity_id: subForm.competitionId,
        details: { title: subForm.title, mediaType: subForm.mediaType },
        performed_by: user?.id,
      });
      setSubSuccess(true);
    } catch { /* ignore */ } finally { setSubSubmitting(false); }
  };

  // Filter + sort entries
  const filteredRooms = category === 'All'
    ? liveRooms
    : liveRooms.filter(r => r.category?.toLowerCase() === category.toLowerCase());

  const daysSince = (dateStr: string) =>
    Math.max(1, (Date.now() - new Date(dateStr).getTime()) / 86_400_000);

  const sortedEntries = [...entries].sort((a, b) => {
    if (sort === 'Most Voted')    return b.votes - a.votes;
    if (sort === 'Newest')        return new Date(b.reviewed_at ?? b.id).getTime() - new Date(a.reviewed_at ?? a.id).getTime();
    if (sort === 'Trending')      return (b.votes / daysSince(b.reviewed_at ?? b.id)) - (a.votes / daysSince(a.reviewed_at ?? a.id));
    if (sort === "Editor's Picks") return (b.is_winner ? 1 : 0) - (a.is_winner ? 1 : 0) || b.votes - a.votes;
    return 0;
  });

  const heroBgs = [
    'from-[#9D4EDD]/30 via-[#0B0814] to-[#00D9FF]/20',
    'from-[#FFB800]/25 via-[#0B0814] to-[#9D4EDD]/20',
    'from-[#00D9FF]/25 via-[#0B0814] to-[#00F5A0]/20',
  ];

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* ── VIDEO MODAL with SubtitleSelector ── */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setVideoModal(null); setActiveVttUrl(null); }}
        >
          <div
            className="w-full max-w-2xl bg-[#0B0814] rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="font-bold text-white text-sm">{videoModal.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{videoModal.artistName}</p>
              </div>
              <button
                onClick={() => { setVideoModal(null); setActiveVttUrl(null); }}
                className="text-gray-400 hover:text-white text-2xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>
            {/* Video player */}
            <div className="relative bg-black aspect-video">
              {videoModal.mediaUrl ? (
                <video
                  key={videoModal.id}
                  className="w-full h-full"
                  controls
                  autoPlay
                  crossOrigin="anonymous"
                >
                  <source src={videoModal.mediaUrl} />
                  {activeVttUrl && <track kind="subtitles" src={activeVttUrl} default />}
                </video>
              ) : (
                <DefaultPerformanceThumbnail gradient={videoModal.avatarColor} label={videoModal.title} />
              )}
            </div>
            {/* Subtitle selector */}
            <div className="px-5 py-4 border-t border-white/10 bg-white/3">
              <SubtitleSelector entryId={videoModal.id} onSelect={setActiveVttUrl} />
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className={`absolute inset-0 bg-gradient-to-br ${heroBgs[heroBg]} transition-all`} style={{ transitionDuration: '3000ms' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(157,78,221,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,217,255,0.12),transparent_55%)]" />

        <div className="relative max-w-6xl mx-auto px-4 lg:px-8 py-20">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
            <span className="text-[#00F5A0] text-xs font-bold uppercase tracking-widest">Live Now</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-none">
            Upload. Compete.<br />
            <span className="bg-gradient-to-r from-[#9D4EDD] via-[#00D9FF] to-[#00F5A0] bg-clip-text text-transparent">
              Win Prizes.
            </span>
          </h1>
          <p className="text-white/55 text-lg max-w-lg mb-8 leading-relaxed">
            The global stage for creators of every kind. Compete in live arenas, earn real prizes, and get discovered by millions.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/artist/upload-performance"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25"
            >
              <Upload className="w-4 h-4" /> Submit Performance
            </Link>
            <a
              href="#live-rooms"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/15 text-white font-semibold rounded-xl text-sm hover:bg-white/15 transition-colors"
            >
              <Play className="w-4 h-4" /> Explore Rooms
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-10">
            {([
              [`$${arenaStats.totalPrizes.toLocaleString()}`, 'Total Prizes Awarded'],
              [arenaStats.highestVotes.toLocaleString(), 'Highest Vote Count'],
              [arenaStats.activeEntries.toString(), 'Active Entries'],
            ] as [string, string][]).map(([val, lbl]) => (
              <div key={lbl}>
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-gray-500 text-xs">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FILTER BAR ── */}
      <div className="sticky top-0 z-20 bg-[#0B0814]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                ${category === cat
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}
          <div className="ml-auto shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#9D4EDD]/50"
            >
              {SORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8">

        {/* ── LIVE ROOMS ── */}
        <section id="live-rooms" className="py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
                <span className="text-[#00F5A0] text-xs font-bold uppercase tracking-widest">Live</span>
              </div>
              <h2 className="text-2xl font-black text-white">Active Competition Rooms</h2>
            </div>
            <Link to="/collections/talent-arena" className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No rooms match this filter.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredRooms.map(room => (
                <CompetitionRoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>

        {/* ── OPEN VOTING NOW ── */}
        <section className="py-12 border-t border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span className="text-[#FF6B00] text-xs font-bold uppercase tracking-widest">Vote Now</span>
              </div>
              <h2 className="text-2xl font-black text-white">Open Voting</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
              Real-time votes
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedEntries.map((entry, idx) => (
                <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all group">
                  {/* Thumbnail */}
                  <div
                    className={`relative aspect-video overflow-hidden ${entry.mediaType === 'video' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (entry.mediaType === 'video') {
                        setVideoModal(entry);
                        setActiveVttUrl(null);
                      }
                    }}
                  >
                    {entry.thumbnailUrl ? (
                      <img src={entry.thumbnailUrl} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <DefaultPerformanceThumbnail
                        gradient={entry.avatarColor}
                        label={entry.title}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {/* Play overlay for video entries */}
                    {entry.mediaType === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                    {/* Rank badge */}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                      ${idx === 0 ? 'bg-[#FFB800] text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/20 text-white'}`}>
                      #{idx + 1}
                    </div>
                    {/* Media type */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-gray-300 uppercase">
                      {entry.mediaType}
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-3">
                    <p className="text-white font-semibold text-sm truncate">{entry.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{entry.artistName}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-500 rounded-full">{entry.competitionId.replace('room-', 'Room #')}</span>
                      <InlineVoteButton entry={entry} onVote={handleVote} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── UPCOMING COMPETITIONS ── */}
        <section className="py-12 border-t border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span className="text-[#00D9FF] text-xs font-bold uppercase tracking-widest">Coming Soon</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-6">Upcoming Competitions</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(comp => {
              const isNotified = notified.has(comp.id);
              return (
                <div key={comp.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-[#00D9FF]/30 transition-all">
                  {/* Thumbnail */}
                  <div className="relative h-36 overflow-hidden">
                    <DefaultPerformanceThumbnail gradient={comp.gradient} label={comp.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0814]/80 to-transparent" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#00D9FF]/20 border border-[#00D9FF]/30 text-[#00D9FF] text-[9px] font-bold rounded-full">
                      UPCOMING
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#FFB800] text-black text-[9px] font-black rounded-lg">
                      {comp.prize}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-white font-semibold text-sm truncate">{comp.title}</p>
                    <p className="text-xs text-gray-400 mb-3">{comp.category}</p>
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-500 mb-1">Starts in</p>
                      <CompetitionCountdown deadline={comp.startsAt} compact />
                    </div>
                    <button
                      onClick={() => handleNotify(comp.id)}
                      disabled={isNotified}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all
                        ${isNotified
                          ? 'bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/20 cursor-default'
                          : 'bg-white/5 border border-white/10 text-gray-300 hover:border-[#00D9FF]/40 hover:text-[#00D9FF]'}`}
                    >
                      <Bell className={`w-3.5 h-3.5 ${isNotified ? 'fill-[#00F5A0]' : ''}`} />
                      {isNotified ? 'Notified!' : 'Notify Me'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PAST WINNERS ── */}
        <section className="py-12 border-t border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-3.5 h-3.5 text-[#FFB800]" />
                <span className="text-[#FFB800] text-xs font-bold uppercase tracking-widest">Hall of Fame</span>
              </div>
              <h2 className="text-2xl font-black text-white">Past Winners</h2>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {([
              [`$${arenaStats.totalPrizes.toLocaleString()}`, 'Total Prizes Awarded'],
              [arenaStats.highestVotes.toLocaleString(), 'Highest Vote Count'],
              [arenaStats.totalRooms.toString(), 'Competitions Held'],
            ] as [string, string][]).map(([val, lbl]) => (
              <div key={lbl} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-[#FFB800]">{val}</p>
                <p className="text-gray-400 text-xs mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {winners.map((w, i) => (
              <div key={i} className="bg-white/5 border border-[#FFB800]/20 rounded-xl overflow-hidden hover:border-[#FFB800]/40 transition-all">
                {/* Thumbnail */}
                <div className="relative h-32 overflow-hidden">
                  <DefaultPerformanceThumbnail gradient={w.gradient ?? 'from-[#FFB800]/40 to-[#FF6B00]/20'} label={w.artistName} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0814]/80 to-transparent" />
                  {/* Gold winner badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[#FFB800] text-black text-[9px] font-black rounded-full">
                    <Trophy className="w-2.5 h-2.5" /> WINNER
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-white font-semibold text-sm">{w.artistName}</p>
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{w.competitionTitle}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{w.week}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[#FFB800] font-black text-base">{w.prize}</span>
                    <span className="text-xs text-gray-500">{w.votes.toLocaleString()} votes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SUBMIT CTA STRIP ── */}
        <section className="py-12 border-t border-white/5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9D4EDD]/20 via-[#0D1635] to-[#00D9FF]/10 border border-[#9D4EDD]/20 p-8 md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(157,78,221,0.15),transparent_60%)]" />

            {/* Preview film strip */}
            <div className="absolute right-0 top-0 bottom-0 w-64 hidden md:flex flex-col gap-1 p-2 opacity-40 overflow-hidden">
              {['from-[#9D4EDD]/60 to-[#00D9FF]/30', 'from-[#FFB800]/50 to-[#FF6B00]/30', 'from-[#00F5A0]/50 to-[#00D9FF]/30', 'from-[#FF6B00]/50 to-[#9D4EDD]/30', 'from-[#00D9FF]/50 to-[#9D4EDD]/30'].map((g, i) => (
                <div key={i} className={`flex-1 rounded-lg bg-gradient-to-br ${g} flex items-center justify-center`}>
                  <Play className="w-4 h-4 text-white/40 fill-white/20" />
                </div>
              ))}
            </div>

            <div className="relative max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-5 h-5 text-[#9D4EDD]" />
                <span className="text-[#9D4EDD] text-xs font-bold uppercase tracking-widest">For Artists</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-3">
                Ready to compete?
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Upload your performance, get AI-scored, and compete against artists worldwide for real cash prizes.
              </p>

              {/* Pipeline */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-6">
                {['Upload', '→', 'AI Review', '→', 'Admin Approval', '→', 'Public Vote', '→', 'Win'].map((step, i) => (
                  <span key={i} className={step === '→' ? 'text-gray-700' : 'bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400'}>{step}</span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dashboard/artist/upload-performance"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
                >
                  <Upload className="w-4 h-4" /> Submit Your Entry
                </Link>
                {!user && (
                  <Link
                    to="/auth/login"
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/15 text-white font-semibold rounded-xl text-sm hover:bg-white/15 transition-colors"
                  >
                    Sign In First
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
