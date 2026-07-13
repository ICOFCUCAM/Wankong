import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';

// SmartKong theming — Light is the default (trust-first shopping); Dark and
// Aurora are premium options. Persisted in localStorage, synced across
// components via a custom event (same pattern as useCompare).

export type MarketTheme = 'light' | 'dark' | 'aurora';

const KEY = 'smartkong_theme';
const EVENT = 'sk-theme-change';

function read(): MarketTheme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'aurora' ? v : 'light';
  } catch { return 'light'; }
}

export function useMarketTheme() {
  const [theme, setThemeState] = useState<MarketTheme>(read);

  useEffect(() => {
    const sync = () => setThemeState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);

  const setTheme = useCallback((t: MarketTheme) => {
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { theme, setTheme };
}

// Per-theme Tailwind class tokens for the landing's content sections.
// (The hero, AI showcase and footer are intentionally dark in every theme —
// they are the "dark bands" that punctuate the light shopping rhythm.)
export interface ThemeTokens {
  page: string;
  sectionA: string;   // primary content section
  sectionB: string;   // alternate content section
  heading: string;
  body: string;
  card: string;
  cardTitle: string;
  cardMeta: string;
  tile: string;       // category tile
  chip: string;       // vendor / misc chip
  aurora: boolean;
}

export function themeTokens(theme: MarketTheme): ThemeTokens {
  switch (theme) {
    case 'dark':
      return {
        page: 'bg-[#0A0A0C]',
        sectionA: 'bg-[#0A0A0C]', sectionB: 'bg-[#101114]',
        heading: 'text-white', body: 'text-white/55',
        card: 'bg-[#14161C] border border-[#22252D] hover:border-blue-500/50 hover:shadow-[0_24px_70px_-20px_rgba(37,99,235,0.35)]',
        cardTitle: 'text-white', cardMeta: 'text-white/40',
        tile: 'bg-[#14161C] border border-[#22252D] hover:border-white/25',
        chip: 'bg-white/[0.04] border border-white/10 text-white/60',
        aurora: false,
      };
    case 'aurora':
      return {
        page: 'bg-[#05060A]',
        sectionA: 'bg-[#05060A]', sectionB: 'bg-white/[0.02]',
        heading: 'text-white', body: 'text-white/55',
        card: 'bg-white/[0.03] border border-white/10 hover:border-blue-400/50 hover:shadow-[0_24px_70px_-18px_rgba(37,99,235,0.5)]',
        cardTitle: 'text-white', cardMeta: 'text-white/40',
        tile: 'bg-white/[0.03] border border-white/10 hover:border-white/25',
        chip: 'bg-white/[0.04] border border-white/10 text-white/60',
        aurora: true,
      };
    default: // light
      return {
        page: 'bg-white',
        sectionA: 'bg-white', sectionB: 'bg-gray-50',
        heading: 'text-gray-900', body: 'text-gray-500',
        card: 'bg-white border border-gray-200 shadow-sm hover:shadow-xl',
        cardTitle: 'text-gray-900', cardMeta: 'text-gray-400',
        tile: 'bg-white border border-gray-200 shadow-sm hover:shadow-lg',
        chip: 'bg-white border border-gray-200 text-gray-600',
        aurora: false,
      };
  }
}

const OPTIONS: { value: MarketTheme; label: string; Icon: typeof Sun }[] = [
  { value: 'light',  label: 'Light',  Icon: Sun },
  { value: 'dark',   label: 'Dark',   Icon: Moon },
  { value: 'aurora', label: 'Aurora', Icon: Sparkles },
];

// Segmented 3-way theme switcher for the header.
export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useMarketTheme();
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-full" role="group" aria-label="Theme">
      {OPTIONS.map(o => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            title={`${o.label} theme`}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full transition-colors ${compact ? 'p-1.5' : 'px-2.5 py-1.5'} ${
              active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <o.Icon className="w-3.5 h-3.5" />
            {!compact && <span className="text-xs font-semibold hidden md:inline">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
