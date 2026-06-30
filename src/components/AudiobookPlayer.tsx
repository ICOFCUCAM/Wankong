import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PlayCircle, PauseCircle, SkipBack, SkipForward,
  Bookmark, BookmarkCheck, Moon,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Bookmark {
  id:    string;
  time:  number;
  label: string;
}

interface AudiobookPlayerProps {
  src:          string;
  title:        string;
  chapterNum?:  number;
  bookId?:      string;  // used for per-book progress + bookmark storage
  onEnded?:     () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type SpeedPreset = typeof SPEED_PRESETS[number];

const SLEEP_OPTIONS = [
  { label: 'Off',   value: 0    },
  { label: '15 m',  value: 15   },
  { label: '30 m',  value: 30   },
  { label: '45 m',  value: 45   },
  { label: '1 h',   value: 60   },
] as const;

// ── Storage helpers ────────────────────────────────────────────────────────────

function progressKey(bookId: string, src: string) {
  return `wk_ab_progress_${bookId || src.slice(-20)}`;
}
function bookmarkKey(bookId: string, src: string) {
  return `wk_ab_bookmarks_${bookId || src.slice(-20)}`;
}
function loadProgress(bookId: string, src: string): number {
  try { return Number(localStorage.getItem(progressKey(bookId, src)) ?? 0); } catch { return 0; }
}
function saveProgress(bookId: string, src: string, t: number) {
  try { localStorage.setItem(progressKey(bookId, src), String(t)); } catch {}
}
function loadBookmarks(bookId: string, src: string): Bookmark[] {
  try { return JSON.parse(localStorage.getItem(bookmarkKey(bookId, src)) || '[]'); } catch { return []; }
}
function saveBookmarks(bookId: string, src: string, bms: Bookmark[]) {
  try { localStorage.setItem(bookmarkKey(bookId, src), JSON.stringify(bms)); } catch {}
}

// ── Component ──────────────────────────────────────────────────────────────────

const AudiobookPlayer: React.FC<AudiobookPlayerProps> = ({
  src, title, chapterNum, bookId = '', onEnded,
}) => {
  const audioRef      = useRef<HTMLAudioElement>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [speed,       setSpeedState]  = useState<SpeedPreset>(1);
  const [bookmarks,   setBookmarks]   = useState<Bookmark[]>(() => loadBookmarks(bookId, src));
  const [showBms,     setShowBms]     = useState(false);
  const [sleepMins,   setSleepMins]   = useState(0);
  const [sleepLeft,   setSleepLeft]   = useState(0);
  const [showSleep,   setShowSleep]   = useState(false);

  // Reset when src changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    setIsLoading(true);
    setBookmarks(loadBookmarks(bookId, src));
    audio.load();
  }, [src]);

  // Restore saved position after metadata loads
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    setIsLoading(false);
    const saved = loadProgress(bookId, src);
    if (saved > 5 && saved < audio.duration - 5) {
      audio.currentTime = saved;
      setCurrentTime(saved);
      setProgress((saved / audio.duration) * 100);
    }
  }, [bookId, src]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    // Auto-save every ~5 seconds
    if (Math.floor(audio.currentTime) % 5 === 0) {
      saveProgress(bookId, src, audio.currentTime);
    }
  }, [bookId, src]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    saveProgress(bookId, src, 0);
    onEnded?.();
  }, [onEnded, bookId, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate',     handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended',          handleEnded);
    audio.addEventListener('canplay',        () => setIsLoading(false));
    return () => {
      audio.removeEventListener('timeupdate',     handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended',          handleEnded);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { await audio.play().catch(() => {}); setIsPlaying(true); }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    const pct = Number(e.target.value);
    audio.currentTime = (pct / 100) * audio.duration;
    setProgress(pct);
    setCurrentTime(audio.currentTime);
  }, []);

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
  };

  const setSpeed = (r: SpeedPreset) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = r;
    setSpeedState(r);
  };

  const addBookmark = () => {
    const bm: Bookmark = {
      id:    crypto.randomUUID(),
      time:  currentTime,
      label: `${chapterNum != null ? `Ch.${chapterNum} — ` : ''}${fmt(currentTime)}`,
    };
    const updated = [bm, ...bookmarks].slice(0, 20);
    setBookmarks(updated);
    saveBookmarks(bookId, src, updated);
  };

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    saveBookmarks(bookId, src, updated);
  };

  const jumpToBookmark = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  // Sleep timer
  useEffect(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (!sleepMins || !isPlaying) { setSleepLeft(0); return; }
    const ms = sleepMins * 60 * 1000;
    setSleepLeft(sleepMins * 60);
    const tick = setInterval(() => {
      setSleepLeft(prev => {
        if (prev <= 1) {
          clearInterval(tick);
          audioRef.current?.pause();
          setIsPlaying(false);
          setSleepMins(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [sleepMins, isPlaying]);

  return (
    <div className="bg-[#0D1635] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 w-full select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {chapterNum != null && (
            <span className="text-[#00D9FF] text-[10px] font-bold uppercase tracking-widest block mb-0.5">
              Chapter {chapterNum}
            </span>
          )}
          <h3 className="text-white font-semibold text-sm truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Bookmark toggle */}
          <button
            onClick={() => setShowBms(b => !b)}
            className={`p-1.5 rounded-lg transition-colors ${showBms ? 'text-[#00D9FF] bg-[#00D9FF]/10' : 'text-white/30 hover:text-white'}`}
            title="Bookmarks"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          {/* Add bookmark */}
          <button
            onClick={addBookmark}
            className="p-1.5 rounded-lg text-white/30 hover:text-[#FFB800] transition-colors"
            title="Add bookmark at current position"
          >
            <BookmarkCheck className="w-4 h-4" />
          </button>
          {/* Sleep timer */}
          <button
            onClick={() => setShowSleep(s => !s)}
            className={`p-1.5 rounded-lg transition-colors ${sleepMins > 0 ? 'text-[#9D4EDD] bg-[#9D4EDD]/10' : 'text-white/30 hover:text-white'}`}
            title="Sleep timer"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sleep timer dropdown */}
      {showSleep && (
        <div className="flex items-center gap-2 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-xl px-3 py-2">
          <Moon className="w-3.5 h-3.5 text-[#9D4EDD] shrink-0" />
          <span className="text-[#9D4EDD] text-xs font-medium mr-auto">
            {sleepMins > 0 ? `Stopping in ${fmt(sleepLeft)}` : 'Sleep timer'}
          </span>
          {SLEEP_OPTIONS.map(o => (
            <button key={o.value} onClick={() => { setSleepMins(o.value); setShowSleep(false); }}
              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold transition-all ${
                sleepMins === o.value ? 'bg-[#9D4EDD] text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Bookmarks panel */}
      {showBms && (
        <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
          {bookmarks.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-3">No bookmarks yet. Tap the bookmark+ button to save positions.</p>
          ) : (
            <div className="max-h-36 overflow-y-auto divide-y divide-white/5" style={{ scrollbarWidth: 'none' }}>
              {bookmarks.map(bm => (
                <div key={bm.id} className="flex items-center gap-2 px-3 py-2">
                  <button onClick={() => jumpToBookmark(bm.time)}
                    className="flex-1 text-left text-white/70 text-xs hover:text-white transition-colors truncate">
                    {bm.label}
                  </button>
                  <button onClick={() => removeBookmark(bm.id)}
                    className="text-white/20 hover:text-red-400 transition-colors text-xs">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scrubber */}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={100}
          step={0.05}
          value={progress}
          onChange={handleSeek}
          disabled={isLoading || duration === 0}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(to right, #00D9FF ${progress}%, rgba(255,255,255,0.08) ${progress}%)` }}
        />
        <div className="flex justify-between text-[11px] text-white/30 font-mono tabular-nums">
          <span>{fmt(currentTime)}</span>
          <span>{isLoading ? '--:--' : `-${fmt(Math.max(0, duration - currentTime))}`}</span>
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-4">
        {/* −30s */}
        <button onClick={() => skip(-30)} className="flex flex-col items-center text-white/40 hover:text-white transition-colors">
          <SkipBack className="w-5 h-5" />
          <span className="text-[9px] mt-0.5">30s</span>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="text-[#00D9FF] hover:text-white transition-colors disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying
            ? <PauseCircle className="w-12 h-12" />
            : <PlayCircle  className="w-12 h-12" />}
        </button>

        {/* +30s */}
        <button onClick={() => skip(30)} className="flex flex-col items-center text-white/40 hover:text-white transition-colors">
          <SkipForward className="w-5 h-5" />
          <span className="text-[9px] mt-0.5">30s</span>
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-1.5 justify-center">
        <span className="text-white/25 text-[10px] uppercase tracking-wider mr-1">Speed</span>
        {SPEED_PRESETS.map(r => (
          <button key={r} onClick={() => setSpeed(r)}
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
              speed === r ? 'bg-[#00D9FF] text-[#0B0814]' : 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white'
            }`}>
            {r}×
          </button>
        ))}
      </div>
    </div>
  );
};

export default AudiobookPlayer;
