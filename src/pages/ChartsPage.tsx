import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Play, Pause, Music, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/components/GlobalPlayer';
import type { Track } from '@/components/GlobalPlayer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChartTrack {
  id:           string;
  rank:         number;
  prev_rank:    number | null;
  title:        string;
  artist:       string;
  artist_id:    string;
  cover_url:    string;
  audio_url:    string;
  genre:        string;
  language:     string;
  stream_count: number;
  price:        number | null;
}

type ChartFilter = 'all' | 'pop' | 'afrobeats' | 'hiphop' | 'electronic' | 'rnb' | 'reggae' | 'kpop' | 'latin';
type LangFilter  = 'all' | 'en' | 'fr' | 'yo' | 'ig' | 'ha' | 'sw';

const GENRE_TABS: { id: ChartFilter; label: string }[] = [
  { id: 'all',       label: 'All Genres'  },
  { id: 'pop',       label: 'Pop'         },
  { id: 'afrobeats', label: 'Afrobeats'   },
  { id: 'kpop',      label: 'K-Pop'       },
  { id: 'hiphop',    label: 'Hip-Hop'     },
  { id: 'rnb',       label: 'R&B'         },
  { id: 'reggae',    label: 'Reggae'      },
  { id: 'electronic',label: 'Electronic'  },
  { id: 'latin',     label: 'Latin'       },
];

