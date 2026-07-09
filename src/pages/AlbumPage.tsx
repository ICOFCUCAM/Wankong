import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play, Pause, Shuffle, Music, Clock, Calendar,
  ChevronLeft, ExternalLink, Heart,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/components/GlobalPlayer';
import type { Track } from '@/components/GlobalPlayer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AlbumTrackRow {
  id:          string;
  title:       string;
  track_number: number;
  explicit:    boolean;
  duration_s:  number | null;
  audio_url:   string | null;
  stream_count: number;
}

interface Album {
  id:          string;
  title:       string;
  artist_name: string;
  artist_id:   string;
  cover_url:   string;
  release_date: string;
  release_type: 'single' | 'ep' | 'album';
  genre:       string;
  label:       string;
  tracks:      AlbumTrackRow[];
}

function fmt(sec: number | null | undefined): string {
  if (!sec) return '--:--';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function fmtTotal(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { play, togglePlay, currentTrack, isPlaying, liked, toggleLike } = usePlayer();

  const [album,   setAlbum]   = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!albumId) return;
    (async () => {
      // Fetch the album release
      const { data: rel } = await supabase
        .from('distribution_releases')
        .select('id, title, artwork_url, release_date, release_type, genre, label_name, artist_id, profiles:artist_id(full_name)')
        .eq('id', albumId)
        .maybeSingle();

      if (!rel) { setLoading(false); return; }

      // Fetch tracks for this release
      const { data: trackRows } = await supabase
        .from('tracks')
        .select('id, title, track_number, explicit, duration_s, audio_url, stream_count')
        .eq('release_id', albumId)
        .order('track_number', { ascending: true });

      setAlbum({
        id:           rel.id,
        title:        rel.title,
        artist_name:  (rel as any).profiles?.full_name || 'Unknown Artist',
        artist_id:    rel.artist_id,
        cover_url:    rel.artwork_url || '',
        release_date: rel.release_date || '',
        release_type: (rel.release_type as Album['release_type']) || 'album',
        genre:        rel.genre || '',
        label:        rel.label_name || '',
        tracks:       (trackRows ?? []) as AlbumTrackRow[],
      });
      setLoading(false);
    })();
  }, [albumId]);

  const handlePlayAll = (startIdx = 0, shuffle = false) => {
    if (!album || !album.tracks.length) return;
    let ordered = [...album.tracks].filter(t => t.audio_url);
    if (shuffle) {
      for (let i = ordered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      }
    }
    const first = ordered[startIdx] ?? ordered[0];
    const rest  = ordered.filter((_, i) => i !== (shuffle ? 0 : startIdx));
    const toTrack = (t: AlbumTrackRow): Track => ({
      id:       t.id,
      title:    t.title,
      artist:   album.artist_name,
      albumArt: album.cover_url,
      audioUrl: t.audio_url ?? undefined,
    });
    play(toTrack(first), rest.map(toTrack));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center text-center px-6">
        <Music className="w-12 h-12 text-white/20 mb-4" />
        <h1 className="text-white text-xl font-bold mb-2">Album not found</h1>
        <Link to="/" className="text-[#00D9FF] text-sm hover:underline">Back to Home</Link>
      </div>
    );
  }

  const totalDuration = album.tracks.reduce((s, t) => s + (t.duration_s ?? 0), 0);
  const isAlbumPlaying = isPlaying && album.tracks.some(t => t.id === currentTrack?.id);

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      {/* Gradient header */}
      <div className="relative pt-16 pb-0 overflow-hidden"
        style={{ background: 'linear-gradient(180deg,rgba(157,78,221,0.25) 0%,#0B0814 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-8 pb-10">

          {/* Breadcrumb */}
          <Link to={`/artists/${album.artist_id}`}
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to {album.artist_name}
          </Link>

          <div className="flex flex-col sm:flex-row gap-6">

            {/* Cover */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 shrink-0 mx-auto sm:mx-0">
              {album.cover_url
                ? <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
                    <Music className="w-16 h-16 text-white/20" />
                  </div>}
            </div>

            {/* Meta */}
            <div className="flex flex-col justify-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                {album.release_type}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">{album.title}</h1>
              <div className="flex items-center gap-2 mb-3">
                <Link to={`/artists/${album.artist_id}`}
                  className="text-white font-semibold hover:text-[#00D9FF] transition-colors">
                  {album.artist_name}
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-white/40 text-sm">
                {album.release_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(album.release_date).getFullYear()}
                  </span>
                )}
                <span>{album.tracks.length} {album.tracks.length === 1 ? 'track' : 'tracks'}</span>
                {totalDuration > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {fmtTotal(totalDuration)}
                  </span>
                )}
                {album.genre && <span className="capitalize">{album.genre}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => isAlbumPlaying ? togglePlay() : handlePlayAll()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}
            >
              {isAlbumPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              {isAlbumPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => handlePlayAll(0, true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-white/60 hover:border-white/30 hover:text-white transition-all text-sm font-semibold"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </button>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 pb-32">

        {album.tracks.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracks in this release yet.</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-3 mb-2 text-[11px] font-semibold text-white/25 uppercase tracking-wider border-b border-white/8 pb-2">
              <div className="w-6 text-center">#</div>
              <div className="flex-1">Title</div>
              <div className="hidden sm:block w-16 text-right">
                <Clock className="w-3.5 h-3.5 inline" />
              </div>
            </div>

            <div className="space-y-0.5">
              {album.tracks.map((t, i) => {
                const active = currentTrack?.id === t.id;
                return (
                  <div key={t.id}
                    className={`flex items-center gap-4 px-3 py-3 rounded-xl group transition-all cursor-pointer ${
                      active ? 'bg-[#9D4EDD]/10' : 'hover:bg-white/4'
                    }`}
                    onClick={() => t.audio_url && handlePlayAll(i)}
                  >
                    {/* Track number / playing indicator */}
                    <div className="w-6 text-center shrink-0">
                      {active && isPlaying ? (
                        <div className="flex gap-0.5 items-end h-3.5 justify-center">
                          {[3,5,4].map((h,j) => (
                            <div key={j} className="w-0.5 bg-[#9D4EDD] rounded-full animate-pulse"
                              style={{ height: h * 2.5 + 'px', animationDelay: j * 90 + 'ms' }} />
                          ))}
                        </div>
                      ) : (
                        <span className={`text-xs font-semibold tabular-nums group-hover:hidden ${active ? 'text-[#9D4EDD]' : 'text-white/30'}`}>
                          {t.track_number || i + 1}
                        </span>
                      )}
                      {!active && (
                        <Play className="w-3.5 h-3.5 text-white fill-white hidden group-hover:block mx-auto" />
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-[#9D4EDD]' : 'text-white'}`}>
                        {t.title}
                        {t.explicit && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/40 font-bold align-middle">E</span>
                        )}
                      </p>
                    </div>

                    {/* Like */}
                    <button onClick={e => { e.stopPropagation(); toggleLike(t.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Heart className={`w-4 h-4 transition-colors ${liked.has(t.id) ? 'fill-[#FF006E] text-[#FF006E]' : 'text-white/30 hover:text-white'}`} />
                    </button>

                    {/* Duration */}
                    <div className="hidden sm:block text-right w-16 shrink-0">
                      <span className="text-xs text-white/35 tabular-nums">{fmt(t.duration_s)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Release meta footer */}
        <div className="mt-10 text-white/20 text-xs space-y-1">
          {album.release_date && <p>{new Date(album.release_date).getFullYear()} {album.artist_name}</p>}
          {album.label && <p>{album.label}</p>}
        </div>
      </div>

      <Footer />
    </div>
  );
}
