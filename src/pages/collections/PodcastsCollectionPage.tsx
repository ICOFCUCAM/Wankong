import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePlayer } from '@/components/GlobalPlayer';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Podcast {
  id: string;
  title: string;
  cover_url: string | null;
  audio_url: string | null;
  price: number;
  description: string | null;
  duration_minutes: number | null;
  episode_number: number | null;
  category: string | null;
  created_at: string;
  authors?: { name: string } | null;
}


const CATEGORY_GRADIENTS: Record<string, string> = {
  Faith:       'from-[#9D4EDD]/40 to-[#00D9FF]/20',
  Music:       'from-[#00D9FF]/30 to-[#9D4EDD]/20',
  Testimonies: 'from-[#00F5A0]/20 to-[#00D9FF]/20',
  Technology:  'from-[#FFB800]/20 to-[#FF6B00]/20',
  Worship:     'from-[#9D4EDD]/40 to-[#FFB800]/20',
  Gospel:      'from-[#FF6B00]/20 to-[#9D4EDD]/20',
  Theology:    'from-[#00D9FF]/20 to-[#00F5A0]/20',
  Business:    'from-[#FFB800]/30 to-[#9D4EDD]/20',
};

// ── Podcast Card ──────────────────────────────────────────────────────────────

function PodcastCard({
  podcast,
  isPlaying,
  onListen,
}: {
  podcast:   Podcast;
  isPlaying: boolean;
  onListen:  () => void;
}) {
  const { t } = useTranslation();
  const gradient = CATEGORY_GRADIENTS[podcast.category ?? ''] ?? 'from-[#9D4EDD]/30 to-[#00D9FF]/10';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
      <div className="flex gap-4 p-4">

        {/* Thumbnail */}
        <div className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {podcast.cover_url ? (
            <img src={podcast.cover_url} alt={podcast.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">🎙️</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {podcast.episode_number != null && (
                <p className="text-[10px] text-gray-500 mb-0.5">{t('podcasts.episode')} {podcast.episode_number}</p>
              )}
              <p className="font-semibold text-white text-sm line-clamp-2">{podcast.title}</p>
              <p className="text-gray-400 text-xs mt-0.5 truncate">{podcast.authors?.name ?? t('common.unknown', 'Unknown')}</p>
            </div>
            {podcast.price === 0 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00F5A0] text-[#0B0814] font-bold shrink-0">{t('common.free')}</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFB800] text-[#0B0814] font-bold shrink-0">${podcast.price}</span>
            )}
          </div>

          {podcast.description && (
            <p className="text-gray-500 text-xs mt-2 line-clamp-2">{podcast.description}</p>
          )}

          <div className="flex items-center gap-3 mt-3">
            {podcast.duration_minutes != null && (
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {podcast.duration_minutes} {t('podcasts.minute')}
              </span>
            )}
            {podcast.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">{podcast.category}</span>
            )}

            {/* ── Listen / Pause button — connected to GlobalPlayer ── */}
            <button
              onClick={onListen}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                isPlaying
                  ? 'bg-[#9D4EDD]/20 text-[#9D4EDD] border-[#9D4EDD]/40 hover:bg-[#9D4EDD]/30'
                  : 'bg-[#9D4EDD]/10 text-[#9D4EDD] border-[#9D4EDD]/20 hover:bg-[#9D4EDD]/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  {t('podcasts.pause')}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t('podcasts.listen')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PodcastsCollectionPage() {
  const { t } = useTranslation();
  const { play, togglePlay, currentTrack, isPlaying } = usePlayer();

  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    setLoading(true);
    supabase
      .from('ecom_products')
      .select('id, title, cover_url, audio_url, price, description, duration_minutes, episode_number, category, created_at, authors(name)')
      .ilike('product_type', 'podcast')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error) {
          setPodcasts(asArray<Podcast>(data));
        }
        setLoading(false);
      });
  }, []);

  const filtered = podcasts.filter(p =>
    !search.trim() ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.authors?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalMinutes = podcasts.reduce((s, p) => s + (p.duration_minutes ?? 0), 0);

  /** Returns true when this specific podcast is the active, playing track. */
  const isPodcastPlaying = (podcast: Podcast) =>
    currentTrack?.id === podcast.id && isPlaying;

  /**
   * Section 1: Connect to GlobalPlayer.
   * Builds a Track from the podcast and hands it to play().
   * If already the current track, togglePlay() instead so the button acts as pause.
   */
  const handleListen = (podcast: Podcast) => {
    if (currentTrack?.id === podcast.id) {
      // Same episode — toggle play/pause
      togglePlay();
      return;
    }

    const queue = filtered
      .filter(p => p.id !== podcast.id)
      .map(p => ({
        id:       p.id,
        title:    p.title,
        artist:   p.authors?.name ?? 'Unknown',
        albumArt: p.cover_url ?? undefined,
        cover:    p.cover_url ?? undefined,
        audioUrl: p.audio_url ?? undefined,
        duration: p.duration_minutes ? p.duration_minutes * 60 : undefined,
        type:     'podcast' as const,
      }));

    play(
      {
        id:       podcast.id,
        title:    podcast.title,
        artist:   podcast.authors?.name ?? 'Unknown',
        albumArt: podcast.cover_url ?? undefined,
        cover:    podcast.cover_url ?? undefined,
        audioUrl: podcast.audio_url ?? undefined,
        duration: podcast.duration_minutes ? podcast.duration_minutes * 60 : undefined,
        type:     'podcast',
      },
      queue,
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#100D2E] to-[#0B0814] border-b border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00F5A0] flex items-center justify-center text-xl">🎙️</div>
            <span className="text-[#9D4EDD] text-sm font-medium uppercase tracking-widest">{t('nav.podcasts')}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            {t('podcasts.title').split('&')[0]}&amp;{' '}
            <span className="bg-gradient-to-r from-[#9D4EDD] to-[#00F5A0] bg-clip-text text-transparent">
              {t('podcasts.title').split('&')[1] ?? 'Teaching'}
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">{t('podcasts.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-[#9D4EDD]/10 to-[#00F5A0]/10 border border-[#9D4EDD]/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/20 flex items-center justify-center text-xl shrink-0">🚀</div>
          <div>
            <p className="font-semibold text-white text-sm">{t('podcasts.comingSoon')}</p>
            <p className="text-gray-400 text-xs mt-0.5">{t('podcasts.comingSoonDesc')}</p>
          </div>
          <button className="ml-auto px-4 py-2 border border-[#9D4EDD]/40 text-[#9D4EDD] rounded-xl text-xs font-medium hover:bg-[#9D4EDD]/10 transition-colors whitespace-nowrap shrink-0">
            {t('podcasts.getEarlyAccess')}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('podcasts.search')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
          />
        </div>

        {/* Episode list */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-white/10 rounded w-1/4" />
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="text-gray-400 text-lg">{t('podcasts.noResults')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(podcast => (
              <PodcastCard
                key={podcast.id}
                podcast={podcast}
                isPlaying={isPodcastPlaying(podcast)}
                onListen={() => handleListen(podcast)}
              />
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            { label: t('podcasts.episodesAvailable'), value: String(podcasts.length) },
            { label: t('podcasts.totalListenTime'),   value: `${totalMinutes} ${t('podcasts.minute')}` },
            { label: t('podcasts.creatorPodcasts'),   value: t('podcasts.comingSoonLabel') },
          ].map(s => (
            <div key={s.label} className="bg-white/3 border border-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-white mb-1">{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
