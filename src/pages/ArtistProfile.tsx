import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { usePlayer } from '@/components/GlobalPlayer';

interface ArtistData {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  avatar: string;
  coverImage: string;
  country: string;
  language: string;
  genre: string;
  followers: number;
  totalTracks: number;
  totalPlays: number;
  verified: boolean;
}

const GENRE_COLORS: Record<string, string> = {
  Afrobeats: 'from-orange-900/40 to-yellow-900/20',
  Gospel: 'from-purple-900/40 to-[#1E1235]/20',
  Hiphop: 'from-gray-900/80 to-gray-800/40',
  Jazz: 'from-blue-900/40 to-cyan-900/20',
  Classical: 'from-amber-900/30 to-yellow-900/20',
  RnB: 'from-pink-900/40 to-purple-900/20',
  Reggae: 'from-green-900/40 to-emerald-900/20',
  Dancehall: 'from-orange-900/50 to-red-900/20',
};

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const { playTrack } = usePlayer();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'music' | 'about'>('music');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('ecom_products')
        .select('*')
        .eq('status', 'active')
        .or(`vendor.ilike.%${id}%,artist.ilike.%${id}%`)
        .not('product_type', 'eq', 'Book')
        .limit(24),
    ]).then(([profileRes, tracksRes]) => {
      const trackList = (tracksRes.data || []).map(p => ({
        ...p,
        image: p.images?.[0] || p.cover_art,
        price: p.variants?.[0]?.price ?? p.price,
      }));

      if (profileRes.data) {
        const p = profileRes.data;
        setArtist({
          id: p.id,
          displayName: p.display_name || p.full_name || 'Unknown Artist',
          username: p.username || p.id,
          bio: p.bio || '',
          avatar: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.display_name || 'A'}`,
          coverImage: p.cover_image || '',
          country: p.country || '',
          language: p.language || 'en',
          genre: p.genre || trackList[0]?.genre || '',
          followers: p.followers_count || 0,
          totalTracks: trackList.length,
          totalPlays: p.total_plays || 0,
          verified: p.verified || false,
        });
      } else {
        // Fallback for artist name as id
        supabase
          .from('ecom_products')
          .select('*')
          .eq('status', 'active')
          .or(`vendor.ilike.%${id}%,artist.ilike.%${id}%`)
          .limit(24)
          .then(({ data }) => {
            const list = (data || []).map(p => ({
              ...p,
              image: p.images?.[0] || p.cover_art,
              price: p.variants?.[0]?.price ?? p.price,
            }));
            const first = list[0];
            setArtist({
              id: id!,
              displayName: first?.artist || first?.vendor || decodeURIComponent(id!),
              username: id!,
              bio: '',
              avatar: first?.cover_art || `https://api.dicebear.com/7.x/initials/svg?seed=${id}`,
              coverImage: '',
              country: '',
              language: first?.language || 'en',
              genre: first?.genre || '',
              followers: 0,
              totalTracks: list.length,
              totalPlays: 0,
              verified: false,
            });
            setTracks(list);
            setLoading(false);
          });
        return;
      }
      setTracks(trackList);
      setLoading(false);
    });
  }, [id]);

  const handlePlayAll = () => {
    const playable = tracks.filter(t => t.audio_url);
    if (playable.length > 0) {
      playTrack(
        {
          id: playable[0].id,
          title: playable[0].title,
          artist: playable[0].artist || playable[0].vendor,
          audioUrl: playable[0].audio_url,
          coverArt: playable[0].image,
        },
        playable.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist || t.vendor,
          audioUrl: t.audio_url,
          coverArt: t.image,
        }))
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse space-y-6">
          <div className="h-48 bg-gray-900 rounded-2xl" />
          <div className="flex items-center gap-5">
            <div className="w-28 h-28 rounded-full bg-gray-800" />
            <div className="space-y-3">
              <div className="h-6 w-48 bg-gray-800 rounded" />
              <div className="h-4 w-32 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-900 rounded-xl" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Artist not found</h2>
          <Link to="/" className="text-[#B794F4] hover:text-[#C9B3F5]">Back to homepage</Link>
        </div>
      </div>
    );
  }

  const bannerGradient = GENRE_COLORS[artist.genre] || 'from-[#1E1235]/40 to-purple-900/20';

  const LANG_NAMES: Record<string, string> = {
    en: 'English', fr: 'French', sw: 'Swahili', yo: 'Yoruba',
    ig: 'Igbo', ha: 'Hausa', zu: 'Zulu', ar: 'Arabic', pt: 'Portuguese',
  };

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Cover Banner */}
      <div className={`h-52 sm:h-72 bg-gradient-to-br ${bannerGradient} relative overflow-hidden`}>
        {artist.coverImage && (
          <img src={artist.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0814] via-transparent to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8">
        {/* Profile Row */}
        <div className="relative -mt-20 mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <div className="relative">
            <img
              src={artist.avatar}
              alt={artist.displayName}
              className="w-36 h-36 rounded-full border-4 border-[#0B0814] object-cover bg-gray-800 shadow-2xl"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${artist.displayName}`; }}
            />
            {artist.verified && (
              <span className="absolute bottom-1 right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#0B0814]">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </span>
            )}
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{artist.displayName}</h1>
                  {artist.verified && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">Verified</span>}
                </div>
                <p className="text-gray-400 text-sm">@{artist.username}</p>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                {tracks.some(t => t.audio_url) && (
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center gap-2 px-5 py-2 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white rounded-full font-medium text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    Play All
                  </button>
                )}
                <button
                  onClick={() => setFollowing(!following)}
                  className={`px-5 py-2 rounded-full font-medium text-sm transition-colors ${following ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'}`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div>
                <span className="font-bold text-white">{artist.totalTracks}</span>
                <span className="text-gray-400 ml-1 text-xs">Tracks</span>
              </div>
              <div>
                <span className="font-bold text-white">{artist.followers >= 1000 ? `${(artist.followers / 1000).toFixed(1)}K` : artist.followers}</span>
                <span className="text-gray-400 ml-1 text-xs">Followers</span>
              </div>
              <div>
                <span className="font-bold text-white">{artist.totalPlays >= 1000 ? `${(artist.totalPlays / 1000).toFixed(1)}K` : artist.totalPlays}</span>
                <span className="text-gray-400 ml-1 text-xs">Plays</span>
              </div>
              {artist.genre && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#9D4EDD]/10 text-[#B794F4] border border-[#9D4EDD]/20">{artist.genre}</span>
              )}
              {artist.country && (
                <div className="flex items-center gap-1 text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-xs">{artist.country}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 mb-8">
          {(['music', 'about'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-[#9D4EDD] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              {tab === 'music' ? `Music (${tracks.length})` : 'About'}
            </button>
          ))}
        </div>

        {/* Music Tab */}
        {activeTab === 'music' && (
          tracks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 pb-32">
              {tracks.map(track => (
                <div key={track.id} className="group relative">
                  <ProductCard product={track} />
                  {track.audio_url && (
                    <button
                      onClick={() => playTrack(
                        { id: track.id, title: track.title, artist: track.artist || track.vendor, audioUrl: track.audio_url, coverArt: track.image },
                        tracks.filter(t => t.audio_url).map(t => ({ id: t.id, title: t.title, artist: t.artist || t.vendor, audioUrl: t.audio_url, coverArt: t.image }))
                      )}
                      className="absolute top-2 right-2 w-9 h-9 bg-[#9D4EDD]/90 hover:bg-[#9D4EDD] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 pb-32">
              <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
              <p className="text-gray-400">No music uploaded yet</p>
            </div>
          )
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="max-w-2xl pb-16">
            {artist.bio ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Biography</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">{artist.bio}</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No bio available</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
              {artist.genre && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Primary Genre</p>
                  <p className="text-white font-medium">{artist.genre}</p>
                </div>
              )}
              {artist.language && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Language</p>
                  <p className="text-white font-medium">{LANG_NAMES[artist.language] || artist.language}</p>
                </div>
              )}
              {artist.country && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Country</p>
                  <p className="text-white font-medium">{artist.country}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
