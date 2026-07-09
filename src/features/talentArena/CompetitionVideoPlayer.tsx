import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Subtitles } from 'lucide-react';

interface Subtitle {
  language: string;
  vtt_url: string;
}

interface CompetitionVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  subtitles?: Subtitle[];
  autoPlay?: boolean;
  className?: string;
}

export function CompetitionVideoPlayer({
  videoUrl,
  thumbnailUrl,
  subtitles = [],
  autoPlay = false,
  className = '',
}: CompetitionVideoPlayerProps) {
  const videoRef        = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]       = useState(false);
  const [muted, setMuted]           = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [showSubMenu, setShowSubMenu]   = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const handler = () => setPlaying(!v.paused);
    v.addEventListener('play', handler);
    v.addEventListener('pause', handler);
    return () => { v.removeEventListener('play', handler); v.removeEventListener('pause', handler); };
  }, []);

  const toggle = () => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause();

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const selectSubtitle = (lang: string) => {
    if (!videoRef.current) return;
    const tracks = Array.from(videoRef.current.textTracks);
    tracks.forEach(t => { t.mode = t.language === lang ? 'showing' : 'hidden'; });
    setSelectedLang(lang);
    setShowSubMenu(false);
  };

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden group ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        autoPlay={autoPlay}
        className="w-full h-full object-cover"
        crossOrigin="anonymous"
      >
        {subtitles.map(s => (
          <track key={s.language} kind="subtitles" src={s.vtt_url} srcLang={s.language} label={s.language.toUpperCase()} />
        ))}
      </video>

      {/* Controls overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 gap-2">
        <button onClick={toggle} className="text-white hover:text-[#00D9FF] transition-colors">
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button onClick={toggleMute} className="text-white hover:text-[#00D9FF] transition-colors">
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {subtitles.length > 0 && (
          <div className="relative ml-auto">
            <button onClick={() => setShowSubMenu(!showSubMenu)} className="text-white hover:text-[#00D9FF] transition-colors flex items-center gap-1 text-xs">
              <Subtitles size={18} />
              {selectedLang ? selectedLang.toUpperCase() : 'CC'}
            </button>
            {showSubMenu && (
              <div className="absolute bottom-8 right-0 bg-[#0B0814] border border-white/10 rounded-lg p-2 min-w-[100px] z-10">
                <button onClick={() => selectSubtitle('')} className="block w-full text-left text-xs text-gray-400 hover:text-white px-2 py-1">Off</button>
                {subtitles.map(s => (
                  <button key={s.language} onClick={() => selectSubtitle(s.language)}
                    className={`block w-full text-left text-xs px-2 py-1 rounded hover:bg-white/10 ${selectedLang === s.language ? 'text-[#00D9FF]' : 'text-gray-300'}`}>
                    {s.language.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
