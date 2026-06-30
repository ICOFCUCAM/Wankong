import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/components/GlobalPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Pause } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RecoTrack {
  id: string;
  title: string;
  vendor: string;
  cover_image_url: string | null;
  audio_url: string | null;
  genre: string | null;
  stream_count: number | null;
  price: number | null;
  handle: string;
}

interface RecentlyPlayedEntry {
  id: string;
  genre: string | null;
  artist: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function readRecentlyPlayed(): RecentlyPlayedEntry[] {
  try {
    const raw = localStorage.getItem('wk_recently_played');
    return raw ? (JSON.parse(raw) as RecentlyPlayedEntry[]) : [];
  } catch {
    return [];
  }
}

function topGenres(entries: RecentlyPlayedEntry[], limit = 3): string[] {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    if (e.genre) counts[e.genre] = (counts[e.genre] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g);
}

// ── MiniCard ──────────────────────────────────────────────────────────────────

function MiniCard({ track }: { track: RecoTrack }) {
  const { play, currentTrack, isPlaying } = usePlayer();

  const isActive = currentTrack?.id === track.id;

  function handlePlay(e: React.MouseEvent) {
    e.preventDefault();
    play({
      id:       track.id,
      title:    track.title,
      artist:   track.vendor,
      albumArt: track.cover_image_url ?? undefined,
      audioUrl: track.audio_url ?? undefined,
    });
  }

  return (
    <Link
      to={`/products/${track.handle}`}
      className="group block shrink-0 w-[140px]"
      style={{ textDecoration: 'none' }}
    >
      {/* Cover art */}
      <div className="relative w-[140px] h-[140px] rounded-xl overflow-hidden bg-[#0D1635] mb-2.5">
        {track.cover_image_url ? (
          <img
            src={track.cover_image_url}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a2240] to-[#0D1635] flex items-center justify-center">
            <span className="text-3xl opacity-20">🎵</span>
          </div>
        )}

        {/* Play button overlay */}
        <button
          onClick={handlePlay}
          aria-label={isActive && isPlaying ? 'Pause' : 'Play'}
          className={`
            absolute inset-0 flex items-center justify-center
            bg-black/40 backdrop-blur-[2px]
            transition-opacity duration-200
            ${isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
        >
          <span
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${isActive ? 'bg-[#00D9FF]' : 'bg-white'}
              shadow-lg transition-transform duration-150 active:scale-95
            `}
          >
            {isActive && isPlaying ? (
              <Pause className="w-4 h-4 text-[#0B0814]" fill="#0B0814" />
            ) : (
              <Play className="w-4 h-4 text-[#0B0814] ml-0.5" fill="#0B0814" />
            )}
          </span>
        </button>

        {/* Active indicator ring */}
        {isActive && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-[#00D9FF] pointer-events-none" />
        )}
      </div>

      {/* Text */}
      <p className={`text-[13px] font-semibold truncate leading-tight ${isActive ? 'text-[#00D9FF]' : 'text-white'}`}>
        {track.title}
      </p>
      <p className="text-white/45 text-[11px] truncate mt-0.5">{track.vendor}</p>
    </Link>
  );
}

// ── Shelf ─────────────────────────────────────────────────────────────────────

interface ShelfProps {
  title: string;
  seeAllHref?: string;
  tracks: RecoTrack[];
  loading: boolean;
}

function Shelf({ title, seeAllHref, tracks, loading }: ShelfProps) {
  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-white font-bold text-base tracking-tight">{title}</h2>
        {seeAllHref && (
          <Link
            to={seeAllHref}
            className="text-[#00D9FF] text-xs font-semibold hover:text-[#00D9FF]/80 transition-colors"
          >
            See all →
          </Link>
        )}
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[140px]">
                <div className="w-[140px] h-[140px] rounded-xl bg-white/5 animate-pulse mb-2.5" />
                <div className="h-3 bg-white/5 rounded animate-pulse mb-1.5 w-4/5" />
                <div className="h-2.5 bg-white/5 rounded animate-pulse w-3/5" />
              </div>
            ))
          : tracks.map(track => (
              <div key={track.id} style={{ scrollSnapAlign: 'start' }}>
                <MiniCard track={track} />
              </div>
            ))}
      </div>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RecommendationsSections() {
  useAuth(); // ensure we're inside AuthProvider (hook validates context)

  const [becauseTracks,  setBecauseTracks]  = useState<RecoTrack[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<RecoTrack[]>([]);
  const [newTracks,      setNewTracks]      = useState<RecoTrack[]>([]);

  const [becauseTitle,  setBecauseTitle]  = useState('Because you listened');
  const [trendingTitle, setTrendingTitle] = useState('Trending now');

  const [loadingBecause,  setLoadingBecause]  = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingNew,      setLoadingNew]      = useState(true);

  // ── Seed data from localStorage ─────────────────────────────────────────────

  const fetchShelves = useCallback(async () => {
    const recent  = readRecentlyPlayed();
    const genres  = topGenres(recent);
    const topGenre = genres[0] ?? null;
    const playedIds = recent.map(r => r.id).filter(Boolean);

    // ── "Because you listened to X" ──────────────────────────────────────────
    if (topGenre) {
      setBecauseTitle(`Because you listened to ${topGenre}`);

      let query = supabase
        .from('ecom_products')
        .select('id,title,vendor,cover_image_url,audio_url,genre,stream_count,price,handle')
        .eq('genre', topGenre)
        .order('stream_count', { ascending: false })
        .limit(8);

      if (playedIds.length > 0) {
        query = query.not('id', 'in', `(${playedIds.join(',')})`);
      }

      const { data } = await query;
      setBecauseTracks((data ?? []) as RecoTrack[]);
    } else {
      // No history — show most streamed overall
      setBecauseTitle('Popular picks');
      const { data } = await supabase
        .from('ecom_products')
        .select('id,title,vendor,cover_image_url,audio_url,genre,stream_count,price,handle')
        .order('stream_count', { ascending: false })
        .limit(8);
      setBecauseTracks((data ?? []) as RecoTrack[]);
    }
    setLoadingBecause(false);

    // ── "Trending in [genre]" ─────────────────────────────────────────────────
    if (topGenre) {
      setTrendingTitle(`Trending in ${topGenre}`);
      const { data } = await supabase
        .from('ecom_products')
        .select('id,title,vendor,cover_image_url,audio_url,genre,stream_count,price,handle')
        .eq('genre', topGenre)
        .order('stream_count', { ascending: false })
        .limit(8);
      setTrendingTracks((data ?? []) as RecoTrack[]);
    } else {
      setTrendingTitle('Trending now');
      const { data } = await supabase
        .from('ecom_products')
        .select('id,title,vendor,cover_image_url,audio_url,genre,stream_count,price,handle')
        .order('stream_count', { ascending: false })
        .limit(8);
      setTrendingTracks((data ?? []) as RecoTrack[]);
    }
    setLoadingTrending(false);

    // ── "New releases" ────────────────────────────────────────────────────────
    const { data: newData } = await supabase
      .from('ecom_products')
      .select('id,title,vendor,cover_image_url,audio_url,genre,stream_count,price,handle')
      .eq('status', 'active')
      .ilike('product_type', '%music%')
      .order('created_at', { ascending: false })
      .limit(8);
    setNewTracks((newData ?? []) as RecoTrack[]);
    setLoadingNew(false);
  }, []);

  useEffect(() => {
    fetchShelves();
  }, [fetchShelves]);

  // Hide entirely until at least one shelf has data (prevents jarring empty state)
  const allEmpty =
    !loadingBecause  && becauseTracks.length  === 0 &&
    !loadingTrending && trendingTracks.length === 0 &&
    !loadingNew      && newTracks.length      === 0;

  if (allEmpty) return null;

  return (
    <div className="bg-[#0B0814] py-6 px-4 sm:px-6">
      <Shelf
        title={becauseTitle}
        seeAllHref="/music"
        tracks={becauseTracks}
        loading={loadingBecause}
      />
      <Shelf
        title={trendingTitle}
        seeAllHref="/music?sort=trending"
        tracks={trendingTracks}
        loading={loadingTrending}
      />
      <Shelf
        title="New releases"
        seeAllHref="/music?sort=newest"
        tracks={newTracks}
        loading={loadingNew}
      />
    </div>
  );
}
