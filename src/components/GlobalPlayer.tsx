import React, {
  createContext, useContext, useState, useRef, useEffect,
  useCallback, useMemo, ReactNode,
} from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ListMusic, Maximize2, X,
  Heart, Share2, ChevronDown, Music,
} from 'lucide-react';
import SleepTimer from '@/components/SleepTimer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { recordMusicStream } from '@/pipelines/earnings/EarningsWorker';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Track {
  id: string;
  title: string;
  artist: string;
  artist_id?: string;   // artist's auth.users UUID (used for earnings recording)
  album?: string;
  cover?: string;       // legacy field kept for backward compat
  albumArt?: string;
  audioUrl?: string;
  videoUrl?: string;
  canvasUrl?: string;   // looping background video (Spotify Canvas style)
  lyrics?: string;
  duration?: number;
  price?: string;
  type?: 'audio' | 'video' | 'podcast';
}

interface PlayerCtx {
  currentTrack: Track | null;
  queue: Track[];
  recentlyPlayed: Track[];
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  playbackRate: number;
  showQueue: boolean;
  showNowPlaying: boolean;
  analyserNode: AnalyserNode | null;
  liked: Set<string>;
  play: (track: Track, queue?: Track[]) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (pct: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackRate: (r: number) => void;
  toggleLike: (id: string) => void;
  setShowQueue: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowNowPlaying: (v: boolean) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  playPlaylist: (tracks: Track[], startIndex?: number) => void;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmt(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function extractColor(src: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 8;
        const ctx2d = c.getContext('2d')!;
        ctx2d.drawImage(img, 0, 0, 8, 8);
        const d = ctx2d.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        resolve(`rgb(${~~(r / n)},${~~(g / n)},${~~(b / n)})`);
      } catch { resolve('#0D1635'); }
    };
    img.onerror = () => resolve('#0D1635');
    img.src = src;
  });
}

// ─── Context ──────────────────────────────────────────────────────────────────
const Ctx = createContext<PlayerCtx | null>(null);

