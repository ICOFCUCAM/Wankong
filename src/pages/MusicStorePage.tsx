import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { usePlayer } from '@/components/GlobalPlayer';
import type { Track } from '@/components/GlobalPlayer';
import { Heart, Play, Download, Headphones, Search, X, ChevronDown, Music } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StoreTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  price: number;        // 0 = free
  streams: number;
  downloads: number;
  duration: string;     // "3:42"
  gradient: string;     // CSS gradient
  emoji: string;
  audioUrl?: string;
  coverUrl?: string;
  isNew?: boolean;
  isFeatured?: boolean;
}

const GENRES = ['All', 'Gospel', 'Afrobeats', 'Hip-Hop', 'RnB', 'Jazz', 'EDM', 'Blues', 'Highlife', 'Reggae', 'Kizomba', 'Classical', 'Rock'];

const SORT_OPTIONS = [
  { value: 'popular',   label: 'Most Popular' },
  { value: 'newest',    label: 'Newest'        },
  { value: 'price-asc', label: 'Price: Low–High' },
  { value: 'price-desc',label: 'Price: High–Low' },
  { value: 'title',     label: 'A–Z'           },
];

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// ─── TrackCard ────────────────────────────────────────────────────────────────
function TrackCard({ track, liked, onLike, onPlay }: {
  track: StoreTrack;
  liked: boolean;
  onLike: () => void;
  onPlay: () => void;
}) {
  const isFree = track.price === 0;

  return (
    <div className="group relative bg-[#0B0814] border border-white/5 rounded-2xl overflow-hidden hover:border-[#00D9FF]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,217,255,0.12)]">
      {/* Cover art */}
      <div className="relative aspect-square overflow-hidden">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: track.gradient }}>
            <span className="text-5xl">{track.emoji}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <button
            onClick={onPlay}
            className="w-14 h-14 rounded-full bg-[#00D9FF] flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          >
            <Play className="w-6 h-6 text-black fill-black ml-0.5" />
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {track.isFeatured && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FFB800] text-black rounded-full uppercase tracking-wide">
              Featured
            </span>
          )}
          {track.isNew && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#00F5A0] text-black rounded-full uppercase tracking-wide">
              New
            </span>
          )}
        </div>

        {/* Like button */}
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-[#FF6B00] text-[#FF6B00]' : 'text-white'}`} />
        </button>

        {/* Genre badge */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-black/60 backdrop-blur-sm text-white rounded-full">
            {track.genre}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate text-sm leading-tight">{track.title}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
          </div>
          <div className="shrink-0 text-right">
            {isFree ? (
              <span className="text-xs font-bold text-[#00F5A0] bg-[#00F5A0]/10 px-2 py-0.5 rounded-full">FREE</span>
            ) : (
              <span className="text-sm font-bold text-white">${track.price.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Headphones className="w-3 h-3" />
            {fmtNum(track.streams)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {fmtNum(track.downloads)}
          </span>
          <span className="ml-auto">{track.duration}</span>
        </div>

        {/* Action */}
        <button
          onClick={onPlay}
          className="mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: isFree ? 'rgba(0,217,255,0.1)' : 'rgba(255,184,0,0.1)',
            color: isFree ? '#00D9FF' : '#FFB800',
            border: `1px solid ${isFree ? 'rgba(0,217,255,0.2)' : 'rgba(255,184,0,0.2)'}`,
          }}
        >
          {isFree ? 'Play Free' : `Buy — $${track.price.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MusicStorePage() {
  const { play } = usePlayer();

  const [tracks, setTracks]     = useState<StoreTrack[]>([]);
  const [loading, setLoading]   = useState(true);
  const [genre, setGenre]       = useState('All');
  const [sort, setSort]         = useState('popular');
  const [search, setSearch]     = useState('');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [liked, setLiked]       = useState<Set<string>>(new Set());
  const [showSort, setShowSort] = useState(false);

  // Supabase fetch
  useEffect(() => {
    supabase
      .from('ecom_products')
      .select('*')
      .eq('product_type', 'Music')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (data) {
          setTracks(data.map((r: any) => ({
            id:        r.id,
            title:     r.title,
            artist:    r.vendor || r.artist || 'Unknown',
            genre:     r.genre || 'Music',
            price:     r.price ? r.price / 100 : 0,
            streams:   r.streams || 0,
            downloads: r.downloads || 0,
            duration:  r.duration || '3:30',
            gradient:  'linear-gradient(135deg,#1a1a2e,#16213e)',
            emoji:     '🎵',
            audioUrl:  r.audio_url,
            coverUrl:  r.cover_url,
          })));
        }
        setLoading(false);
      });
  }, []);

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePlay = (track: StoreTrack) => {
    const t: Track = {
      id:       track.id,
      title:    track.title,
      artist:   track.artist,
      albumArt: track.coverUrl || '',
      cover:    track.coverUrl || '',
      audioUrl: track.audioUrl || '',
      duration: 0,
    };
    play(t);
  };

  const filtered = useMemo(() => {
    let list = [...tracks];

    if (genre !== 'All') {
      list = list.filter(t => t.genre === genre);
    }
    if (priceFilter === 'free') {
      list = list.filter(t => t.price === 0);
    } else if (priceFilter === 'paid') {
      list = list.filter(t => t.price > 0);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case 'popular':   list.sort((a, b) => b.streams  - a.streams);  break;
      case 'newest':    list.sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1)); break;
      case 'price-asc': list.sort((a, b) => a.price    - b.price);    break;
      case 'price-desc':list.sort((a, b) => b.price    - a.price);    break;
      case 'title':     list.sort((a, b) => a.title.localeCompare(b.title)); break;
    }

    return list;
  }, [tracks, genre, sort, search, priceFilter]);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sort';
  const freeCount  = tracks.filter(t => t.price === 0).length;
  const paidCount  = tracks.filter(t => t.price > 0).length;

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9D4EDD]/20 via-[#00D9FF]/10 to-[#FF6B00]/20 pointer-events-none" />
        <div className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(157,78,221,0.15) 0%, transparent 50%),
                              radial-gradient(circle at 80% 50%, rgba(0,217,255,0.10) 0%, transparent 50%)`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-[#9D4EDD]" />
            </div>
            <span className="text-xs font-semibold text-[#9D4EDD] uppercase tracking-widest">Music Store</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            Discover & Stream<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD]">
              Sounds From Everywhere
            </span>
          </h1>
          <p className="text-white/55 text-lg max-w-xl mb-8">
            Afrobeats, K-pop, hip-hop, pop, jazz, gospel and more — straight from independent creators worldwide.
          </p>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
              <span className="text-[#00F5A0] font-bold">{freeCount}</span> Free tracks
            </span>
            <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
              <span className="text-[#FFB800] font-bold">{paidCount}</span> Premium tracks
            </span>
            <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
              <span className="text-[#9D4EDD] font-bold">{GENRES.length - 1}</span> Genres
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">

        {/* Search + controls bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tracks, artists, genres…"
              className="w-full bg-[#0B0814] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Price filter */}
          <div className="flex gap-1 bg-[#0B0814] border border-white/10 rounded-xl p-1">
            {(['all', 'free', 'paid'] as const).map(v => (
              <button
                key={v}
                onClick={() => setPriceFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  priceFilter === v
                    ? 'bg-[#9D4EDD] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort(p => !p)}
              className="flex items-center gap-2 bg-[#0B0814] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {currentSortLabel}
              <ChevronDown className={`w-4 h-4 transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 bg-[#0B0814] border border-white/10 rounded-xl shadow-xl z-20 py-1 min-w-[160px]">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => { setSort(o.value); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      sort === o.value ? 'text-[#00D9FF] bg-[#00D9FF]/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Genre pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                genre === g
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white shadow-lg shadow-[#9D4EDD]/20'
                  : 'bg-[#0B0814] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            <span className="text-white font-semibold">{filtered.length}</span> track{filtered.length !== 1 ? 's' : ''} found
          </p>
          {search && (
            <p className="text-sm text-gray-500">
              Results for "<span className="text-[#00D9FF]">{search}</span>"
            </p>
          )}
        </div>

        {/* Track grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-[#0B0814] rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-[#0B0814] flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 mb-2">No tracks found</p>
            {(search || genre !== 'All' || priceFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setGenre('All'); setPriceFilter('all'); }} className="text-sm text-[#00D9FF] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                liked={liked.has(track.id)}
                onLike={() => toggleLike(track.id)}
                onPlay={() => handlePlay(track)}
              />
            ))}
          </div>
        )}

        {/* Upload CTA */}
        <div className="mt-16 relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] opacity-10" />
          <div className="absolute inset-0 border border-[#9D4EDD]/30 rounded-3xl" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-10">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Ready to share your music?</h3>
              <p className="text-gray-400 max-w-md">
                Distribute your tracks to 30+ platforms and earn royalties. Your music, your rights, your earnings.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                to="/distribute"
                className="px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Distribute Music
              </Link>
              <Link
                to="/talent-arena"
                className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                Join Talent Arena
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
