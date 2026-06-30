import React, { useMemo, useState } from 'react';
import {
  BOOK_COVER_THEMES, getTheme, renderFrontCoverSVG, renderBackCoverSVG,
  svgToDataURL, svgToPngDataURL,
} from '@/lib/bookCover';

/**
 * Reusable book-cover generator for author accounts.
 *
 * Live front + back preview, theme picker, and one-click export. On "Use these
 * covers" it rasterizes both sides to PNG data URLs and hands them back via
 * onApply so the upload flow can attach them to the product.
 */
export interface BookCoverGeneratorProps {
  initialTitle?: string;
  initialAuthor?: string;
  initialGenre?: string;
  initialBlurb?: string;
  onApply?: (covers: { frontPng: string; backPng: string; themeId: string }) => void;
  onClose?: () => void;
}

export default function BookCoverGenerator({
  initialTitle = '', initialAuthor = '', initialGenre = '', initialBlurb = '',
  onApply, onClose,
}: BookCoverGeneratorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [genre, setGenre] = useState(initialGenre);
  const [blurb, setBlurb] = useState(initialBlurb);
  const [themeId, setThemeId] = useState<string>(getTheme(undefined, initialGenre).id);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [busy, setBusy] = useState(false);

  const input = { title, author, genre, themeId, blurb };
  const frontSvg = useMemo(() => renderFrontCoverSVG(input), [title, author, genre, themeId]);
  const backSvg = useMemo(() => renderBackCoverSVG(input), [title, author, genre, themeId, blurb]);
  const previewSvg = side === 'front' ? frontSvg : backSvg;

  const apply = async () => {
    setBusy(true);
    try {
      const [frontPng, backPng] = await Promise.all([
        svgToPngDataURL(frontSvg), svgToPngDataURL(backSvg),
      ]);
      onApply?.({ frontPng, backPng, themeId });
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = svgToDataURL(previewSvg);
    a.download = `${(title || 'cover').toLowerCase().replace(/\s+/g, '-')}-${side}.svg`;
    a.click();
  };

  const field = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]';

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-6">
      {/* Preview */}
      <div className="flex flex-col items-center">
        <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1 mb-4">
          {(['front', 'back'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${side === s ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white' : 'text-white/55 hover:text-white'}`}
            >
              {s} cover
            </button>
          ))}
        </div>
        <img
          src={svgToDataURL(previewSvg)}
          alt={`${side} cover preview`}
          className="w-[260px] rounded-xl shadow-2xl shadow-black/50 border border-white/10"
        />
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/55 mb-1">Title</label>
          <input className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title" />
        </div>
        <div>
          <label className="block text-xs text-white/55 mb-1">Author</label>
          <input className={field} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" />
        </div>
        <div>
          <label className="block text-xs text-white/55 mb-1">Genre</label>
          <input className={field} value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Fiction, Thriller" />
        </div>
        <div>
          <label className="block text-xs text-white/55 mb-1">Back-cover synopsis</label>
          <textarea className={`${field} resize-none`} rows={4} value={blurb} onChange={e => setBlurb(e.target.value)} placeholder="A short description for the back cover…" />
        </div>
        <div>
          <label className="block text-xs text-white/55 mb-1.5">Theme</label>
          <div className="flex flex-wrap gap-2">
            {BOOK_COVER_THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                title={t.name}
                className={`w-8 h-8 rounded-lg border transition-all ${themeId === t.id ? 'ring-2 ring-white scale-110 border-white/40' : 'border-white/15 hover:scale-105'}`}
                style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.bottom})` }}
                aria-label={`Theme ${t.name}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={apply}
            disabled={busy}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? 'Rendering…' : 'Use these covers'}
          </button>
          <div className="flex gap-2">
            <button onClick={download} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              Download {side}
            </button>
            {onClose && (
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
