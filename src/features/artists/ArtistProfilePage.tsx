import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BadgeCheck, Music2, Video, Info, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import {
  getArtistBySlug,
  followArtist,
  unfollowArtist,
  isFollowingArtist,
  type Artist,
} from '@/features/discovery/FeaturedArtistsService';
import { supabase } from '@/lib/supabase';

// ── ArtistProfilePage ─────────────────────────────────────────
// Full artist profile with hero, tabs: Music | Competition Videos | About.

type Tab = 'music' | 'videos' | 'about';

interface Track {
  id: string;
  title: string;
  cover_url: string | null;
  stream_count: number;
  genre: string | null;
  audio_url: string | null;
  created_at: string;
}

interface CompetitionEntry {
  id: string;
  title: string;
  thumbnail_url: string | null;
  votes_count: number;
  ai_score: number | null;
  status: string;
  room_id: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    winner: { label: 'Winner', color: '#FFB800' },
    live: { label: 'Live', color: '#00F5A0' },
    pending: { label: 'Pending', color: '#9D4EDD' },
    eliminated: { label: 'Eliminated', color: '#FF6B00' },
  };
  const s = map[status] ?? { label: status, color: '#C0C0C0' };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}
    >
      {s.label}
    </span>
  );
}

export default function ArtistProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<CompetitionEntry[]>([]);
  const [tab, setTab] = useState<Tab>('music');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch auth user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // Fetch artist
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getArtistBySlug(slug).then((a) => {
      setArtist(a);
      setLoading(false);
    });
  }, [slug]);

  // Fetch tracks
  useEffect(() => {
    if (!artist) return;
    supabase
      .from('tracks')
      .select('id, title, cover_url, stream_count, genre, audio_url, created_at')
      .eq('artist_id', artist.id)
      .order('stream_count', { ascending: false })
      .limit(50)
      .then(({ data }) => setTracks((data ?? []) as Track[]));
  }, [artist]);

  // Fetch competition entries
  useEffect(() => {
    if (!artist?.user_id) return;
    supabase
      .from('competition_entries_v2')
      .select('id, title, thumbnail_url, votes_count, ai_score, status, room_id')
      .eq('user_id', artist.user_id)
      .order('votes_count', { ascending: false })
      .limit(30)
      .then(({ data }) => setVideos((data ?? []) as CompetitionEntry[]));
  }, [artist]);

  // Check follow status
  useEffect(() => {
    if (!artist || !currentUserId) return;
    isFollowingArtist(artist.id, currentUserId).then(setFollowing);
  }, [artist, currentUserId]);

  const handleFollow = useCallback(async () => {
    if (!artist || !currentUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowArtist(artist.id, currentUserId);
        setFollowing(false);
      } else {
        await followArtist(artist.id, currentUserId);
        setFollowing(true);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setFollowLoading(false);
    }
  }, [artist, currentUserId, following, followLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0814' }}>
        <Loader2 className="animate-spin text-cyan-400" size={40} />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0814' }}>
        <p className="text-gray-400 text-lg">Artist not found.</p>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'music', label: 'Music', icon: <Music2 size={16} /> },
    { id: 'videos', label: 'Competition Videos', icon: <Video size={16} /> },
    { id: 'about', label: 'About', icon: <Info size={16} /> },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0B0814', color: '#fff' }}>
      {/* ── Hero ── */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        {artist.banner_url ? (
          <img
            src={artist.banner_url}
            alt={`${artist.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg, #0B0814 0%, #1a1f45 50%, #0B0814 100%)' }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0B0814 0%, transparent 60%)' }} />
      </div>

      {/* ── Profile info ── */}
      <div className="relative px-4 md:px-8 -mt-20 pb-6">
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-end">
          {/* Avatar */}
          <div
            className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 shrink-0"
            style={{ borderColor: '#00D9FF' }}
          >
            {artist.photo_url ? (
              <img src={artist.photo_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-5xl font-bold"
                style={{ background: '#1a1f45', color: '#00D9FF' }}
              >
                {artist.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Name / meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold truncate">{artist.name}</h1>
              {artist.verified && (
                <BadgeCheck size={28} style={{ color: '#00D9FF' }} aria-label="Verified" />
              )}
            </div>
            {artist.genre && (
              <p className="text-sm mt-1" style={{ color: '#00D9FF' }}>
                {artist.genre}
                {artist.country && ` · ${artist.country}`}
              </p>
            )}
            {/* Stats */}
            <div className="flex gap-6 mt-3 flex-wrap">
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: '#FFB800' }}>
                  {formatNumber(artist.streams ?? 0)}
                </p>
                <p className="text-xs text-gray-400">Streams</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: '#00F5A0' }}>
                  {formatNumber(artist.followers ?? 0)}
                </p>
                <p className="text-xs text-gray-400">Followers</p>
              </div>
            </div>
          </div>

          {/* Follow button */}
          {currentUserId && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0"
              style={
                following
                  ? { background: 'rgba(0,217,255,0.1)', color: '#00D9FF', border: '1px solid #00D9FF' }
                  : { background: '#00D9FF', color: '#0B0814', border: 'none' }
              }
            >
              {followLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : following ? (
                <UserCheck size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-20 px-4 md:px-8 border-b" style={{ background: '#0B0814', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex gap-0 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors"
              style={
                tab === t.id
                  ? { borderColor: '#00D9FF', color: '#00D9FF' }
                  : { borderColor: 'transparent', color: '#9ca3af' }
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 md:px-8 py-6">
        {/* Music */}
        {tab === 'music' && (
          <div>
            {tracks.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No tracks released yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {tracks.map((track, i) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/5"
                  >
                    <span className="w-6 text-right text-gray-500 text-sm shrink-0">{i + 1}</span>
                    <div
                      className="w-12 h-12 rounded-lg overflow-hidden shrink-0"
                      style={{ background: '#1a1f45' }}
                    >
                      {track.cover_url ? (
                        <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 size={20} style={{ color: '#9D4EDD' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-xs text-gray-400">{track.genre ?? 'Unknown genre'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: '#FFB800' }}>
                        {formatNumber(track.stream_count ?? 0)}
                      </p>
                      <p className="text-xs text-gray-500">streams</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Competition Videos */}
        {tab === 'videos' && (
          <div>
            {videos.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No competition entries yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/talent-arena/room/${entry.room_id}`}
                    className="block rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
                    style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="relative aspect-video bg-gray-900">
                      {entry.thumbnail_url ? (
                        <img
                          src={entry.thumbnail_url}
                          alt={entry.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video size={32} style={{ color: '#9D4EDD' }} />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <StatusBadge status={entry.status} />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold truncate">{entry.title}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400">
                          {formatNumber(entry.votes_count ?? 0)} votes
                        </span>
                        {entry.ai_score != null && (
                          <span className="text-xs" style={{ color: '#00F5A0' }}>
                            AI: {entry.ai_score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About */}
        {tab === 'about' && (
          <div className="max-w-2xl">
            <div
              className="p-6 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-lg font-semibold mb-3">Biography</h2>
              {artist.bio ? (
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{artist.bio}</p>
              ) : (
                <p className="text-gray-500 italic">No biography added yet.</p>
              )}
              <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
                {artist.genre && (
                  <div>
                    <span className="text-gray-500">Genre</span>
                    <p className="font-medium mt-0.5">{artist.genre}</p>
                  </div>
                )}
                {artist.country && (
                  <div>
                    <span className="text-gray-500">Country</span>
                    <p className="font-medium mt-0.5">{artist.country}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="font-medium mt-0.5" style={{ color: artist.verified ? '#00F5A0' : '#9ca3af' }}>
                    {artist.verified ? 'Verified Artist' : 'Independent'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
