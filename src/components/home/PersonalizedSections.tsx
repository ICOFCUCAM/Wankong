import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Sparkles, Users, TrendingUp, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/components/GlobalPlayer';
import type { Track } from '@/components/GlobalPlayer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Product {
  id:           string;
  title:        string;
  artist_name?: string;
  cover_url:    string;
  audio_url?:   string;
  genre?:       string;
  language?:    string;
  price:        number;
  product_type: string;
  creator_id?:  string;
}

interface UserPrefs {
  genres:        string[];
  languages:     string[];
  content_types: string[];
}

// ── Mini product card ──────────────────────────────────────────────────────────

function MiniCard({ p, onPlay, isActive, isPlaying }: {
  p: Product;
  onPlay: (p: Product) => void;
  isActive: boolean;
  isPlaying: boolean;
}) {
  return (
    <div className="shrink-0 w-36 group">
      <div className="relative w-36 h-36 rounded-2xl overflow-hidden mb-2">
        {p.cover_url
          ? <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
              <Music className="w-8 h-8 text-white/30" />
            </div>}
        <button
          onClick={() => onPlay(p)}
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isActive ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/40'
          }`}
        >
          {isActive && isPlaying
            ? <Pause className="w-8 h-8 text-white fill-white" />
            : <Play  className="w-8 h-8 text-white fill-white ml-1" />}
        </button>
        {isActive && isPlaying && (
          <div className="absolute bottom-2 left-2 flex gap-0.5 items-end h-3">
            {[3,5,4,6,3].map((h,i) => (
              <div key={i} className="w-0.5 bg-[#00D9FF] rounded-full animate-pulse"
                style={{ height: h * 2 + 'px', animationDelay: i * 90 + 'ms' }} />
            ))}
          </div>
        )}
      </div>
      <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#00D9FF]' : 'text-white'}`}>{p.title}</p>
      <p className="text-[10px] text-white/40 truncate">{p.artist_name}</p>
    </div>
  );
}

// ── Horizontal scroll shelf ────────────────────────────────────────────────────

function Shelf({ title, icon, items, onPlay, playingId, isPlaying, linkTo }: {
  title:    string;
  icon:     React.ReactNode;
  items:    Product[];
  onPlay:   (p: Product) => void;
  playingId: string | null;
  isPlaying: boolean;
  linkTo?:  string;
}) {
  if (!items.length) return null;
  return (
    <section className="py-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-black text-lg flex items-center gap-2">
            <span className="text-[#00D9FF]">{icon}</span>
            {title}
          </h2>
          {linkTo && (
            <Link to={linkTo} className="text-xs text-[#00D9FF] hover:underline">
              See all →
            </Link>
          )}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {items.map(p => (
            <MiniCard
              key={p.id}
              p={p}
              onPlay={onPlay}
              isActive={playingId === p.id}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PersonalizedSections() {
  const { user }   = useAuth();
  const { play, togglePlay, currentTrack, isPlaying } = usePlayer();

  const [prefs,       setPrefs]       = useState<UserPrefs | null>(null);
  const [forYou,      setForYou]      = useState<Product[]>([]);
  const [fromFollows, setFromFollows] = useState<Product[]>([]);
  const [trendGenre,  setTrendGenre]  = useState<Product[]>([]);
  const [trendLabel,  setTrendLabel]  = useState('');

  const toTrack = (p: Product): Track => ({
    id:       p.id,
    title:    p.title,
    artist:   p.artist_name || 'Unknown',
    albumArt: p.cover_url,
    audioUrl: p.audio_url,
  });

  const handlePlay = useCallback((p: Product) => {
    if (!p.audio_url) return;
    if (currentTrack?.id === p.id) { togglePlay(); return; }
    play(toTrack(p));
  }, [currentTrack, play, togglePlay]);

  const playingId = currentTrack?.id ?? null;

  const load = useCallback(async () => {
    // 1. Fetch user preferences (works even for logged-out users with anonymous session)
    let userPrefs: UserPrefs | null = null;
    if (user) {
      const { data } = await supabase
        .from('user_preferences')
        .select('genres, languages, content_types')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) userPrefs = data as UserPrefs;
    }
    setPrefs(userPrefs);

    const defaultGenres = ['pop', 'afrobeats', 'hip-hop'];
    const genres = userPrefs?.genres?.length ? userPrefs.genres : defaultGenres;
    const langs  = userPrefs?.languages?.length ? userPrefs.languages : ['en'];

    // 2. "Based on your taste" — products matching preferred genres/languages
    const { data: forYouData } = await supabase
      .from('ecom_products')
      .select('id, title, vendor, cover_image_url, audio_url, genre, language, price, product_type, creator_id')
      .eq('status', 'active')
      .in('genre', genres)
      .order('created_at', { ascending: false })
      .limit(12);

    const mapProduct = (r: any): Product => ({
      id:           r.id,
      title:        r.title,
      artist_name:  r.vendor || r.artist_name,
      cover_url:    r.cover_image_url || r.cover_url || '',
      audio_url:    r.audio_url,
      genre:        r.genre,
      language:     r.language,
      price:        r.price ?? 0,
      product_type: r.product_type,
      creator_id:   r.creator_id,
    });

    if (forYouData?.length) setForYou(forYouData.map(mapProduct));

    // 3. "New from who you follow"
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      const ids = (follows || []).map((f: any) => f.following_id);
      if (ids.length) {
        const { data: followData } = await supabase
          .from('ecom_products')
          .select('id, title, vendor, cover_image_url, audio_url, genre, language, price, product_type, creator_id')
          .eq('status', 'active')
          .in('creator_id', ids)
          .order('created_at', { ascending: false })
          .limit(10);
        if (followData?.length) setFromFollows(followData.map(mapProduct));
      }
    }

    // 4. "Trending in [top genre]"
    const topGenre = genres[0] ?? 'pop';
    const { data: trendData } = await supabase
      .from('ecom_products')
      .select('id, title, vendor, cover_image_url, audio_url, genre, language, price, product_type, creator_id, stream_count')
      .eq('status', 'active')
      .ilike('genre', `%${topGenre}%`)
      .order('stream_count', { ascending: false })
      .limit(10);
    if (trendData?.length) {
      setTrendGenre(trendData.map(mapProduct));
      setTrendLabel(topGenre.charAt(0).toUpperCase() + topGenre.slice(1));
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Don't render anything until we have at least one section
  if (!forYou.length && !fromFollows.length && !trendGenre.length) return null;

  return (
    <>
      {forYou.length > 0 && (
        <Shelf
          title="Based on your taste"
          icon={<Sparkles className="w-4 h-4" />}
          items={forYou}
          onPlay={handlePlay}
          playingId={playingId}
          isPlaying={isPlaying}
          linkTo="/search"
        />
      )}

      {fromFollows.length > 0 && (
        <Shelf
          title="New from who you follow"
          icon={<Users className="w-4 h-4" />}
          items={fromFollows}
          onPlay={handlePlay}
          playingId={playingId}
          isPlaying={isPlaying}
        />
      )}

      {trendGenre.length > 0 && (
        <Shelf
          title={`Trending in ${trendLabel}`}
          icon={<TrendingUp className="w-4 h-4" />}
          items={trendGenre}
          onPlay={handlePlay}
          playingId={playingId}
          isPlaying={isPlaying}
          linkTo="/charts"
        />
      )}
    </>
  );
}
