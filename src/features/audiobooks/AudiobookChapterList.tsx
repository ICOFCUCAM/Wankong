import React, { useEffect, useState } from 'react';
import { Music2, Clock, ChevronRight } from 'lucide-react';
import { getChapters, AudiobookChapter } from './AudiobookService';

interface AudiobookChapterListProps {
  audiobookId: string;
  onChapterSelect: (chapter: AudiobookChapter) => void;
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudiobookChapterList({
  audiobookId,
  onChapterSelect,
}: AudiobookChapterListProps) {
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getChapters(audiobookId)
      .then((data) => {
        setChapters(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load chapters.');
      })
      .finally(() => setLoading(false));
  }, [audiobookId]);

  const handleSelect = (chapter: AudiobookChapter) => {
    setSelectedId(chapter.id);
    onChapterSelect(chapter);
  };

  const totalDuration = chapters.reduce((sum, ch) => sum + ch.duration_s, 0);

  if (loading) {
    return (
      <div className="bg-[#0B0814] rounded-2xl border border-white/10 p-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-white/5 rounded-xl animate-pulse"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0B0814] rounded-2xl border border-red-500/20 p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="bg-[#0B0814] rounded-2xl border border-white/10 p-8 text-center">
        <Music2 size={36} className="mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400 text-sm font-medium">No chapters yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Chapters will appear here once uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0814] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h3 className="text-sm font-bold text-white">
            {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Clock size={11} />
            Total {formatDuration(totalDuration)}
          </p>
        </div>
        <span className="text-xs text-[#00D9FF] bg-[#00D9FF]/10 px-2.5 py-1 rounded-full font-medium">
          Audiobook
        </span>
      </div>

      {/* Chapter rows */}
      <ul className="divide-y divide-white/5">
        {chapters.map((chapter, idx) => {
          const isSelected = chapter.id === selectedId;
          return (
            <li key={chapter.id}>
              <button
                onClick={() => handleSelect(chapter)}
                className={`w-full text-left px-5 py-3.5 flex items-center gap-4 transition-all group ${
                  isSelected
                    ? 'bg-[#00D9FF]/10'
                    : 'hover:bg-white/4'
                }`}
              >
                {/* Chapter number badge */}
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#00D9FF] text-[#0B0814]'
                      : 'bg-white/8 text-gray-400 group-hover:bg-white/12'
                  }`}
                >
                  {chapter.chapter_num}
                </span>

                {/* Title and duration */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate transition-colors ${
                      isSelected ? 'text-[#00D9FF]' : 'text-white group-hover:text-[#00D9FF]/80'
                    }`}
                  >
                    {chapter.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDuration(chapter.duration_s)}
                  </p>
                </div>

                {/* Playing indicator or chevron */}
                {isSelected ? (
                  <span className="flex gap-0.5 items-end h-4 shrink-0">
                    {[3, 5, 4, 5, 3].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 bg-[#00D9FF] rounded-full"
                        style={{
                          height: `${h * 2}px`,
                          animation: `pulse 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  <ChevronRight
                    size={16}
                    className="text-gray-600 group-hover:text-[#00D9FF]/60 shrink-0 transition-colors"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer totals */}
      <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-gray-600">
          Chapter {selectedId ? chapters.findIndex((c) => c.id === selectedId) + 1 : '—'} selected
        </span>
        <span className="text-xs text-gray-500">
          {formatDuration(totalDuration)} total runtime
        </span>
      </div>
    </div>
  );
}

export default AudiobookChapterList;
