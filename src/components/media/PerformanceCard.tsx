import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, X, Trophy } from 'lucide-react';
import DefaultPerformanceThumbnail from './DefaultPerformanceThumbnail';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PerformanceCardData {
  id:           string;
  title:        string;
  creatorName:  string | null;
  thumbnailUrl: string | null;
  weekBadge?:   string;
  votes?:       number;
  embedUrl?:    string;
  to?:          string;
  gradient?:    string;
  badge?:       string;  // e.g. '🏆 WINNER'
  badgeBg?:     string;  // CSS background string
}

// ── Inline modal player ────────────────────────────────────────────────────────

function PlayerModal({ card, onClose }: { card: PerformanceCardData; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const src = card.embedUrl
    ? `${card.embedUrl}${card.embedUrl.includes('?') ? '&' : '?'}autoplay=1`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#0D1635] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{card.title}</p>
            {card.creatorName && (
              <p className="text-white/40 text-xs truncate">{card.creatorName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/40 hover:text-white transition-colors ml-4 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embed */}
        <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
          {src ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={src}
              title={card.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0D1635]">
              <Play className="w-16 h-16 text-white/15" />
              <p className="text-white/40 text-sm">Video preview not available</p>
              {card.to && (
                <Link
                  to={card.to}
                  onClick={onClose}
                  className="text-[#00D9FF] text-sm hover:underline"
                >
                  Watch Full Performance →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

interface Props extends PerformanceCardData {
  /** If provided, the parent manages the modal; if omitted the card handles it internally. */
  onPlay?: (data: PerformanceCardData) => void;
  /** Compact mode trims the meta row to fit narrower containers */
  compact?: boolean;
}

export default function PerformanceCard({ onPlay, compact, ...card }: Props) {
  const [localModal, setLocalModal] = useState(false);

  const handleClick = () => {
    if (onPlay) { onPlay(card); return; }
    setLocalModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="group relative w-full text-left focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]/40 rounded-xl"
        aria-label={`Play ${card.title}`}
      >
        {/* 16:9 thumbnail */}
        <div
          className="relative w-full aspect-video rounded-xl overflow-hidden
                     border border-white/10 shadow-lg shadow-black/40
                     group-hover:scale-[1.02] transition-transform duration-300"
        >
          {card.thumbnailUrl ? (
            <>
              <img
                src={card.thumbnailUrl}
                alt={card.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </>
          ) : (
            <DefaultPerformanceThumbnail gradient={card.gradient} label={card.title} />
          )}

          {/* Hover play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30
                         flex items-center justify-center shadow-xl"
            >
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>

          {/* Top-left platform / status badge */}
          {card.badge && (
            <div
              className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm"
              style={{ background: card.badgeBg ?? 'rgba(157,78,221,0.85)', color: '#fff' }}
            >
              {card.badge}
            </div>
          )}

          {/* Top-right week badge */}
          {card.weekBadge && (
            <div className="absolute top-2 right-2 bg-[#FFB800] text-[#0B0814] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
              {card.weekBadge}
            </div>
          )}

          {/* Bottom-right vote count */}
          {card.votes !== undefined && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Trophy className="w-2.5 h-2.5 text-[#FFB800]" />
              {card.votes.toLocaleString()}
            </div>
          )}
        </div>

        {/* Meta */}
        {!compact && (
          <div className="mt-2 px-0.5">
            <p className="text-white text-xs font-semibold leading-tight line-clamp-2 group-hover:text-[#9D4EDD] transition-colors">
              {card.title}
            </p>
            {card.creatorName && (
              <p className="text-white/40 text-[11px] mt-0.5 truncate">{card.creatorName}</p>
            )}
          </div>
        )}
      </button>

      {localModal && (
        <PlayerModal card={card} onClose={() => setLocalModal(false)} />
      )}
    </>
  );
}
