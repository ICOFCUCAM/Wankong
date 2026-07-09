import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Subtitles } from 'lucide-react';

interface Subtitle {
  id: string;
  language_code: string;
  language_name: string;
  flag: string;
  vtt_url: string;
}

interface SubtitleSelectorProps {
  entryId: string;
  onSelect: (vttUrl: string | null) => void;
}

const SubtitleSelector: React.FC<SubtitleSelectorProps> = ({ entryId, onSelect }) => {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null); // language_code or 'off'

  useEffect(() => {
    let cancelled = false;

    const fetchSubtitles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('competition_subtitles')
        .select('id, language_code, language_name, flag, vtt_url')
        .eq('entry_id', entryId)
        .eq('status', 'done');

      if (!cancelled) {
        if (!error && data) {
          setSubtitles(data as Subtitle[]);
        }
        setLoading(false);
      }
    };

    fetchSubtitles();
    return () => { cancelled = true; };
  }, [entryId]);

  const handleSelect = (langCode: string | null) => {
    const key = langCode ?? 'off';
    setSelected(key);

    if (langCode === null) {
      onSelect(null);
    } else {
      const subtitle = subtitles.find(s => s.language_code === langCode);
      onSelect(subtitle?.vtt_url ?? null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading subtitles...
      </div>
    );
  }

  if (subtitles.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-xs">
        <Subtitles className="w-4 h-4" />
        No subtitles available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
        <Subtitles className="w-3.5 h-3.5" />
        Subtitles:
      </span>

      {/* Off option */}
      <button
        onClick={() => handleSelect(null)}
        className={[
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150',
          selected === 'off' || selected === null
            ? 'bg-[#00D9FF] text-[#0B0814]'
            : 'bg-[#120C22] border border-[#2d3a5a] text-gray-300 hover:border-[#00D9FF]',
        ].join(' ')}
      >
        Off
      </button>

      {/* Language pills */}
      {subtitles.map(sub => (
        <button
          key={sub.id}
          onClick={() => handleSelect(sub.language_code)}
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150',
            selected === sub.language_code
              ? 'bg-[#00D9FF] text-[#0B0814]'
              : 'bg-[#120C22] border border-[#2d3a5a] text-gray-300 hover:border-[#00D9FF]',
          ].join(' ')}
          title={sub.language_name}
        >
          <span role="img" aria-label={sub.language_name}>{sub.flag || '🌐'}</span>
          <span>{sub.language_code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
};

export default SubtitleSelector;
