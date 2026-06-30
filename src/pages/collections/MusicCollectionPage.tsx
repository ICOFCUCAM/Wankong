import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';
import Seo from '@/components/Seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SUPPORTED_LANGUAGES } from '@/pipelines/translation/LanguageMapping';
import { Download, Play } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string;
  title: string;
  artwork_url: string | null;
  genre: string | null;
  language: string | null;
  audio_url: string | null;
  created_at: string;
}

const GENRES = ['All', 'Gospel', 'Afrobeats', 'Hip-Hop', 'Classical', 'Jazz', 'R&B', 'Praise', 'Worship'];
const PAGE_SIZE = 24;

const GENRE_GRADIENTS: Record<string, string> = {
  Gospel: 'from-[#9D4EDD]/40 to-[#00D9FF]/20',
  Afrobeats: 'from-[#FF6B00]/40 to-[#FFB800]/20',
  'Hip-Hop': 'from-gray-700/60 to-gray-900/40',
  Classical: 'from-[#FFB800]/30 to-amber-900/20',
  Jazz: 'from-[#00D9FF]/30 to-blue-900/20',
  'R&B': 'from-pink-900/40 to-[#9D4EDD]/20',
  Praise: 'from-[#00F5A0]/20 to-[#9D4EDD]/20',
  Worship: 'from-[#00D9FF]/20 to-[#1E1235]/20',
};

// ── Track Card ────────────────────────────────────────────────────────────────

function TrackCard({ track, onPlay }: { track: Track; onPlay: (t: Track) => void }) {
  const genre = track.genre ?? '';
  const gradient = GENRE_GRADIENTS[genre] ?? 'from-[#9D4EDD]/30 to-[#00D9FF]/10';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
      <div className="aspect-square relative overflow-hidden bg-white/5">
        {track.artwork_url ? (
          <img
            src={track.artwork_url}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
        )}
        {/* Play button overlay */}
        <button
          onClick={() => onPlay(track)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
          aria-label={`Play ${track.title}`}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
        {/* Genre badge */}
        {track.genre && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white border border-white/10 font-medium">
              {track.genre}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-white text-sm truncate">{track.title}</p>
        <p className="text-gray-600 text-[10px] mt-1">{track.language?.toUpperCase() ?? ''}</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MusicCollectionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Read `lang` param from URL so /collections/music?lang=fr works
  const urlLang = searchParams.get('lang') ?? 'all';
  const [selectedLanguage, setSelectedLanguage] = useState<string>(urlLang);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchTracks = async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) { setLoading(true); setPage(0); } else { setLoadingMore(true); }

    let query = supabase
      .from('tracks')
      .select('id, title, artwork_url, genre, language, audio_url, created_at')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (selectedLanguage !== 'all') query = query.eq('language', selectedLanguage);
    if (selectedGenre !== 'All') query = query.eq('genre', selectedGenre);
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);

    const { data, error } = await query;
    if (!error) {
      const rows = asArray<Track>(data);
      if (reset) {
        setTracks(rows);
      } else {
        setTracks(prev => [...prev, ...rows]);
      }
      setHasMore(rows.length === PAGE_SIZE);
      if (!reset) setPage(p => p + 1);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  // Refetch on filter change
  useEffect(() => {
    fetchTracks(true);
  }, [selectedLanguage, selectedGenre, search]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  // Sync URL param → state
  useEffect(() => {
    setSelectedLanguage(urlLang);
  }, [urlLang]);

  const handleLanguageSelect = (code: string) => {
    setSelectedLanguage(code);
    if (code === 'all') {
      searchParams.delete('lang');
    } else {
      searchParams.set('lang', code);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handlePlay = (track: Track) => {
    if (track.audio_url) {
      window.dispatchEvent(new CustomEvent('wankong:play', { detail: track }));
    }
  };

  const handleLoadMore = () => {
    setPage(p => { fetchTracks(false); return p; });
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Seo title="Music" description="Stream and download music across every language and genre — gospel, afrobeats, hip-hop, worship and more from creators worldwide." />
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#100D2E] to-[#0B0814] border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center text-xl">🎵</div>
            <span className="text-[#00D9FF] text-sm font-medium uppercase tracking-widest">Music</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Explore <span className="bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] bg-clip-text text-transparent">Music</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">Discover gospel, afrobeats, praise &amp; worship and more from creators worldwide.</p>
        </div>
      </div>

      {/* ── Language Discovery Grid ──────────────────────────────── */}
      <section className="py-10 bg-[#080e22] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">Music by Language</h2>
              <p className="text-white/40 text-sm">Discover music across cultures worldwide</p>
            </div>
            {selectedLanguage !== 'all' && (
              <button
                onClick={() => handleLanguageSelect('all')}
                className="text-[#00D9FF] text-sm hover:underline"
              >
                Show All Languages
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {SUPPORTED_LANGUAGES.map(lang => {
              const isActive = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={[
                    'group flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left',
                    isActive
                      ? 'border-[#00D9FF] bg-[#00D9FF]/10 shadow-[0_0_16px_rgba(0,217,255,0.2)]'
                      : 'border-white/10 bg-white/5 hover:border-[#9D4EDD]/40 hover:bg-[#9D4EDD]/5',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  <span className="text-3xl leading-none">{lang.flag}</span>
                  <span className={`text-xs font-semibold text-center leading-tight ${isActive ? 'text-[#00D9FF]' : 'text-white'}`}>
                    {lang.name}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-[#00D9FF] text-[#0B0814]' : 'bg-white/10 text-white/50'}`}>
                    {lang.trackCount}
                  </span>
                  <div className="flex gap-1 mt-0.5">
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'bg-white/5 text-white/30'}`}>
                      <Play className="w-2 h-2" /> Play
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-[#9D4EDD]/20 text-[#9D4EDD]' : 'bg-white/5 text-white/30'}`}>
                      <Download className="w-2 h-2" /> DL
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search songs, artists..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/40"
          />
          {selectedLanguage !== 'all' && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-xs px-2.5 py-1 bg-[#00D9FF]/20 text-[#00D9FF] rounded-full font-semibold border border-[#00D9FF]/30">
                {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag}{' '}
                {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
              </span>
              <button onClick={() => handleLanguageSelect('all')} className="text-white/40 hover:text-white text-sm">✕</button>
            </div>
          )}
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎵</div>
            <p className="text-gray-400 text-lg">No tracks found.</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">{tracks.length} tracks</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {tracks.map(track => (
                <TrackCard key={track.id} track={track} onPlay={handlePlay} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading…
                    </span>
                  ) : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