export function usePlayer(): PlayerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlayer must be inside PlayerProvider');
  return c;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef    = useRef<HTMLAudioElement>(new Audio());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wiredRef    = useRef(false);
  const { user } = useAuth();

  // Stream session tracking — holds the track currently being recorded
  const streamSessionRef = useRef<{ trackId: string; artistId?: string } | null>(null);

  const [currentTrack,   setCurrentTrack]   = useState<Track | null>(null);
  const [queue,          setQueue]          = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => {
    try { return JSON.parse(localStorage.getItem('wk_recent') || '[]'); } catch { return []; }
  });
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [volume,         setVolumeState]    = useState(() => Number(localStorage.getItem('wk_vol') ?? 80));
  const [isMuted,        setIsMuted]        = useState(false);
  const [shuffle,        setShuffle]        = useState(false);
  const [repeat,         setRepeat]         = useState<'off' | 'one' | 'all'>('off');
  const [showQueue,      setShowQueue]      = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [analyserNode,   setAnalyserNode]   = useState<AnalyserNode | null>(null);
  const [playbackRate,   setPlaybackRateState] = useState(1);
  const [liked, setLiked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('wk_liked') || '[]')); } catch { return new Set(); }
  });

  const addToRecent = useCallback((track: Track) => {
    setRecentlyPlayed(prev => {
      const updated = [track, ...prev.filter(t => t.id !== track.id)].slice(0, 12);
      localStorage.setItem('wk_recent', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Stream event recording ─────────────────────────────────────────────────
  // Flush the active stream session to stream_events + credit artist earnings.
  // Called on track-change, skip, or natural end.
  const flushStreamEvent = useCallback(async (skipped: boolean) => {
    const session = streamSessionRef.current;
    if (!session) return;
    streamSessionRef.current = null;

    const a = audioRef.current;
    const durationPct = a.duration > 0
      ? Math.round((a.currentTime / a.duration) * 100)
      : 0;

    // Ignore micro-plays (< 5 s) to avoid noise from accidental taps
    if (a.currentTime < 5) return;

    // Write stream event (fire-and-forget, never blocks playback)
    supabase.from('stream_events').insert([{
      track_id:     session.trackId,
      user_id:      user?.id ?? null,
      duration_pct: durationPct,
      skipped,
      skip_at_pct:  skipped ? durationPct : null,
      platform:     'web',
      played_at:    new Date().toISOString(),
    }]).then(async ({ error }) => {
      if (error) return;
      // Credit artist earnings when listener heard ≥30% of the track
      if (durationPct >= 30) {
        let artistId = session.artistId;
        if (!artistId) {
          const { data } = await supabase
            .from('tracks')
            .select('artist_id')
            .eq('id', session.trackId)
            .single();
          artistId = data?.artist_id ?? undefined;
        }
        if (artistId) await recordMusicStream(artistId, session.trackId);
      }
    });
  }, [user]);

  const startStreamSession = useCallback((track: Track) => {
    streamSessionRef.current = {
      trackId:  track.id,
      artistId: track.artist_id,
    };
  }, []);

  // Wire audio element events once on mount
  useEffect(() => {
    const a = audioRef.current;
    a.volume = volume / 100;
    a.crossOrigin = 'anonymous';
    const onTime  = () => { setCurrentTime(a.currentTime); setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0); };
    const onMeta  = () => setDuration(a.duration || 0);
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      // Record completed (non-skipped) stream before moving on
      flushStreamEvent(false);
      setRepeat(r => {
        if (r === 'one') { a.currentTime = 0; a.play().catch(() => {}); return r; }
        setQueue(q => {
          if (!q.length) return q;
          const [next, ...rest] = q;
          setCurrentTrack(next);
          addToRecent(next);
          startStreamSession(next);
          if (next.audioUrl) { a.src = next.audioUrl; a.play().catch(() => {}); }
          return rest;
        });
        return r;
      });
    };
    a.addEventListener('timeupdate',     onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('play',           onPlay);
    a.addEventListener('pause',          onPause);
    a.addEventListener('ended',          onEnded);
    return () => {
      a.removeEventListener('timeupdate',     onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('play',           onPlay);
      a.removeEventListener('pause',          onPause);
      a.removeEventListener('ended',          onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initAudioCtx = useCallback(() => {
    if (wiredRef.current) { audioCtxRef.current?.resume(); return; }
    wiredRef.current = true;
    const ctx     = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    ctx.createMediaElementSource(audioRef.current).connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    setAnalyserNode(analyser);
  }, []);

  const play = useCallback((track: Track, newQueue?: Track[]) => {
    flushStreamEvent(true);   // flush previous track as skipped (user picked a new one)
    initAudioCtx();
    setCurrentTrack(track);
    if (newQueue) setQueue(newQueue.filter(t => t.id !== track.id));
    addToRecent(track);
    startStreamSession(track);
    const a = audioRef.current;
    if (track.audioUrl) { a.src = track.audioUrl; a.play().catch(() => {}); }
    else { a.pause(); setIsPlaying(false); }
  }, [initAudioCtx, addToRecent, flushStreamEvent, startStreamSession]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    initAudioCtx();
    const a = audioRef.current;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }, [currentTrack, initAudioCtx]);

  const next = useCallback(() => {
    flushStreamEvent(true);   // user skipped forward
    setQueue(q => {
      if (!q.length) { audioRef.current.pause(); return q; }
      const idx = shuffle ? Math.floor(Math.random() * q.length) : 0;
      const copy = [...q];
      const [picked] = copy.splice(idx, 1);
      play(picked);
      return copy;
    });
  }, [shuffle, play, flushStreamEvent]);

  const prev = useCallback(() => {
    if (audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    flushStreamEvent(true);   // user skipped backward
    setRecentlyPlayed(r => { if (r.length > 1) play(r[1]); return r; });
  }, [play, flushStreamEvent]);

  const seek = useCallback((pct: number) => {
    const a = audioRef.current;
    if (!a.duration) return;
    a.currentTime = (pct / 100) * a.duration;
  }, []);

  const setPlaybackRate = useCallback((r: number) => {
    audioRef.current.playbackRate = r;
    setPlaybackRateState(r);
  }, []);

  const setVolume = useCallback((v: number) => {
    audioRef.current.volume = v / 100;
    setVolumeState(v);
    localStorage.setItem('wk_vol', String(v));
    if (v > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(m => { audioRef.current.muted = !m; return !m; });
  }, []);

  const toggleLike = useCallback((id: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('wk_liked', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space')      { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') seek(Math.min(100, progress + 2));
      if (e.code === 'ArrowLeft')  seek(Math.max(0, progress - 2));
      if (e.code === 'ArrowUp')    setVolume(Math.min(100, volume + 5));
      if (e.code === 'ArrowDown')  setVolume(Math.max(0, volume - 5));
      if (e.code === 'KeyM')       toggleMute();
      if (e.code === 'KeyS' && !e.metaKey) setShuffle(s => !s);
      if (e.code === 'KeyQ' && !e.metaKey) setShowQueue(q => !q);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [togglePlay, seek, setVolume, toggleMute, progress, volume]);

  const value: PlayerCtx = {
    currentTrack, queue, recentlyPlayed, isPlaying, progress, currentTime, duration,
    volume, isMuted, shuffle, repeat, playbackRate, showQueue, showNowPlaying, analyserNode, liked,
    play, playTrack: play, togglePlay,
    next, prev, nextTrack: next, prevTrack: prev,
    seek, setVolume, toggleMute, toggleLike, setPlaybackRate,
    toggleShuffle: () => setShuffle(s => !s),
    cycleRepeat:   () => setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'),
    setShowQueue, setShowNowPlaying,
    addToQueue:      (t: Track)    => setQueue(q => [...q, t]),
    removeFromQueue: (id: string)  => setQueue(q => q.filter(t => t.id !== id)),
    playPlaylist: (tracks: Track[], startIndex = 0) => {
      if (!tracks.length) return;
      flushStreamEvent(true);
      const idx    = Math.min(startIndex, tracks.length - 1);
      const picked = tracks[idx];
      const rest   = tracks.filter((_, i) => i !== idx);
      setCurrentTrack(picked);
      setQueue(rest);
      addToRecent(picked);
      startStreamSession(picked);
      const a = audioRef.current;
      if (picked.audioUrl) { a.src = picked.audioUrl; a.play().catch(() => {}); }
      else { a.pause(); }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ─── Visualiser hook ──────────────────────────────────────────────────────────
function useVisualiser(
  analyser: AnalyserNode | null,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  active: boolean,
) {
  const rafRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!analyser || !canvas || !active) { cancelAnimationFrame(rafRef.current); return; }
    const ctx = canvas.getContext('2d')!;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(buf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bw = (canvas.width / buf.length) * 2.2;
      buf.forEach((val, i) => {
        const h = (val / 255) * canvas.height;
        const g = ctx.createLinearGradient(0, canvas.height, 0, 0);
        g.addColorStop(0, '#00D9FF');
        g.addColorStop(1, '#9D4EDD');
        ctx.fillStyle = g;
        ctx.fillRect(i * (bw + 1), canvas.height - h, bw, h);
      });
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, active]);
}

// ─── Queue Sidebar ────────────────────────────────────────────────────────────
function QueueSidebar() {
  const { showQueue, setShowQueue, queue, recentlyPlayed, currentTrack, play, removeFromQueue, isPlaying } = usePlayer();
  const art = (t: Track) => t.albumArt || t.cover || '';

  return (
    <div className={`fixed top-0 right-0 h-full w-80 bg-[#0A1020]/98 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col transition-transform duration-300 ${showQueue ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
        <h2 className="text-white font-bold">Queue</h2>
        <button onClick={() => setShowQueue(false)} className="text-white/40 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>

        {/* Now Playing */}
        {currentTrack && (
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-[#00D9FF] text-[10px] font-bold uppercase tracking-widest mb-3">Now Playing</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/10">
                {art(currentTrack) ? <img src={art(currentTrack)} className="w-full h-full object-cover" alt="" /> : <Music className="w-5 h-5 text-white/30 m-auto mt-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{currentTrack.title}</p>
                <p className="text-white/40 text-xs truncate">{currentTrack.artist}</p>
              </div>
              {isPlaying && (
                <div className="flex gap-0.5 items-end shrink-0 h-4">
                  {[3, 5, 4, 6, 3].map((h, i) => (
                    <div key={i} className="w-0.5 bg-[#00D9FF] rounded-full animate-pulse" style={{ height: h * 2.5 + 'px', animationDelay: i * 90 + 'ms' }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Up */}
        {queue.length > 0 && (
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">Next Up — {queue.length}</p>
            <div className="space-y-1">
              {queue.map((t, i) => (
                <div key={t.id} onClick={() => play(t)}
                  className="flex items-center gap-3 hover:bg-white/5 rounded-xl px-2 py-2 -mx-2 cursor-pointer group transition-colors">
                  <span className="text-white/20 text-xs w-4 shrink-0 text-center">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white/10">
                    {art(t) && <img src={art(t)} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{t.title}</p>
                    <p className="text-white/40 text-[10px] truncate">{t.artist}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeFromQueue(t.id); }}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">Recently Played</p>
            <div className="space-y-1">
              {recentlyPlayed.slice(0, 10).map(t => (
                <div key={t.id} onClick={() => play(t)}
                  className="flex items-center gap-3 hover:bg-white/5 rounded-xl px-2 py-2 -mx-2 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white/10">
                    {art(t) && <img src={art(t)} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{t.title}</p>
                    <p className="text-white/40 text-[10px] truncate">{t.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LRC Lyrics utilities ─────────────────────────────────────────────────────
interface LrcLine { time: number; text: string }

function parseLrc(src: string): LrcLine[] {
  const timeRx = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const result: LrcLine[] = [];
  for (const line of src.split('\n')) {
    const times: number[] = [];
    let m: RegExpExecArray | null;
    timeRx.lastIndex = 0;
    while ((m = timeRx.exec(line)) !== null) {
      const ms = (m[3] || '0').padEnd(3, '0').slice(0, 3);
      times.push(Number(m[1]) * 60 + Number(m[2]) + Number(ms) / 1000);
    }
    const text = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    if (text) times.forEach(t => result.push({ time: t, text }));
  }
  return result.sort((a, b) => a.time - b.time);
}

function isLrc(s: string): boolean {
  return /\[\d{1,2}:\d{2}/.test(s);
}

// ─── Lyrics Panel ─────────────────────────────────────────────────────────────
function LyricsPanel({ lyrics, currentTime }: { lyrics?: string; currentTime: number }) {
  const text      = lyrics || '';
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs  = useRef<(HTMLParagraphElement | null)[]>([]);

  const lrc = useMemo(() => isLrc(text) ? parseLrc(text) : null, [text]);

  const activeIdx = useMemo(() => {
    if (!lrc) return -1;
    let idx = -1;
    for (let i = 0; i < lrc.length; i++) {
      if (currentTime >= lrc[i].time) idx = i; else break;
    }
    return idx;
  }, [lrc, currentTime]);

  useEffect(() => {
    const el = lineRefs.current[activeIdx];
    if (el && scrollRef.current) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeIdx]);

  const placeholder =
    'Lyrics not available for this track.\n\nSync your lyrics via the Creator Dashboard\nand they will appear here in real time.';

  if (!lrc) {
    return (
      <div ref={scrollRef} className="flex-1 w-full overflow-y-auto py-4 mb-4" style={{ scrollbarWidth: 'none' }}>
        <div className="space-y-4 text-center px-2">
          {(text || placeholder).split('\n').map((line, i) => (
            <p key={i} className={`text-lg leading-relaxed transition-all ${line.trim() ? 'text-white font-medium' : 'py-1'}`}>
              {line || '\u00a0'}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 w-full overflow-y-auto py-4 mb-4" style={{ scrollbarWidth: 'none' }}>
      <div className="space-y-5 text-center px-2 pb-24">
        {lrc.map((line, i) => (
          <p
            key={i}
            ref={el => { lineRefs.current[i] = el; }}
            className={`text-xl leading-snug font-bold transition-all duration-300 ${
              i === activeIdx
                ? 'text-white scale-105'
                : i < activeIdx
                  ? 'text-white/25 scale-95'
                  : 'text-white/45 scale-95'
            }`}
            style={i === activeIdx ? {
              background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px rgba(0,217,255,0.4))',
            } : undefined}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Now Playing Full-Screen Modal ────────────────────────────────────────────
function NowPlayingModal() {
  const {
    currentTrack, isPlaying, togglePlay, next, prev, seek, progress, currentTime, duration,
    volume, setVolume, isMuted, toggleMute, shuffle, toggleShuffle, repeat, cycleRepeat,
    playbackRate, setPlaybackRate,
    showNowPlaying, setShowNowPlaying, liked, toggleLike, analyserNode,
  } = usePlayer();

  const [bgColor,    setBgColor]    = useState('#0D1635');
  const [showLyrics, setShowLyrics] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useVisualiser(analyserNode, canvasRef, isPlaying && showNowPlaying);
  const art = currentTrack?.albumArt || currentTrack?.cover || '';

  useEffect(() => {
    if (art) extractColor(art).then(setBgColor);
  }, [art]);

  if (!currentTrack || !showNowPlaying) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch overflow-hidden"
      style={{ background: `linear-gradient(150deg, ${bgColor}dd 0%, #0B0814 55%)` }}>
      {/* Spotify Canvas looping video */}
      {currentTrack.canvasUrl && (
        <video src={currentTrack.canvasUrl} autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(150deg,${bgColor}88 0%,#0B081488 100%)`, backdropFilter: 'blur(40px)' }} />

      <div className="relative flex-1 flex flex-col items-center justify-between py-10 px-6 max-w-sm mx-auto w-full">
        {/* Top */}
        <div className="flex items-center justify-between w-full mb-6">
          <button onClick={() => setShowNowPlaying(false)} className="text-white/50 hover:text-white transition-colors p-1">
            <ChevronDown className="w-6 h-6" />
          </button>
          <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Now Playing</p>
            {currentTrack.album && <p className="text-white/60 text-xs mt-0.5">{currentTrack.album}</p>}
          </div>
          <button onClick={() => setShowLyrics(l => !l)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${showLyrics ? 'bg-white/10 text-white border-white/20' : 'text-white/40 border-white/10 hover:text-white'}`}>
            Lyrics
          </button>
        </div>

        {!showLyrics ? (
          <>
            {/* Album art */}
            <div className={`relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 mb-6 transition-all duration-500 ${isPlaying ? 'w-64 h-64 md:w-72 md:h-72' : 'w-56 h-56 md:w-64 md:h-64'}`}>
              {art
                ? <img src={art} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center"><Music className="w-20 h-20 text-white/20" /></div>}
            </div>

            {/* Web Audio Visualiser */}
            <canvas ref={canvasRef} width={260} height={36} className={`mb-4 rounded transition-opacity ${isPlaying ? 'opacity-70' : 'opacity-20'}`} />

            {/* Track info */}
            <div className="flex items-center w-full mb-5">
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-xl font-black truncate">{currentTrack.title}</h2>
                <p className="text-white/50 text-sm">{currentTrack.artist}</p>
              </div>
              <button onClick={() => toggleLike(currentTrack.id)} className="ml-3 shrink-0 p-1">
                <Heart className={`w-6 h-6 transition-all duration-200 ${liked.has(currentTrack.id) ? 'fill-[#FF006E] text-[#FF006E] scale-110' : 'text-white/30 hover:text-white'}`} />
              </button>
            </div>
          </>
        ) : (
          <LyricsPanel lyrics={currentTrack.lyrics} currentTime={currentTime} />
        )}

        {/* Scrubber */}
        <div className="w-full mb-5">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group mb-1"
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * 100); }}>
            <div className="h-full bg-white rounded-full transition-all group-hover:bg-[#00D9FF]" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-white/30 text-[10px]">
            <span>{fmt(currentTime)}</span>
            <span>-{fmt(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mb-5">
          <button onClick={toggleShuffle} className={`transition-colors ${shuffle ? 'text-[#00D9FF]' : 'text-white/30 hover:text-white'}`}>
            <Shuffle className="w-5 h-5" />
          </button>
          <button onClick={prev} className="text-white/60 hover:text-white transition-colors"><SkipBack className="w-7 h-7" /></button>
          <button onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white shadow-2xl shadow-black/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
            {isPlaying
              ? <Pause className="w-7 h-7 text-[#0B0814]" />
              : <Play className="w-7 h-7 text-[#0B0814] ml-1" />}
          </button>
          <button onClick={next} className="text-white/60 hover:text-white transition-colors"><SkipForward className="w-7 h-7" /></button>
          <button onClick={cycleRepeat} className={`transition-colors ${repeat !== 'off' ? 'text-[#00D9FF]' : 'text-white/30 hover:text-white'}`}>
            {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-1.5 w-full mb-3">
          <span className="text-white/30 text-[10px] uppercase tracking-wider mr-1">Speed</span>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
            <button key={r} onClick={() => setPlaybackRate(r)}
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition-all ${
                playbackRate === r
                  ? 'bg-[#00D9FF] text-[#0B0814]'
                  : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
              }`}>
              {r}×
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full">
          <button onClick={toggleMute} className="text-white/40 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input type="range" min={0} max={100} value={isMuted ? 0 : volume} onChange={e => setVolume(Number(e.target.value))}
            className="flex-1 h-1 rounded-full accent-white cursor-pointer" />
          <button className="text-white/40 hover:text-white transition-colors"><Share2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Player Bar ────────────────────────────────────────────────────────
export default function GlobalPlayer() {
  const {
    currentTrack, isPlaying, togglePlay, next, prev, seek,
    progress, currentTime, duration, volume, setVolume,
    isMuted, toggleMute, shuffle, toggleShuffle, repeat, cycleRepeat,
    playbackRate, setPlaybackRate,
    showQueue, setShowQueue, setShowNowPlaying, liked, toggleLike,
    analyserNode, queue,
  } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useVisualiser(analyserNode, canvasRef, isPlaying);
  const art = currentTrack?.albumArt || currentTrack?.cover || '';

  return (
    <>
      <NowPlayingModal />
      <QueueSidebar />

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-20 bg-[#0B0814]/96 backdrop-blur-2xl border-t border-white/10">
          <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-4">

            {/* Track info (click → Now Playing) */}
            <div onClick={() => setShowNowPlaying(true)}
              className="flex items-center gap-3 w-52 shrink-0 cursor-pointer group min-w-0">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
                {art
                  ? <img src={art} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center"><Music className="w-5 h-5 text-white/40" /></div>}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/20 flex items-end justify-center gap-0.5 pb-1">
                    {[3, 5, 4, 6].map((h, i) => (
                      <div key={i} className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: h * 2 + 'px', animationDelay: i * 80 + 'ms' }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate group-hover:text-[#00D9FF] transition-colors">{currentTrack.title}</p>
                <p className="text-white/40 text-xs truncate">{currentTrack.artist}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); toggleLike(currentTrack.id); }} className="ml-1 shrink-0 p-0.5">
                <Heart className={`w-4 h-4 transition-all ${liked.has(currentTrack.id) ? 'fill-[#FF006E] text-[#FF006E]' : 'text-white/20 hover:text-white/60'}`} />
              </button>
            </div>

            {/* Controls + scrubber */}
            <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
              <div className="flex items-center justify-center gap-4">
                <button onClick={toggleShuffle} className={`transition-colors ${shuffle ? 'text-[#00D9FF]' : 'text-white/25 hover:text-white/60'}`}>
                  <Shuffle className="w-4 h-4" />
                </button>
                <button onClick={prev} className="text-white/50 hover:text-white transition-colors"><SkipBack className="w-5 h-5" /></button>
                <button onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-cyan-500/20">
                  {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <button onClick={next} className="text-white/50 hover:text-white transition-colors"><SkipForward className="w-5 h-5" /></button>
                <button onClick={cycleRepeat} className={`transition-colors ${repeat !== 'off' ? 'text-[#00D9FF]' : 'text-white/25 hover:text-white/60'}`}>
                  {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/25 w-7 text-right tabular-nums shrink-0">{fmt(currentTime)}</span>
                <div className="flex-1 relative h-1 bg-white/10 rounded-full cursor-pointer group"
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * 100); }}>
                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] rounded-full" style={{ width: `${progress}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${progress}% - 6px)` }} />
                </div>
                <span className="text-[10px] text-white/25 w-7 tabular-nums shrink-0">{fmt(duration)}</span>
              </div>
            </div>

            {/* Volume + visualiser + extras */}
            <div className="flex items-center gap-2.5 w-52 shrink-0 justify-end">
              <canvas ref={canvasRef} width={56} height={26}
                className={`rounded transition-opacity hidden md:block ${isPlaying ? 'opacity-80' : 'opacity-0'}`} />
              {/* Speed chip — click cycles through presets */}
              <button
                onClick={() => {
                  const presets = [1, 1.25, 1.5, 2, 0.5, 0.75];
                  const idx = presets.indexOf(playbackRate);
                  setPlaybackRate(presets[(idx + 1) % presets.length]);
                }}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all hidden md:block ${
                  playbackRate !== 1 ? 'bg-[#00D9FF]/20 text-[#00D9FF]' : 'bg-white/5 text-white/25 hover:text-white/60'
                }`}
                title="Playback speed"
              >
                {playbackRate}×
              </button>
              <button onClick={toggleMute} className="text-white/40 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input type="range" min={0} max={100} value={isMuted ? 0 : volume} onChange={e => setVolume(Number(e.target.value))}
                className="w-20 h-1 rounded-full accent-[#00D9FF] cursor-pointer hidden md:block" />
              <div className="hidden md:block">
                <SleepTimer onStop={() => { if (isPlaying) togglePlay(); }} />
              </div>
              <button onClick={() => setShowQueue(q => !q)}
                className={`p-1.5 rounded-lg transition-all relative ${showQueue ? 'text-[#00D9FF] bg-[#00D9FF]/10' : 'text-white/30 hover:text-white'}`}>
                <ListMusic className="w-4 h-4" />
                {queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00D9FF] text-[#0B0814] text-[8px] font-black flex items-center justify-center">
                    {queue.length > 9 ? '9+' : queue.length}
                  </span>
                )}
              </button>
              <button onClick={() => setShowNowPlaying(true)} className="text-white/30 hover:text-white transition-colors p-1">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
