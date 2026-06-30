import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';
import Seo from '@/components/Seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ────────────────────────────────────────────────────────────────────

interface VideoEntry {
  id: string;
  title: string;
  thumbnail_url: string | null;
  votes_count: number;
  status: string;
  category: string | null;
  room_id: string;
  performer_name: string | null;
  language: string | null;
  ai_score: number | null;
  created_at: string;
}

const VIDEO_CATEGORIES = ['All', 'Music Videos', 'Live Sessions', 'Competition Highlights', 'Behind the Scenes'];
const PAGE_SIZE = 20;

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Video Card ────────────────────────────────────────────────────────────────

function VideoCard({ entry, onClick }: { entry: VideoEntry; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#9D4EDD]/40 transition-all group cursor-pointer"
    >
      <div className="aspect-video relative overflow-hidden bg-white/5">
        {entry.thumbnail_url ? (
          <img
            src={entry.thumbnail_url}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Votes badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
          <svg className="w-3 h-3 text-[#FFB800]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-[10px] text-white font-bold">{fmt(entry.votes_count ?? 0)}</span>
        </div>

        {/* Winner badge */}
        {entry.status === 'winner' && (
          <div className="absolute top-2 left-2 bg-[#FFB800] text-[#0B0814] text-[10px] font-bold px-2 py-0.5 rounded-full">
            🏆 WINNER
          </div>
        )}

        {/* Category badge */}
        {entry.category && entry.status !== 'winner' && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white border border-white/10 font-medium">
              {entry.category}
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-semibold text-white text-sm line-clamp-2">{entry.title}</p>
        {entry.performer_name && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">{entry.performer_name}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VideosCollectionPage() {
  const navigate = useNavigate();

  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchVideos = async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) { setLoading(true); setPage(0); } else { setLoadingMore(true); }

    let query = supabase
      .from('competition_entries_v2')
      .select('id, title, thumbnail_url, votes_count, status, category, room_id, performer_name, language, ai_score, created_at')
      .in('status', ['live', 'winner'])
      .order('votes_count', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (selectedCategory !== 'All') {
      // Map friendly names to DB categories
      const catMap: Record<string, string> = {
        'Competition Highlights': 'competition',
        'Live Sessions': 'live',
        'Music Videos': 'music',
        'Behind the Scenes': 'bts',
      };
      const dbCat = catMap[selectedCategory] ?? selectedCategory.toLowerCase();
      query = query.ilike('category', `%${dbCat}%`);
    }

    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);

    const { data, error } = await query;
    if (!error) {
      const rows = asArray<VideoEntry>(data);
      if (reset) {
        setVideos(rows);
      } else {
        setVideos(prev => [...prev, ...rows]);
      }
      setHasMore(rows.length === PAGE_SIZE);
      if (!reset) setPage(p => p + 1);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchVideos(true);
  }, [selectedCategory, search]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const handleCardClick = (entry: VideoEntry) => {
    navigate(`/talent-arena/room/${entry.room_id}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Seo title="Videos" description="Watch and support original videos and music videos from global creators." type="video.other" />
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#100D2E] to-[#0B0814] border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center text-xl">🎬</div>
            <span className="text-[#FF6B00] text-sm font-medium uppercase tracking-widest">Videos</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Videos &amp; <span className="bg-gradient-to-r from-[#FF6B00] to-[#FFB800] bg-clip-text text-transparent">Performances</span>
          </h1>
          <p className="text-white/55 text-lg max-w-xl">Watch music videos, live performances and competition entries from creators worldwide.</p>
        </div>
      </div>

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
            placeholder="Search videos, performers..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF6B00]/40"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {VIDEO_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-gray-400 text-lg">No videos found.</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">{videos.length} videos</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {videos.map(entry => (
                <VideoCard key={entry.id} entry={entry} onClick={() => handleCardClick(entry)} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={() => fetchVideos(false)}
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
