import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePlayer } from '@/components/GlobalPlayer';
import { usePlaylistContext } from '@/contexts/PlaylistContext';

// ── Language Configuration ─────────────────────────────────────────────────────

const LANGUAGE_META: Record<string, { name: string; flag: string }> = {
  english:    { name: 'English',    flag: '🇬🇧' },
  french:     { name: 'French',     flag: '🇫🇷' },
  spanish:    { name: 'Spanish',    flag: '🇪🇸' },
  arabic:     { name: 'Arabic',     flag: '🇸🇦' },
  pidgin:     { name: 'Pidgin',     flag: '🌍'  },
  nigerian:   { name: 'Nigerian',   flag: '🇳🇬' },
  swahili:    { name: 'Swahili',    flag: '🇰🇪' },
  german:     { name: 'German',     flag: '🇩🇪' },
  norwegian:  { name: 'Norwegian',  flag: '🇳🇴' },
  swedish:    { name: 'Swedish',    flag: '🇸🇪' },
  portuguese: { name: 'Portuguese', flag: '🇧🇷' },
  russian:    { name: 'Russian',    flag: '🇷🇺' },
  chinese:    { name: 'Chinese',    flag: '🇨🇳' },
  japanese:   { name: 'Japanese',   flag: '🇯🇵' },
  yoruba:     { name: 'Yoruba',     flag: '🌍'  },
  zulu:       { name: 'Zulu',       flag: '🌍'  },
  luganda:    { name: 'Luganda',    flag: '🌍'  },
  bamumbu:    { name: 'Bamumbu',    flag: '🌍'  },
  bameleke:   { name: 'Bameleke',   flag: '🌍'  },
};

const GENRES = [
  'All', 'Pop', 'Afrobeats', 'Hip-Hop', 'Classical',
  'Jazz', 'R&B', 'Electronic', 'K-Pop', 'Latin',
];

const GENRE_GRADIENTS: Record<string, string> = {
  Pop:          'from-[#9D4EDD]/40 to-[#00D9FF]/20',
  Afrobeats:    'from-[#FF6B00]/40 to-[#FFB800]/20',
  'Hip-Hop':    'from-gray-700/60 to-gray-900/40',
  Classical:    'from-[#FFB800]/30 to-amber-900/20',
  Jazz:         'from-[#00D9FF]/30 to-blue-900/20',
  'R&B':        'from-pink-900/40 to-[#9D4EDD]/20',
  Electronic:   'from-[#00F5A0]/20 to-[#9D4EDD]/20',
  'K-Pop':      'from-[#FF006E]/30 to-[#00D9FF]/20',
  Latin:        'from-[#9D4EDD]/30 to-[#FF6B00]/20',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Release {
  id:           string;
  title:        string;
  artwork_url:  string | null;
  genre:        string | null;
  language:     string | null;
  audio_url:    string | null;
  created_at:   string;
  release_type: 'album' | 'EP' | 'single' | null;
}

type SortOption  = 'newest' | 'trending' | 'most_played' | 'most_downloaded' | 'alphabetical' | 'free_first' | 'paid_first';

type ContentTab  = 'all' | 'album' | 'EP' | 'single';
type PriceFilter = 'all' | 'free' | 'paid';

const PAGE_SIZE = 12;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',          label: 'Newest'          },
  { value: 'trending',        label: 'Trending'        },
  { value: 'most_played',     label: 'Most Played'     },
  { value: 'most_downloaded', label: 'Most Downloaded' },
  { value: 'alphabetical',    label: 'Alphabetical'    },
  { value: 'free_first',      label: 'Free First'      },
  { value: 'paid_first',      label: 'Paid First'      },
];

