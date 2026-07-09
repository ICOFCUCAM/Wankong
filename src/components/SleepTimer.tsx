import React, { useState, useEffect, useRef } from 'react';
import { Moon, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SleepTimerProps {
  onStop: () => void;
}

// ── Presets ────────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  minutes: number; // -1 = "End of track"
}

const PRESETS: Preset[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: 'End of track', minutes: -1 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SleepTimer({ onStop }: SleepTimerProps) {
  const [isOpen,          setIsOpen]          = useState(false);
  const [isActive,        setIsActive]        = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [minutesLeft,     setMinutesLeft]     = useState<number | null>(null); // in seconds when active

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popoverRef  = useRef<HTMLDivElement>(null);

  // ── Close popover on outside click ────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // ── Countdown interval ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive || minutesLeft === null || minutesLeft === -1) return;

    intervalRef.current = setInterval(() => {
      setMinutesLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsActive(false);
          setSelectedMinutes(null);
          onStop();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, onStop]); // eslint-disable-line react-hooks/exhaustive-deps
  // minutesLeft intentionally excluded — we only want this to re-run when isActive changes

  // ── Start timer ───────────────────────────────────────────────────────────────

  function startTimer(preset: Preset) {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setSelectedMinutes(preset.minutes);
    setIsOpen(false);

    if (preset.minutes === -1) {
      // "End of track" — mark active but no countdown; parent handles stopping on track end
      setMinutesLeft(-1);
      setIsActive(true);
      return;
    }

    const totalSeconds = preset.minutes * 60;
    setMinutesLeft(totalSeconds);
    setIsActive(true);
  }

  // ── Cancel timer ──────────────────────────────────────────────────────────────

  function cancelTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    setSelectedMinutes(null);
    setMinutesLeft(null);
    setIsOpen(false);
  }

  // ── Derived display values ─────────────────────────────────────────────────────

  const isEndOfTrack     = isActive && minutesLeft === -1;
  const countdownDisplay = minutesLeft !== null && minutesLeft > 0 && minutesLeft !== -1
    ? formatTime(minutesLeft)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={popoverRef}>

      {/* ── Trigger button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                    transition-colors
                    ${isActive
                      ? 'bg-[#00D9FF]/15 border border-[#00D9FF]/40 text-[#00D9FF]'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                    }`}
        title="Sleep timer"
      >
        <Moon className="w-3.5 h-3.5" />
        {isActive ? (
          isEndOfTrack ? (
            <span>End of track</span>
          ) : countdownDisplay ? (
            <span className="font-mono">{countdownDisplay}</span>
          ) : null
        ) : null}
      </button>

      {/* ── Active cancel button ─────────────────────────────────────────────── */}
      {isActive && (
        <button
          onClick={cancelTimer}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700
                     hover:bg-red-500/80 text-gray-300 hover:text-white transition-colors
                     flex items-center justify-center"
          title="Cancel sleep timer"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {/* ── Popover ──────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="absolute bottom-full mb-2 right-0 z-50 w-52
                     bg-[#0B0814]/95 border border-white/10 rounded-xl shadow-2xl
                     backdrop-blur-sm overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
            <Moon className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span className="text-xs font-semibold text-gray-200">Sleep Timer</span>
            {isActive && (
              <span className="ml-auto text-[10px] text-[#00D9FF] bg-[#00D9FF]/10
                               px-1.5 py-0.5 rounded-full border border-[#00D9FF]/20">
                Active
              </span>
            )}
          </div>

          {/* Preset buttons */}
          <div className="p-2 space-y-1">
            {PRESETS.map(preset => {
              const isSelected = isActive && selectedMinutes === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  onClick={() => startTimer(preset)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors
                              flex items-center justify-between
                              ${isSelected
                                ? 'bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/25'
                                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                >
                  <span>{preset.label}</span>
                  {isSelected && (
                    <span className="font-mono text-[10px] opacity-80">
                      {isEndOfTrack ? '—' : (countdownDisplay ?? '')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cancel row (only when active) */}
          {isActive && (
            <div className="px-2 pb-2">
              <button
                onClick={cancelTimer}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2
                           rounded-lg text-xs text-red-400 hover:text-red-300
                           hover:bg-red-500/10 border border-red-500/20 transition-colors"
              >
                <X className="w-3 h-3" />
                Cancel timer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
