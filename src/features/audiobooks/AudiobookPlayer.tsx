import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
} from 'lucide-react';
import { getChapters, AudiobookChapter } from './AudiobookService';

interface AudiobookPlayerProps {
  audiobookId: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudiobookPlayer({ audiobookId }: AudiobookPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getChapters(audiobookId)
      .then((ch) => {
        setChapters(ch);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to load chapters');
        setLoading(false);
      });
  }, [audiobookId]);

  const currentChapter = chapters[currentIndex] ?? null;

  // Load new audio src when chapter changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentChapter) return;
    audio.src = currentChapter.audio_url;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentChapter]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next < chapters.length) {
        return next;
      }
      setIsPlaying(false);
      return prev;
    });
  }, [chapters.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !currentChapter) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const val = Number(e.target.value);
    if (audio) {
      audio.currentTime = val;
      setCurrentTime(val);
    }
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(chapters.length - 1, prev + 1));
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !muted;
      setMuted(!muted);
    }
  };

  const selectChapter = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
    setTimeout(() => {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    }, 50);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0B0814] rounded-2xl">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 bg-[#0B0814] rounded-2xl">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-[#0B0814] rounded-2xl">
        <p className="text-gray-400 text-sm">No chapters available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0814] rounded-2xl border border-white/10 overflow-hidden">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" muted={muted} />

      <div className="flex flex-col md:flex-row h-full min-h-[480px]">
        {/* ── Chapter List ── */}
        <div className="md:w-72 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto max-h-80 md:max-h-none">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#00D9FF]">
              Chapters
            </h3>
          </div>
          <ul className="divide-y divide-white/5">
            {chapters.map((ch, idx) => (
              <li key={ch.id}>
                <button
                  onClick={() => selectChapter(idx)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                    idx === currentIndex
                      ? 'bg-[#00D9FF]/10 text-[#00D9FF]'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`mt-0.5 text-xs font-bold w-6 shrink-0 ${
                      idx === currentIndex ? 'text-[#00D9FF]' : 'text-gray-500'
                    }`}
                  >
                    {ch.chapter_num}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ch.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(ch.duration_s)}
                    </p>
                  </div>
                  {idx === currentIndex && isPlaying && (
                    <span className="ml-auto shrink-0 flex gap-0.5 items-end h-4 mt-0.5">
                      {[3, 5, 3, 5].map((h, i) => (
                        <span
                          key={i}
                          className="w-0.5 bg-[#00D9FF] rounded-full animate-pulse"
                          style={{ height: `${h * 2}px`, animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Player Controls ── */}
        <div className="flex-1 flex flex-col justify-center p-6 md:p-8 gap-6">
          {/* Now playing info */}
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-[#00D9FF] mb-1">
              Chapter {currentChapter?.chapter_num ?? '—'}
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
              {currentChapter?.title ?? 'Select a chapter'}
            </h2>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00D9FF] [&::-webkit-slider-thumb]:cursor-pointer"
              style={{ marginTop: '-10px' }}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-full text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous chapter"
            >
              <SkipBack size={22} />
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-[#0B0814] flex items-center justify-center shadow-lg shadow-[#00D9FF]/20 transition-all active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>

            <button
              onClick={goToNext}
              disabled={currentIndex >= chapters.length - 1}
              className="p-2 rounded-full text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next chapter"
            >
              <SkipForward size={22} />
            </button>
          </div>

          {/* Mute + chapter progress */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <button
              onClick={toggleMute}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{muted ? 'Muted' : 'Sound on'}</span>
            </button>
            <span>
              {currentIndex + 1} / {chapters.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudiobookPlayer;
