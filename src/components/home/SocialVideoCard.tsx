import React from 'react';
import { Play } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VideoCard {
  id:        string;
  videoId:   string;
  title:     string;
  thumbnail: string;
  platform:  'youtube' | 'tiktok' | 'instagram' | 'wankong';
  embedUrl?: string;
}

// ── Platform badge config ──────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<VideoCard['platform'], { label: string; bg: string; color: string }> = {
  youtube:   { label: '▶ YouTube',   bg: 'rgba(255,0,0,0.85)',       color: '#fff'     },
  tiktok:    { label: '♪ TikTok',    bg: 'rgba(1,1,1,0.85)',         color: '#69C9D0'  },
  instagram: { label: '◈ Instagram', bg: 'rgba(131,58,180,0.85)',    color: '#fff'     },
  wankong:   { label: '★ WANKONG',   bg: 'rgba(0,217,255,0.18)',     color: '#00D9FF'  },
};

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  card:    VideoCard;
  onClick: (card: VideoCard) => void;
}

export default function SocialVideoCard({ card, onClick }: Props) {
  const cfg = PLATFORM_CONFIG[card.platform];
  const hasThumbnail = card.thumbnail && !card.thumbnail.startsWith('gradient:');
  const gradient     = card.thumbnail.startsWith('gradient:') ? card.thumbnail.slice(9) : null;

  return (
    <button
      onClick={() => onClick(card)}
      className="group relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/40 bg-[#0D1635] text-left focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40 transition-transform hover:scale-[1.02]"
      aria-label={`Play ${card.title}`}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video overflow-hidden">
        {hasThumbnail ? (
          <img
            src={card.thumbnail}
            alt={card.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient ?? 'from-[#9D4EDD] to-[#00D9FF]'} flex items-center justify-center`}
          >
            <span className="text-5xl opacity-60">🎤</span>
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0814]/80 via-transparent to-transparent" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Platform badge — top-left */}
        <div
          className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg text-[11px] font-bold backdrop-blur-sm"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </div>
      </div>

      {/* Title */}
      <div className="px-3 py-2.5">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{card.title}</p>
      </div>
    </button>
  );
}
