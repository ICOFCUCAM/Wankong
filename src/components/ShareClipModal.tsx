import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Scissors, Play, Pause, Copy, Share2, Check, Download } from 'lucide-react';
import type { Track } from '@/components/GlobalPlayer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  track:   Track;
  onClose: () => void;
}

const MAX_CLIP = 30; // seconds
const MIN_CLIP = 5;

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ShareClipModal({ track, onClose }: Props) {
  const audioRef   = useRef<HTMLAudioElement>(null);
  const rafRef     = useRef(0);
  const waveRef    = useRef<HTMLCanvasElement>(null);

  const [duration,  setDuration]  = useState(0);
  const [currentT,  setCurrentT]  = useState(0);
  const [playing,   setPlaying]   = useState(false);
  const [start,     setStart]     = useState(0);
  const [end,       setEnd]       = useState(MIN_CLIP);
  const [copied,    setCopied]    = useState(false);
  const [dragging,  setDragging]  = useState<'start' | 'end' | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Load audio duration
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track.audioUrl) return;
    a.src = track.audioUrl;
    const onMeta = () => {
      const d = a.duration || 0;
      setDuration(d);
      setStart(0);
      setEnd(Math.min(MAX_CLIP, d));
    };
    a.addEventListener('loadedmetadata', onMeta);
    a.load();
    return () => a.removeEventListener('loadedmetadata', onMeta);
  }, [track.audioUrl]);

  // Animate playhead and stop at clip end
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const tick = () => {
      setCurrentT(a.currentTime);
      if (a.currentTime >= end) {
        a.pause();
        a.currentTime = start;
        setPlaying(false);
        return;
      }
      if (!a.paused) rafRef.current = requestAnimationFrame(tick);
    };

    if (playing) {
      a.currentTime = Math.max(a.currentTime, start);
      a.play().catch(() => {});
      rafRef.current = requestAnimationFrame(tick);
    } else {
      a.pause();
      cancelAnimationFrame(rafRef.current);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, start, end]);

  // Draw waveform (static decorative bars)
  useEffect(() => {
    const c = waveRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const bars = 80;
    const bw = c.width / bars;
    ctx.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < bars; i++) {
      const x = i * bw;
      const h = (0.2 + Math.abs(Math.sin(i * 0.37 + 1.5)) * 0.8) * c.height;
      const pct = i / bars;
      const inClip = pct >= start / duration && pct <= end / duration;
      ctx.fillStyle = inClip ? '#00D9FF' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 1, (c.height - h) / 2, bw - 2, h);
    }
  }, [start, end, duration]);

  // Drag handle logic on the timeline bar
  const onBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    const t    = pct * duration;
    // Move whichever handle is closer
    const dStart = Math.abs(t - start);
    const dEnd   = Math.abs(t - end);
    if (dStart < dEnd) {
      setStart(Math.max(0, Math.min(end - MIN_CLIP, t)));
    } else {
      setEnd(Math.min(duration, Math.max(start + MIN_CLIP, Math.min(start + MAX_CLIP, t))));
    }
  };

  const clipDuration = end - start;
  const shareUrl     = `${window.location.origin}/products/${track.id}?t=${Math.floor(start)}&clip=${Math.floor(clipDuration)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareNative = () => {
    navigator.share?.({
      title: `"${track.title}" – WANKONG`,
      text:  `Listen to this ${Math.round(clipDuration)}s clip`,
      url:   shareUrl,
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0B0814] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#00D9FF]" />
            <h2 className="text-white font-bold">Create Clip</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Track info */}
          <div className="flex items-center gap-3">
            {track.albumArt
              ? <img src={track.albumArt} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] shrink-0" />}
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{track.title}</p>
              <p className="text-white/40 text-xs">{track.artist}</p>
            </div>
          </div>

          {/* Waveform */}
          <div>
            <canvas ref={waveRef} width={380} height={48}
              className="w-full rounded-lg cursor-pointer"
              onClick={e => {
                if (!barRef.current || !duration) return;
                const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
                const pct  = (e.clientX - rect.left) / rect.width;
                const t    = pct * duration;
                const dS = Math.abs(t - start), dE = Math.abs(t - end);
                if (dS < dE) setStart(Math.max(0, Math.min(end - MIN_CLIP, t)));
                else setEnd(Math.min(duration, Math.max(start + MIN_CLIP, Math.min(start + MAX_CLIP, t))));
              }}
            />
          </div>

          {/* Timeline bar */}
          <div ref={barRef} className="relative h-5 rounded-full bg-white/8 cursor-pointer select-none"
            onClick={onBarClick}>
            {duration > 0 && (
              <>
                {/* Selected range */}
                <div className="absolute top-0 h-full rounded-full bg-[#00D9FF]/30"
                  style={{
                    left:  `${(start / duration) * 100}%`,
                    width: `${((end - start) / duration) * 100}%`,
                  }} />
                {/* Start handle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#00D9FF] shadow-lg cursor-grab border-2 border-white"
                  style={{ left: `calc(${(start / duration) * 100}% - 8px)` }}
                  onMouseDown={() => setDragging('start')}
                />
                {/* End handle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#9D4EDD] shadow-lg cursor-grab border-2 border-white"
                  style={{ left: `calc(${(end / duration) * 100}% - 8px)` }}
                  onMouseDown={() => setDragging('end')}
                />
                {/* Playhead */}
                <div
                  className="absolute top-0 w-0.5 h-full bg-white/60 pointer-events-none"
                  style={{ left: `${(currentT / duration) * 100}%` }} />
              </>
            )}
          </div>

          {/* Time labels */}
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{fmt(start)}</span>
            <span className="text-white font-semibold">{Math.round(clipDuration)}s clip</span>
            <span>{fmt(end)}</span>
          </div>

          {/* Range inputs fallback */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-white/30 mb-1">Start</label>
              <input type="range" min={0} max={Math.max(0, end - MIN_CLIP)} step={0.5}
                value={start}
                onChange={e => setStart(Number(e.target.value))}
                className="w-full accent-[#00D9FF]" />
            </div>
            <div>
              <label className="block text-white/30 mb-1">End (max 30s)</label>
              <input type="range"
                min={start + MIN_CLIP}
                max={Math.min(duration, start + MAX_CLIP)}
                step={0.5}
                value={end}
                onChange={e => setEnd(Number(e.target.value))}
                className="w-full accent-[#9D4EDD]" />
            </div>
          </div>

          {/* Preview play button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying(p => !p)}
              disabled={!track.audioUrl || !duration}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-white text-sm font-semibold hover:border-white/30 transition-all disabled:opacity-30"
            >
              {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              Preview Clip
            </button>
            <span className="text-white/25 text-xs">{fmt(start)} – {fmt(end)}</span>
          </div>

          {/* Share actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Copy Clip Link'}
            </button>
            {'share' in navigator && (
              <button onClick={shareNative}
                className="px-4 py-3 rounded-xl border border-white/15 text-white/60 hover:border-white/30 hover:text-white transition-all">
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-center text-white/20 text-[10px]">
            Listeners will hear {Math.round(clipDuration)}s starting at {fmt(start)} · Powered by WANKONG
          </p>
        </div>
      </div>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </div>
  );
}
