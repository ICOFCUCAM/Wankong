import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Marketplace from '@/components/home/Marketplace';
import { formatCurrency, formatNumber } from '@/lib/constants';
import { usePlayer } from '@/components/GlobalPlayer';

const MUSIC_LANGUAGES = ['All', 'Afrobeats', 'Bongo Flava', 'Highlife', 'Amapiano', 'Benga', 'Mbalax', 'Afro House', 'Hip-Hop', 'Gospel', 'Dancehall'];
const MUSIC_GENRES = ['All Genres', 'Afrobeats', 'Hip-Hop', 'Electronic', 'Soul', 'Jazz', 'Gospel', 'Reggae', 'Amapiano'];

export default function CollectionPage() {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams] = useSearchParams();
  const languageFilter = searchParams.get('language') || 'All';

  const [collection, setCollection] = useState<{ id: string; title: string; description?: string } | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [rooms,    setRooms]    = useState<any[]>([]);
  const [artists,  setArtists]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState(languageFilter);
  const [selectedGenre, setSelectedGenre] = useState('All Genres');

  const { playTrack } = usePlayer();

  const isMusic = handle === 'music';
  const isTalentArena = handle === 'talent-arena' || handle === 'competitions';
  const isArtists = handle === 'artists';
  const isLanguages = handle === 'languages';
  const isMarketplace = handle === 'marketplace';

  useEffect(() => {
    async function fetchCollection() {
      setLoading(true);
      try {
        // Fetch collection metadata
        const { data: colData } = await supabase
          .from('ecom_collections')
          .select('*')
          .eq('handle', handle)
          .single();
        if (colData) setCollection(colData);

        // Fetch products based on handle
        let query = supabase.from('ecom_products').select('*').eq('status', 'active');

        if (handle === 'music') query = query.ilike('product_type', '%music%');
        else if (handle === 'videos') query = query.ilike('product_type', '%video%');
        else if (handle === 'books') query = query.ilike('product_type', '%book%');
        else if (handle === 'podcasts') query = query.ilike('product_type', '%podcast%');
        else if (handle === 'trending') query = query.order('view_count', { ascending: false });

        if (selectedLanguage !== 'All') query = query.eq('language', selectedLanguage);
        if (selectedGenre !== 'All Genres') query = query.eq('genre', selectedGenre);

        if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
        else if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
        else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });

        const { data: productData } = await query.limit(48);
        setProducts(asArray(productData));

        // Talent Arena rooms
        if (isTalentArena) {
          const { data: roomData } = await supabase
            .from('competition_rooms')
            .select('id, title, category, prize_pool, status, cover_url')
            .neq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(12);
          if (roomData) setRooms(roomData);
        }

        // Artists
        if (isArtists) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url, follower_count, role')
            .in('role', ['artist', 'author', 'creator'])
            .order('follower_count', { ascending: false })
            .limit(48);
          if (profileData) setArtists(profileData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCollection();
  }, [handle, sortBy, selectedLanguage, selectedGenre, isTalentArena, isArtists]);

  // Marketplace — render the full upgraded storefront (server-side filters,
  // pagination, AI solver entry, partner products) instead of the generic
  // collection grid.
  if (isMarketplace) {
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
          <Marketplace />
        </div>
        <Footer />
      </div>
    );
  }

  // Talent Arena / Competitions
  if (isTalentArena) {
    const statusColors: Record<string, string> = {
      active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      voting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-2">Talent Arena</h1>
          <p className="text-gray-400 mb-8">AI-powered competitions. Compete, get scored, win prizes.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-white/5" />
                <div className="p-5 space-y-2"><div className="h-4 bg-white/5 rounded w-2/3" /><div className="h-3 bg-white/5 rounded w-1/2" /></div>
              </div>
            )) : rooms.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">No competitions yet.</div>
            ) : rooms.map((room: any) => (
              <div key={room.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:border-[#9D4EDD]/20 transition-all group">
                <div className="relative h-40 overflow-hidden">
                  {room.cover_url
                    ? <img src={room.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-purple-600/30" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[room.status] ?? statusColors.completed}`}>{room.status}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-1">{room.title}</h3>
                  {room.category && <p className="text-sm text-gray-400 mb-3">{room.category}</p>}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-emerald-400">{room.prize_pool ?? '—'}</p>
                      <p className="text-xs text-gray-500">Prize Pool</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[room.status] ?? statusColors.completed}`}>{room.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Artists page
  if (isArtists) {
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-2">Artists</h1>
          <p className="text-gray-400 mb-8">Discover talented creators from across the world</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {loading ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl animate-pulse">
                <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-3" />
                <div className="h-3 bg-white/5 rounded w-3/4 mx-auto mb-1" />
              </div>
            )) : artists.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">No artists yet.</div>
            ) : artists.map((p: any) => (
              <Link key={p.id} to={`/artists/${p.username ?? p.id}`} className="group flex flex-col items-center text-center p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-[#9D4EDD]/30 transition-all">
                <img src={p.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${p.id}`} alt={p.display_name ?? ''} className="w-16 h-16 rounded-full object-cover mb-3 ring-2 ring-transparent group-hover:ring-[#9D4EDD]/50 transition-all" />
                <p className="text-sm font-medium text-white truncate w-full">{p.display_name ?? p.username}</p>
                <p className="text-xs text-gray-400 capitalize">{p.role}</p>
                <p className="text-xs text-[#B794F4] mt-0.5">{formatNumber(p.follower_count ?? 0)} followers</p>
              </Link>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Languages page
  if (isLanguages) {
    const langs = [
      { name: 'Afrobeats', flag: '🇳🇬', count: 1240, origin: 'Nigeria' },
      { name: 'Bongo Flava', flag: '🇹🇿', count: 890, origin: 'Tanzania' },
      { name: 'Highlife', flag: '🇬🇭', count: 760, origin: 'Ghana' },
      { name: 'Amapiano', flag: '🇿🇦', count: 1100, origin: 'South Africa' },
      { name: 'Benga', flag: '🇰🇪', count: 540, origin: 'Kenya' },
      { name: 'Mbalax', flag: '🇸🇳', count: 320, origin: 'Senegal' },
      { name: 'Afro House', flag: '🌍', count: 980, origin: 'Pan-African' },
      { name: 'Jùjú', flag: '🇳🇬', count: 430, origin: 'Nigeria' },
      { name: 'Afrobeats (Naija)', flag: '🇳🇬', count: 2100, origin: 'Nigeria' },
      { name: 'Kwaito', flag: '🇿🇦', count: 670, origin: 'South Africa' },
      { name: 'Coupé-Décalé', flag: '🇨🇮', count: 280, origin: 'Côte d\'Ivoire' },
      { name: 'Ndombolo', flag: '🇨🇩', count: 410, origin: 'DRC' },
    ];
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-2">Music by Language & Genre</h1>
          <p className="text-white/55 mb-8">Explore music from every language and musical tradition worldwide</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {langs.map(lang => (
              <Link key={lang.name} to={`/collections/music?language=${encodeURIComponent(lang.name)}`} className="group p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-[#9D4EDD]/30 transition-all">
                <span className="text-3xl mb-3 block">{lang.flag}</span>
                <h3 className="font-semibold text-white mb-1">{lang.name}</h3>
                <p className="text-xs text-gray-500 mb-2">Origin: {lang.origin}</p>
                <p className="text-xs text-[#B794F4]">{formatNumber(lang.count)} tracks</p>
              </Link>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const collectionTitle = collection?.title || handle?.charAt(0).toUpperCase()! + handle?.slice(1)! || 'Collection';

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white capitalize">{collectionTitle}</h1>
          {collection?.description && <p className="text-gray-400 mt-2">{collection.description}</p>}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar for music */}
          {isMusic && (
            <aside className="lg:w-56 flex-shrink-0">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 sticky top-24">
                <h3 className="text-sm font-semibold text-white mb-3">Language / Style</h3>
                <div className="space-y-1">
                  {MUSIC_LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedLanguage === lang ? 'bg-[#9D4EDD] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <h3 className="text-sm font-semibold text-white mb-3 mt-5">Genre</h3>
                <div className="space-y-1">
                  {MUSIC_GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedGenre === g ? 'bg-[#9D4EDD] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              {!isMusic && (
                <div className="flex gap-2 overflow-x-auto">
                  {['all', 'music', 'video', 'book', 'podcast', 'course'].map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${typeFilter === t ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {t === 'all' ? 'All' : t}
                    </button>
                  ))}
                </div>
              )}
              <span className="text-sm text-gray-400 ml-auto">{products.length} items</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl aspect-square animate-pulse" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Music quick-play grid */}
                {isMusic && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {products.map(p => {
                      const audioUrl = p.audio_url;
                      return (
                        <div key={p.id} className="group relative bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-[#9D4EDD]/30 transition-all">
                          <div className="aspect-square overflow-hidden">
                            <img src={p.cover_art || p.images?.[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Music'; }} />
                          </div>
                          {audioUrl && (
                            <button
                              onClick={() => playTrack({ id: p.id, title: p.title, artist: p.vendor || p.artist || 'Unknown', cover: p.cover_art || p.images?.[0] || '', audioUrl })}
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                            >
                              <div className="w-12 h-12 bg-[#9D4EDD] rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </button>
                          )}
                          <div className="p-3">
                            <p className="text-xs font-medium text-white truncate">{p.title}</p>
                            <p className="text-[10px] text-gray-400 truncate">{p.vendor || p.artist}</p>
                            {p.language && <p className="text-[10px] text-[#B794F4]">{p.language}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!isMusic && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products
                      .filter(p => typeFilter === 'all' || p.product_type?.toLowerCase() === typeFilter)
                      .map(p => (
                        <ProductCard key={p.id} product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price || p.price, language: p.language }} />
                      ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                <p className="text-gray-400 text-lg">No content found</p>
                <p className="text-gray-500 text-sm mt-1">Try a different filter or check back later</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
