import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Music, Heart, Play, Pause, ListMusic, Users,
  BookOpen, Trophy, Loader2, Radio,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/components/GlobalPlayer';
import { usePlaylist } from '@/hooks/usePlaylist';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FollowedCreator {
  id:           string;
  artist_id:    string;
  display_name: string;
  avatar_url:   string | null;
  slug:         string | null;
}

// ── Small track row ───────────────────────────────────────────────────────────

function TrackRow({ title, artist, cover, audioUrl, id, isActive, isPlaying, onPlay }: {
  title:     string;
  artist:    string;
  cover?:    string | null;
  audioUrl?: string | null;
  id:        string;
  isActive:  boolean;
  isPlaying: boolean;
  onPlay:    () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${isActive ? 'bg-indigo-600/15 border border-indigo-500/20' : 'hover:bg-white/5'}`}
    >
      <div className="relative w-10 h-10 rounded-lg bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center">
        {cover
          ? <img src={cover} alt="" className="w-full h-full object-cover" />
          : <Music className="w-4 h-4 text-gray-500" />}
        {isActive && (
          <div className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center">
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white text-white" /> : <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-400' : 'text-white'}`}>{title}</p>
        <p className="text-xs text-gray-400 truncate">{artist}</p>
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ icon, label, count, href, colour }: {
  icon:   React.ReactNode;
  label:  string;
  count:  number;
  href:   string;
  colour: string;
}) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-0.5"
      style={{ background: `${colour}08`, borderColor: `${colour}22` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: `${colour}18`, color: colour }}>
        {icon}
      </div>
      <div>
        <p className="text-white font-semibold text-sm">{label}</p>
        <p className="text-gray-500 text-xs">{count} item{count !== 1 ? 's' : ''}</p>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListenerDashboardPage() {
  const { user }                            = useAuth();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer();
  const pl                                  = usePlaylist();

  const [followed, setFollowed]             = useState<FollowedCreator[]>([]);
  const [loadingFollowed, setLoadingFollowed] = useState(true);

  // Load playlists + saved tracks from hook
  useEffect(() => { pl.loadAll(); }, []); // eslint-disable-line

  // Load followed creators
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('artist_followers')
        .select(`
          id,
          artist_id,
          artists:artist_id (
            display_name,
            avatar_url,
            slug
          )
        `)
        .eq('follower_id', user.id)
        .limit(12);

      if (data) {
        setFollowed(data.map((row: any) => ({
          id:           row.id,
          artist_id:    row.artist_id,
          display_name: row.artists?.display_name ?? 'Artist',
          avatar_url:   row.artists?.avatar_url ?? null,
          slug:         row.artists?.slug ?? null,
        })));
      }
      setLoadingFollowed(false);
    })();
  }, [user]);

  // Derived data
  const likedSongs      = pl.savedTracks.filter(t => t.content_type === 'music');
  const savedAudiobooks = pl.savedTracks.filter(t => t.content_type === 'audiobook');
  const savedPodcasts   = pl.savedTracks.filter(t => t.content_type === 'podcast');
  const recentTracks    = usePlayer().recentlyPlayed.slice(0, 8);

  const handlePlay = (t: { id: string; title: string; artist?: string | null; cover_url?: string | null; audio_url?: string | null }) => {
    if (currentTrack?.id === t.id) { togglePlay(); return; }
    if (!t.audio_url) return;
    play({
      id:       t.id,
      title:    t.title,
      artist:   t.artist ?? 'Unknown',
      albumArt: t.cover_url ?? undefined,
      audioUrl: t.audio_url,
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-10 space-y-10">

        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-black text-white">Your Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Your music, your library, your vibe.</p>
        </div>

        {/* Quick-access tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <SectionCard icon={<Heart className="w-5 h-5" />}    label="Liked Songs"    count={likedSongs.length}      href="/library"     colour="#FF4466" />
          <SectionCard icon={<ListMusic className="w-5 h-5" />} label="Playlists"     count={pl.myPlaylists.length}  href="/library"     colour="#9D4EDD" />
          <SectionCard icon={<BookOpen className="w-5 h-5" />}  label="Audiobooks"    count={savedAudiobooks.length} href="/library"     colour="#FFB800" />
          <SectionCard icon={<Radio className="w-5 h-5" />}     label="Podcasts"      count={savedPodcasts.length}   href="/library"     colour="#00D9FF" />
        </div>

        {/* Recently Played */}
        {recentTracks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-[#00D9FF]" /> Recently Played
              </h2>
              <Link to="/library" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-2xl p-2 space-y-0.5">
              {recentTracks.map(t => (
                <TrackRow
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  artist={t.artist}
                  cover={t.albumArt ?? t.cover}
                  audioUrl={t.audioUrl}
                  isActive={currentTrack?.id === t.id}
                  isPlaying={currentTrack?.id === t.id && isPlaying}
                  onPlay={() => {
                    if (currentTrack?.id === t.id) { togglePlay(); return; }
                    if (t.audioUrl) play(t);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Liked Songs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400 fill-current" /> Liked Songs
              {likedSongs.length > 0 && <span className="text-sm font-normal text-gray-500">({likedSongs.length})</span>}
            </h2>
            <Link to="/library" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          </div>

          {likedSongs.length === 0 ? (
            <div className="py-8 text-center bg-white/3 border border-white/8 rounded-2xl">
              <Heart className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No liked songs yet.</p>
              <p className="text-gray-500 text-xs mt-1">Tap the heart on any track to save it here.</p>
            </div>
          ) : (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-2 space-y-0.5">
              {likedSongs.slice(0, 6).map(t => (
                <TrackRow
                  key={t.id}
                  id={t.track_id}
                  title={t.title}
                  artist={t.artist ?? ''}
                  cover={t.cover_url}
                  audioUrl={t.audio_url}
                  isActive={currentTrack?.id === t.track_id}
                  isPlaying={currentTrack?.id === t.track_id && isPlaying}
                  onPlay={() => handlePlay({ id: t.track_id, title: t.title, artist: t.artist, cover_url: t.cover_url, audio_url: t.audio_url })}
                />
              ))}
              {likedSongs.length > 6 && (
                <Link to="/library" className="block w-full pt-2 text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  + {likedSongs.length - 6} more in library
                </Link>
              )}
            </div>
          )}
        </section>

        {/* My Playlists */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-[#9D4EDD]" /> My Playlists
              {pl.myPlaylists.length > 0 && <span className="text-sm font-normal text-gray-500">({pl.myPlaylists.length})</span>}
            </h2>
            <Link to="/library" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Manage →
            </Link>
          </div>

          {pl.myPlaylists.length === 0 ? (
            <div className="py-8 text-center bg-white/3 border border-white/8 rounded-2xl border-dashed">
              <ListMusic className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No playlists yet.</p>
              <Link to="/library" className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Create your first playlist →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pl.myPlaylists.slice(0, 8).map(p => (
                <Link
                  key={p.id}
                  to="/library"
                  className="group flex flex-col bg-white/3 border border-white/8 hover:border-indigo-500/30 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                >
                  <div className="aspect-square bg-gradient-to-br from-indigo-600/30 to-purple-700/30 flex items-center justify-center overflow-hidden">
                    {p.cover_url
                      ? <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                      : <Music className="w-10 h-10 text-white/20" />}
                  </div>
                  <div className="p-2.5">
                    <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-gray-500 text-[11px]">{p.track_count} tracks</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Followed Creators */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00F5A0]" /> Following
            {followed.length > 0 && <span className="text-sm font-normal text-gray-500">({followed.length})</span>}
          </h2>

          {loadingFollowed ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : followed.length === 0 ? (
            <div className="py-8 text-center bg-white/3 border border-white/8 rounded-2xl">
              <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Not following anyone yet.</p>
              <Link to="/collections/music" className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Discover artists →
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {followed.map(creator => (
                <Link
                  key={creator.id}
                  to={creator.slug ? `/artists/${creator.slug}` : `/artist/${creator.artist_id}`}
                  className="flex-shrink-0 flex flex-col items-center gap-2 w-20 group"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-indigo-500 transition-all">
                    {creator.avatar_url
                      ? <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <Users className="w-6 h-6 text-white/50" />}
                  </div>
                  <p className="text-[11px] text-gray-400 group-hover:text-white transition-colors text-center truncate w-full">
                    {creator.display_name}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Explore links */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4">
          {[
            { label: 'Browse Music',       href: '/collections/music',      icon: <Music className="w-4 h-4" />,    colour: '#9D4EDD' },
            { label: 'Talent Arena',       href: '/talent-arena',           icon: <Trophy className="w-4 h-4" />,   colour: '#FFB800' },
            { label: 'Audiobooks & Books', href: '/collections/audiobooks', icon: <BookOpen className="w-4 h-4" />, colour: '#00D9FF' },
          ].map(({ label, href, icon, colour }) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-0.5"
              style={{ background: `${colour}08`, borderColor: `${colour}22`, color: colour }}
            >
              {icon}
              <span className="text-sm font-semibold text-white">{label}</span>
            </Link>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
