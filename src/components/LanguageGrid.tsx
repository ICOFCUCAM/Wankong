import React, { useState } from 'react';

interface LanguageItem {
  code: string;
  name: string;
  flag: string;
  trackCount: number;
}

interface LanguageGridProps {
  languages: LanguageItem[];
  onSelect?: (code: string) => void;
}

const LanguageGrid: React.FC<LanguageGridProps> = ({ languages, onSelect }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (code: string) => {
    setSelected(prev => (prev === code ? null : code));
    onSelect?.(code);
  };

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {languages.map(lang => {
        const isSelected = selected === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={[
              'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 cursor-pointer',
              'bg-[#120C22] text-white',
              isSelected
                ? 'border-[#00D9FF] bg-[#0d1a36] shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                : 'border-[#2d3a5a] hover:border-[#00D9FF] hover:scale-105',
            ].join(' ')}
            aria-pressed={isSelected}
          >
            {/* Flag */}
            <span className="text-2xl leading-none" role="img" aria-label={lang.name}>
              {lang.flag}
            </span>

            {/* Language name */}
            <span className="text-xs font-medium text-center leading-tight line-clamp-2">
              {lang.name}
            </span>

            {/* Track count badge */}
            <span
              className={[
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                isSelected
                  ? 'bg-[#00D9FF] text-[#0B0814]'
                  : 'bg-[#2d3a5a] text-gray-300',
              ].join(' ')}
            >
              {lang.trackCount.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageGrid;
