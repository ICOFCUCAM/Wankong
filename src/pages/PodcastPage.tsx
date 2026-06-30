import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Mic2, Play, Pause, Clock, Calendar, ChevronLeft,
  CheckCircle2, Circle, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/components/GlobalPlayer';
import type { Track } from '@/components/GlobalPlayer';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PodcastShow {
  id:          string;
  title:       string;
  description: string;
  cover_url:   string;
  author:      string;
  category:    string;
  language:    string;
  creator_id:  string;
}

interface Episode {
  id:          string;
  title:       string;
  description: string;
  audio_url:   string;
  duration_s:  number | null;
  episode_num: number | null;
  season_num:  number | null;
  published_at: string;
  cover_url:   string | null;
}

function fmt(sec: number | null): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (diff < 1)  return 'Today';
  if (diff < 7)  return `${Math.floor(diff)}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Episode Row ────────────────────────────────────────────────────────────────

function EpisodeRow({ ep, show, isPlaying, isActive, onPlay, listened, onToggleListened }: {
  ep:               Episode;
  show:             PodcastShow;
  isPlaying:        boolean;
  isActive:         boolean;
  onPlay:           () => void;
  listened:         boolean;
  onToggleListened: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      isActive ? 'border-[#00D9FF]/25 bg-[#00D9FF]/5' : 'border-white/8 bg-white/3 hover:bg-white/5'
    }`}>
      <div className="flex items-start gap-3">
        {/* Listened toggle */}
        <button onClick={onToggleListened} className="shrink-0 mt-0.5">
          {listened
            ? <CheckCircle2 className="w-4 h-4 text-[#00D9FF]" />
            : <Circle       className="w-4 h-4 text-white/20 hover:text-white/50 transition-colors" />}
        </button>

        {/* Cover or episode number */}
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#9D4EDD]/20 flex items-center justify-center">
          {ep.cover_url
            ? <img src={ep.cover_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm font-black text-[#9D4EDD]">
                {ep.episode_num ? `E${ep.episode_num}` : <Mic2 className="w-5 h-5" />}
              </span>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {ep.season_num && ep.episode_num && (
                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-0.5">
                  S{ep.season_num} E{ep.episode_num}
                </p>
              )}
              <p className={`text-sm font-semibold leading-snug ${isActive ? 'text-[#00D9FF]' : 'text-white'} ${listened ? 'opacity-60' : ''}`}>
                {ep.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-white/30 text-[10px]">
                {ep.published_at && <span><Calendar className="w-2.5 h-2.5 inline mr-0.5" />{relTime(ep.published_at)}</span>}
                {ep.duration_s && <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{fmt(ep.duration_s)}</span>}
              </div>
            </div>

            {/* Play button */}
            <button onClick={onPlay}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
              style={{ background: isActive ? '#00D9FF' : 'rgba(0,217,255,0.15)' }}>
              {isActive && isPlaying
                ? <Pause className="w-4 h-4 text-white fill-white" />
                : <Play  className="w-4 h-4 fill-[#00D9FF]" style={isActive ? { fill: '#0B0814' } : undefined} />}
            </button>
          </div>

          {/* Description toggle */}
          {ep.description && (
            <>
              <p className={`text-white/40 text-xs mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                {ep.description}
              </p>
              {ep.description.length > 120 && (
                <button onClick={() => setExpanded(e => !e)}
                  className="text-[#00D9FF] text-[10px] font-semibold mt-1 hover:underline">
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function PodcastPage() {
  const { podcastId } = useParams<{ podcastId: string }>();
  const { play, togglePlay, currentTrack, isPlaying } = usePlayer();
  const { user } = useAuth();

  const [show,     setShow]     = useState<PodcastShow | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading,  setLoading]  = useState(true);
  // Track listened episodes in localStorage
  const storageKey = `wk_podcast_listened_${podcastId}`;
  const [listened, setListened] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { return new Set(); }
  });

  const toggleListened = (id: string) => {
    setListened(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    if (!podcastId) return;
    (async () => {
      // Try ecom_products for the show metadata
      const { data: showData } = await supabase
        .from('ecom_products')
        .select('id, title, description, cover_image_url, vendor, genre, language, creator_id')
        .eq('id', podcastId)
        .maybeSingle();

      if (showData) {
        setShow({
          id:          showData.id,
          title:       showData.title,
          description: showData.description || '',
          cover_url:   showData.cover_image_url || '',
          author:      showData.vendor || 'Unknown',
          category:    showData.genre || '',
          language:    showData.language || '',
          creator_id:  showData.creator_id,
        });
      }

      // Fetch podcast episodes
      const { data: epData } = await supabase
        .from('podcast_episodes')
        .select('id, title, description, audio_url, duration_s, episode_num, season_num, published_at, cover_url')
        .eq('podcast_id', podcastId)
        .order('published_at', { ascending: false });

      setEpisodes((epData ?? []) as Episode[]);
      setLoading(false);
    })();
  }, [podcastId]);

  const handlePlay = useCallback((ep: Episode) => {
    if (!show) return;
    if (currentTrack?.id === ep.id) { togglePlay(); return; }
    const track: Track = {
      id:       ep.id,
      title:    ep.title,
      artist:   show.author,
      albumArt: ep.cover_url || show.cover_url,
      audioUrl: ep.audio_url,
      type:     'podcast',
    };
    const queue: Track[] = episodes
      .filter(e => e.id !== ep.id && e.audio_url)
      .map(e => ({
        id:       e.id,
        title:    e.title,
        artist:   show.author,
        albumArt: e.cover_url || show.cover_url,
        audioUrl: e.audio_url,
        type:     'podcast' as const,
      }));
    play(track, queue);
    // Mark as listened
    toggleListened(ep.id);
  }, [show, currentTrack, episodes, play, togglePlay]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center text-center px-6">
        <Mic2 className="w-12 h-12 text-white/20 mb-4" />
        <h1 className="text-white text-xl font-bold mb-2">Podcast not found</h1>
        <Link to="/collections/podcasts" className="text-[#00D9FF] text-sm hover:underline">Browse Podcasts</Link>
      </div>
    );
  }

  const listenedCount = episodes.filter(e => listened.has(e.id)).length;

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      {/* Header gradient */}
      <div className="relative pt-16 overflow-hidden"
        style={{ background: 'linear-gradient(180deg,rgba(0,217,255,0.15) 0%,#0B0814 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-8 pb-10">
          <Link to="/collections/podcasts"
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Podcasts
          </Link>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Cover */}
            <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 shrink-0 mx-auto sm:mx-0">
              {show.cover_url
                ? <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center">
                    <Mic2 className="w-16 h-16 text-white/30" />
                  </div>}
            </div>

            <div className="flex flex-col justify-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Podcast</span>
              <h1 className="text-3xl font-black mb-1">{show.title}</h1>
              <p className="text-white/50 text-sm mb-2">{show.author}</p>
              {show.description && (
                <p className="text-white/40 text-xs max-w-sm line-clamp-3">{show.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-white/30 text-xs">
                {show.category && <span className="capitalize">{show.category}</span>}
                {show.language && <span className="uppercase">{show.language}</span>}
                <span>{episodes.length} episode{episodes.length !== 1 ? 's' : ''}</span>
                {listenedCount > 0 && (
                  <span className="text-[#00D9FF]">{listenedCount} listened</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 pb-32">
        {episodes.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Mic2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No episodes yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {episodes.map(ep => (
              <EpisodeRow
                key={ep.id}
                ep={ep}
                show={show}
                isActive={currentTrack?.id === ep.id}
                isPlaying={isPlaying}
                onPlay={() => handlePlay(ep)}
                listened={listened.has(ep.id)}
                onToggleListened={() => toggleListened(ep.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