const CONTENT_TABS: { id: ContentTab; label: string }[] = [
  { id: 'all',    label: 'All'     },
  { id: 'album',  label: 'Albums'  },
  { id: 'EP',     label: 'EPs'     },
  { id: 'single', label: 'Singles' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Release Card ─────────────────────────────────────────────────────────────

function ReleaseCard({
  release,
  isPlaying,
  onPlay,
}: {
  release:   Release;
  isPlaying: boolean;
  onPlay:    () => void;
}) {
  const { openAddToPlaylist } = usePlaylistContext();

  const gradient = GENRE_GRADIENTS[release.genre ?? ''] ?? 'from-[#9D4EDD]/30 to-[#00D9FF]/10';
  const year     = new Date(release.created_at).getFullYear();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (release.audio_url) window.open(release.audio_url, '_blank');
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    openAddToPlaylist({
      track_id:     release.id,
      content_type: 'music',
      title:        release.title,
      cover_url:    release.artwork_url ?? undefined,
      audio_url:    release.audio_url ?? undefined,
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">

      {/* Cover art */}
      <div className="aspect-square relative overflow-hidden bg-white/5">
        {release.artwork_url ? (
          <img
            src={release.artwork_url}
            alt={release.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-white/20 text-5xl font-black">{release.title?.[0] ?? '♪'}</span>
          </div>
        )}

        {/* Release type badge */}
        {release.release_type && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/80 backdrop-blur-sm">
              {release.release_type}
            </span>
          </div>
        )}

        {/* Free badge */}
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00F5A0] text-[#0B0814]">FREE</span>
        </div>

        {/* Play overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            isPlaying ? 'bg-black/40' : 'bg-transparent group-hover:bg-black/40'
          }`}
        >
          <div className={`w-14 h-14 rounded-full bg-[#9D4EDD] flex items-center justify-center shadow-xl transition-all ${
            isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
          }`}>
            {isPlaying ? (
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 fill-white ml-1" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Card info */}
      <div className="p-3">
        <p className="text-white text-sm font-semibold truncate leading-tight">{release.title}</p>
        <p className="text-gray-600 text-[10px] mt-0.5">{year}{release.genre ? ` · ${release.genre}` : ''}</p>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              isPlaying
                ? 'bg-[#9D4EDD]/30 text-[#9D4EDD] border border-[#9D4EDD]/40'
                : 'bg-white/5 hover:bg-[#9D4EDD]/20 text-white border border-white/10'
            }`}
          >
            {isPlaying ? (
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[#00F5A0]/10 hover:bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>

          <button
            onClick={handleAddToPlaylist}
            title="Add to playlist"
            className="ml-auto p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trending Card (horizontal) ────────────────────────────────────────────────

function TrendingCard({
  release,
  rank,
  isPlaying,
  onPlay,
}: {
  release:   Release;
  rank:      number;
  isPlaying: boolean;
  onPlay:    () => void;
}) {
  const { openAddToPlaylist } = usePlaylistContext();
  const gradient  = GENRE_GRADIENTS[release.genre ?? ''] ?? 'from-[#9D4EDD]/30 to-[#00D9FF]/10';

  return (
    <div className="flex gap-4 items-center bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all">

      {/* Rank number */}
      <span className="text-3xl font-black text-white/10 w-8 shrink-0 text-center select-none">
        {rank}
      </span>

      {/* Cover thumbnail */}
      <div className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {release.artwork_url ? (
          <img src={release.artwork_url} alt={release.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/20 text-2xl font-black">{release.title?.[0] ?? '♪'}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{release.title}</p>
        <p className="text-gray-600 text-[10px] mt-0.5">{release.genre ?? ''}</p>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30">
          FREE
        </span>

        {/* Play/pause */}
        <button
          onClick={onPlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            isPlaying
              ? 'bg-[#9D4EDD] text-white'
              : 'bg-white/10 hover:bg-[#9D4EDD] text-white'
          }`}
        >
          {isPlaying ? (
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Add to playlist */}
        <button
          onClick={() => openAddToPlaylist({
            track_id:     release.id,
            content_type: 'music',
            title:        release.title,
            cover_url:    release.artwork_url ?? undefined,
            audio_url:    release.audio_url ?? undefined,
          })}
          title="Add to playlist"
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LanguageMusicPage() {
  const { language = '' }                             = useParams<{ language: string }>();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer();

  const langKey  = language.toLowerCase();
  const langMeta = LANGUAGE_META[langKey] ?? { name: language, flag: '🎵' };

  // ── Core state ─────────────────────────────────────────────────────────────

  const [releases,       setReleases]       = useState<Release[]>([]);
  const [trending,       setTrending]       = useState<Release[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [totalCount,     setTotalCount]     = useState(0);
  const [page,           setPage]           = useState(0);
  const [hasMore,        setHasMore]        = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // ── Sort / filter state ────────────────────────────────────────────────────

  const [sort,         setSort]         = useState<SortOption>('newest');
  const [activeTab,    setActiveTab]    = useState<ContentTab>('all');
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [genreFilter,  setGenreFilter]  = useState('All');
  const [yearFilter,   setYearFilter]   = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [priceFilter,  setPriceFilter]  = useState<PriceFilter>('all');

  // ── Build Supabase query ───────────────────────────────────────────────────

  const buildQuery = useCallback((offset: number) => {
    let q = supabase
      .from('tracks')
      .select(
        'id, title, artwork_url, genre, language, audio_url, created_at, release_type',
        { count: 'exact' },
      )
      .ilike('language', langKey);

    if (activeTab !== 'all')    q = q.eq('release_type', activeTab);
    if (genreFilter !== 'All')  q = q.eq('genre', genreFilter);
    if (yearFilter)             q = q.gte('created_at', `${yearFilter}-01-01`)
                                    .lte('created_at', `${yearFilter}-12-31`);

    switch (sort) {
      case 'alphabetical':
        q = q.order('title', { ascending: true }); break;
      default:
        q = q.order('created_at', { ascending: false }); break;
    }

    return q.range(offset, offset + PAGE_SIZE - 1);
  }, [langKey, activeTab, genreFilter, priceFilter, yearFilter, sort]);

  // ── SECTION 2: Initial load ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);
    setHasMore(true);

    buildQuery(0).then(({ data, error, count }) => {
      if (cancelled) return;

      const rows: Release[] = error ? [] : asArray<Release>(data);

      setReleases(rows);
      setTotalCount(count ?? rows.length);
      setHasMore((count ?? rows.length) > PAGE_SIZE);

      // Derive available years
      const years = [
        ...new Set(
          rows.map(r => new Date(r.created_at).getFullYear()),
        ),
      ].sort((a, b) => b - a);
      setAvailableYears(years);

      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [buildQuery, langKey]);

  // ── SECTION 9: Load trending (top 3 by play_count) ────────────────────────

  useEffect(() => {
    supabase
      .from('tracks')
      .select('id, title, artwork_url, genre, language, audio_url, created_at, release_type')
      .ilike('language', langKey)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data, error }) => {
        if (!error) {
          setTrending(asArray<Release>(data));
        }
      });
  }, [langKey]);

  // ── SECTION 7: Load more ───────────────────────────────────────────────────

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const { data, error } = await buildQuery(nextPage * PAGE_SIZE);
    const moreRows = error ? [] : asArray<Release>(data);
    if (moreRows.length > 0) {
      setReleases(prev => [...prev, ...moreRows]);
      setHasMore(moreRows.length === PAGE_SIZE);
      setPage(nextPage);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  // ── SECTION 6: GlobalPlayer helpers ───────────────────────────────────────

  const isTrackPlaying = (r: Release) => currentTrack?.id === r.id && isPlaying;

  const handlePlay = (release: Release) => {
    if (currentTrack?.id === release.id) { togglePlay(); return; }

    const queue = releases
      .filter(r => r.id !== release.id)
      .map(r => ({
        id:       r.id,
        title:    r.title,
        artist:   'Unknown',
        albumArt: r.artwork_url ?? undefined,
        audioUrl: r.audio_url ?? undefined,
        type:     'audio' as const,
      }));

    play(
      {
        id:       release.id,
        title:    release.title,
        artist:   'Unknown',
        albumArt: release.artwork_url ?? undefined,
        audioUrl: release.audio_url ?? undefined,
        type:     'audio',
      },
      queue,
    );
  };

  // ── Client-side artist filter ─────────────────────────────────────────────

  const displayReleases = artistFilter.trim()
    ? releases.filter(r =>
        r.title.toLowerCase().includes(artistFilter.toLowerCase()),
      )
    : releases;

  // ── Computed stats ────────────────────────────────────────────────────────

  const distinctArtists  = 0; // artist join not available on tracks
  const freeCount        = releases.length; // all tracks are free

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      {/* ── SECTION 1: Language Hero ──────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,rgba(157,78,221,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(0,217,255,0.08),transparent_60%)]" />

        <div className="relative max-w-5xl mx-auto px-4 lg:px-8 py-12">
          <Link
            to="/collections/music"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Languages
          </Link>

          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#9D4EDD]/20 border border-[#9D4EDD]/30 flex items-center justify-center text-4xl shrink-0">
              {langMeta.flag}
            </div>
            <div>
              <p className="text-[#9D4EDD] text-xs font-semibold uppercase tracking-widest mb-1">
                Music by Language
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {langMeta.name} Gospel Music
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Free &amp; premium releases from creators worldwide
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Releases', value: loading ? '…' : String(totalCount)       },
              { label: 'Artists',        value: loading ? '…' : distinctArtists > 0 ? String(distinctArtists) : '…' },
              { label: 'Free Tracks',    value: loading ? '…' : String(freeCount)        },
              { label: 'Language',       value: langMeta.flag + ' ' + langMeta.name      },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-xl font-black text-white truncate">{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-10">

        {/* ── SECTION 9: Trending ──────────────────────────────────────────── */}
        {trending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🔥</span>
              <h2 className="text-lg font-bold text-white">
                Trending in {langMeta.name}
              </h2>
            </div>
            <div className="space-y-2">
              {trending.map((r, i) => (
                <TrendingCard
                  key={r.id}
                  release={r}
                  rank={i + 1}
                  isPlaying={isTrackPlaying(r)}
                  onPlay={() => handlePlay(r)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── SECTION 8: Content tabs + SECTION 3: Sort + Filter toggle ────── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Content type tabs */}
          {CONTENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#9D4EDD] text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Sort dropdown */}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#9D4EDD]/40 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-gray-900">
                  {o.label}
                </option>
              ))}
            </select>

            {/* Filter panel toggle */}
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                filterOpen
                  ? 'bg-[#9D4EDD]/20 text-[#9D4EDD] border-[#9D4EDD]/40'
                  : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {/* ── SECTION 4: Filter Panel ───────────────────────────────────────── */}
        {filterOpen && (
          <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Genre chips */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Genre</p>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => setGenreFilter(g)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        genreFilter === g
                          ? 'bg-[#9D4EDD] text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Release year */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Release Year</p>
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#9D4EDD]/40"
                >
                  <option value="" className="bg-gray-900">Any year</option>
                  {availableYears.map(y => (
                    <option key={y} value={String(y)} className="bg-gray-900">{y}</option>
                  ))}
                </select>
              </div>

              {/* Artist search */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Artist</p>
                <input
                  type="text"
                  value={artistFilter}
                  onChange={e => setArtistFilter(e.target.value)}
                  placeholder="Search artist…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
                />
              </div>

              {/* Price filter */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Price</p>
                <div className="flex gap-2">
                  {(['all', 'free', 'paid'] as PriceFilter[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriceFilter(p)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                        priceFilter === p
                          ? p === 'free'
                            ? 'bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30'
                            : p === 'paid'
                              ? 'bg-[#9D4EDD]/20 text-[#B794F4] border border-[#9D4EDD]/30'
                              : 'bg-[#9D4EDD] text-white border border-[#9D4EDD]'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setGenreFilter('All');
                    setYearFilter('');
                    setArtistFilter('');
                    setPriceFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 5 + 6: Release Grid ───────────────────────────────────── */}
        <section>
          {!loading && (
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-400">
                Showing{' '}
                <span className="text-white font-medium">{displayReleases.length}</span>
                {totalCount > releases.length && (
                  <> of <span className="text-white font-medium">{totalCount}</span></>
                )}{' '}
                releases
              </p>
            </div>
          )}

          {loading ? (
            // Skeleton grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-white/5" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    <div className="h-2 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayReleases.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">{langMeta.flag}</div>
              <p className="text-gray-400 text-lg">No releases found for {langMeta.name}</p>
              <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
              <button
                onClick={() => {
                  setGenreFilter('All');
                  setYearFilter('');
                  setArtistFilter('');
                  setPriceFilter('all');
                  setActiveTab('all');
                }}
                className="mt-4 px-5 py-2 bg-[#9D4EDD]/20 text-[#9D4EDD] border border-[#9D4EDD]/30 rounded-xl text-sm hover:bg-[#9D4EDD]/30 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayReleases.map(release => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  isPlaying={isTrackPlaying(release)}
                  onPlay={() => handlePlay(release)}
                />
              ))}
            </div>
          )}

          {/* ── SECTION 7: Load More ─────────────────────────────────────── */}
          {hasMore && !loading && displayReleases.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    Load More Releases
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Other languages footer nav */}
        <section className="pt-6 border-t border-white/5">
          <p className="text-sm text-gray-500 mb-3 font-medium">Browse other languages</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LANGUAGE_META)
              .filter(([k]) => k !== langKey)
              .map(([k, v]) => (
                <Link
                  key={k}
                  to={`/music/language/${k}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-[#9D4EDD]/10 hover:border-[#9D4EDD]/30 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <span>{v.flag}</span>
                  <span>{v.name}</span>
                </Link>
              ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