const LANG_TABS: { id: LangFilter; label: string }[] = [
  { id: 'all', label: 'All'       },
  { id: 'en',  label: '🇬🇧 EN'  },
  { id: 'fr',  label: '🇫🇷 FR'  },
  { id: 'yo',  label: '🇳🇬 YO'  },
  { id: 'ig',  label: '🇳🇬 IG'  },
  { id: 'ha',  label: '🇳🇬 HA'  },
  { id: 'sw',  label: '🇰🇪 SW'  },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function RankBadge({ rank, prev }: { rank: number; prev: number | null }) {
  const delta = prev === null ? 0 : prev - rank;
  return (
    <div className="flex flex-col items-center gap-0.5 w-8 shrink-0">
      <span className="text-white font-black text-sm tabular-nums leading-none">{rank}</span>
      {prev === null ? (
        <span className="text-[9px] font-bold text-[#00D9FF] leading-none">NEW</span>
      ) : delta > 0 ? (
        <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 leading-none">
          <ChevronUp className="w-2.5 h-2.5" />{delta}
        </span>
      ) : delta < 0 ? (
        <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-400 leading-none">
          <ChevronDown className="w-2.5 h-2.5" />{Math.abs(delta)}
        </span>
      ) : (
        <Minus className="w-2.5 h-2.5 text-white/25" />
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ChartsPage() {
  const { play, togglePlay, currentTrack, isPlaying } = usePlayer();

  const [tracks,  setTracks]  = useState<ChartTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre,   setGenre]   = useState<ChartFilter>('all');
  const [lang,    setLang]    = useState<LangFilter>('all');

  const fetchCharts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('tracks')
      .select('id, title, artist_name, artist_id, artwork_url, audio_url, genre, language, stream_count, price')
      .eq('status', 'active')
      .order('stream_count', { ascending: false })
      .limit(50);

    if (genre !== 'all') q = q.ilike('genre', `%${genre}%`);
    if (lang  !== 'all') q = q.eq('language', lang);

    const { data } = await q;
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    // Fetch yesterday's positions for rank-change arrows
    const { data: prevHistory } = await supabase
      .from('chart_history')
      .select('track_id, rank')
      .eq('genre', genre)
      .eq('language', lang)
      .eq('chart_date', yesterday);

    const prevMap: Record<string, number> = {};
    (prevHistory ?? []).forEach((h: any) => { prevMap[h.track_id] = h.rank; });

    const rows = (data ?? []).map((r: any, i: number) => ({
      id:           r.id,
      rank:         i + 1,
      prev_rank:    prevMap[r.id] ?? null,
      title:        r.title,
      artist:       r.artist_name || 'Unknown',
      artist_id:    r.artist_id || '',
      cover_url:    r.artwork_url || '',
      audio_url:    r.audio_url || '',
      genre:        r.genre || '',
      language:     r.language || '',
      stream_count: r.stream_count ?? 0,
      price:        r.price ?? null,
    }));
    setTracks(rows);
    setLoading(false);

    // Upsert today's rankings so tomorrow we have yesterday's data
    if (rows.length > 0) {
      const upsertRows = rows.map(r => ({
        track_id:   r.id,
        genre,
        language:   lang,
        rank:       r.rank,
        chart_date: today,
      }));
      supabase.from('chart_history').upsert(upsertRows, { onConflict: 'track_id,genre,language,chart_date' }).then(() => {});
    }
  }, [genre, lang]);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  const handlePlay = (t: ChartTrack) => {
    const track: Track = {
      id:        t.id,
      title:     t.title,
      artist:    t.artist,
      artist_id: t.artist_id || undefined,
      albumArt:  t.cover_url,
      audioUrl:  t.audio_url,
    };
    if (currentTrack?.id === t.id) { togglePlay(); return; }
    const queue: Track[] = tracks
      .filter(x => x.id !== t.id && x.audio_url)
      .map(x => ({ id: x.id, title: x.title, artist: x.artist, artist_id: x.artist_id || undefined, albumArt: x.cover_url, audioUrl: x.audio_url }));
    play(track, queue);
  };

  const playingId = currentTrack?.id;

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">

        {/* Hero */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">WANKONG Charts</h1>
            <p className="text-white/40 text-xs">Updated daily · Top 50</p>
          </div>
        </div>

        {/* Genre filter */}
        <div className="overflow-x-auto mt-6 mb-3 pb-1" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 min-w-max">
            {GENRE_TABS.map(g => (
              <button key={g.id} onClick={() => setGenre(g.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  genre === g.id
                    ? 'bg-[#00D9FF] text-[#0B0814]'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10'
                }`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          {LANG_TABS.map(l => (
            <button key={l.id} onClick={() => setLang(l.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                lang === l.id
                  ? 'bg-[#9D4EDD]/30 text-[#9D4EDD] border border-[#9D4EDD]/50'
                  : 'bg-white/3 text-white/40 hover:text-white border border-white/8'
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Chart list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/3 animate-pulse h-16" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracks found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Header row */}
            <div className="flex items-center gap-4 px-3 pb-1 text-[10px] font-semibold text-white/25 uppercase tracking-wider">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Track</div>
              <div className="hidden sm:block w-20 text-right">Streams</div>
              <div className="w-9" />
            </div>

            {tracks.map(t => {
              const active = playingId === t.id;
              return (
                <div key={t.id}
                  className={`flex items-center gap-4 px-3 py-2.5 rounded-2xl transition-all cursor-pointer group ${
                    active ? 'bg-[#00D9FF]/8 border border-[#00D9FF]/20' : 'hover:bg-white/4 border border-transparent'
                  }`}
                  onClick={() => handlePlay(t)}
                >
                  <RankBadge rank={t.rank} prev={t.prev_rank} />

                  {/* Cover */}
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 relative">
                    {t.cover_url
                      ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
                          <Music className="w-4 h-4 text-white/40" />
                        </div>}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${active || 'opacity-0 group-hover:opacity-100'}`}>
                      {active && isPlaying
                        ? <Pause className="w-4 h-4 text-white fill-white" />
                        : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${active ? 'text-[#00D9FF]' : 'text-white'}`}>{t.title}</p>
                    <p className="text-white/40 text-xs truncate">{t.artist}</p>
                  </div>

                  {/* Genre pill */}
                  {t.genre && (
                    <span className="hidden md:block text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/35 capitalize shrink-0">
                      {t.genre}
                    </span>
                  )}

                  {/* Streams */}
                  <div className="hidden sm:block text-right w-20 shrink-0">
                    <p className="text-sm font-semibold text-white/70 tabular-nums">{fmtNum(t.stream_count)}</p>
                    <p className="text-[10px] text-white/25">streams</p>
                  </div>

                  {/* Playing indicator */}
                  {active && isPlaying && (
                    <div className="flex gap-0.5 items-end h-4 shrink-0 w-9 justify-end">
                      {[3, 5, 4, 6, 3].map((h, i) => (
                        <div key={i} className="w-0.5 bg-[#00D9FF] rounded-full animate-pulse"
                          style={{ height: h * 2.5 + 'px', animationDelay: i * 90 + 'ms' }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
