import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { usePlayer } from '@/components/GlobalPlayer';
import { usePlaylist } from '@/hooks/usePlaylist';
import { usePlaylistContext } from '@/contexts/PlaylistContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import PremiumBackground from '@/components/PremiumBackground';
import TiltCard from '@/components/TiltCard';
import CommentsSection from '@/components/CommentsSection';
import RelatedProducts from '@/components/RelatedProducts';
import ProductReviews from '@/components/ProductReviews';
import ShareClipModal from '@/components/ShareClipModal';
import ReactionBar from '@/components/ReactionBar';

const TYPE_COLORS: Record<string, string> = {
  music:    'from-[#9D4EDD] to-purple-600',
  book:     'from-amber-500 to-orange-600',
  books:    'from-amber-500 to-orange-600',
  video:    'from-red-500 to-pink-600',
  videos:   'from-red-500 to-pink-600',
  podcast:  'from-green-500 to-teal-600',
  podcasts: 'from-green-500 to-teal-600',
  course:   'from-blue-500 to-cyan-600',
  courses:  'from-blue-500 to-cyan-600',
};

function toContentType(raw: string): 'music' | 'video' | 'audiobook' | 'podcast' | 'course' {
  const t = raw.toLowerCase();
  if (t === 'music')                          return 'music';
  if (t === 'video'  || t === 'videos')       return 'video';
  if (t === 'book'   || t === 'books')        return 'audiobook';
  if (t === 'podcast'|| t === 'podcasts')     return 'podcast';
  if (t === 'course' || t === 'courses')      return 'course';
  return 'music';
}

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProductPage() {
  const { handle }                    = useParams<{ handle: string }>();
  const navigate                      = useNavigate();
  const { user }                      = useAuth();
  const { addToCart }                 = useCart();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { saveTrack, unsaveTrack, isSaved }            = usePlaylist();
  const { openAddToPlaylist }         = usePlaylistContext();

  const [product,         setProduct]         = useState<any>(null);
  const [variants,        setVariants]        = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity,        setQuantity]        = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [showClipModal,   setShowClipModal]   = useState(false);
  const [isOwned,         setIsOwned]         = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      if (!handle) return;
      setLoading(true);

      // Support both slug handles and UUID product IDs (e.g. from library links)
      const isUUID = UUID_RE.test(handle);
      const query = supabase.from('ecom_products').select('*');
      const { data } = await (isUUID ? query.eq('id', handle) : query.eq('handle', handle)).single();

      if (data) {
        setProduct(data);
        const { data: varData } = await supabase
          .from('ecom_product_variants')
          .select('*')
          .eq('product_id', data.id);
        if (varData?.length) {
          setVariants(varData);
          setSelectedVariant(varData[0]);
        }

        // Check if logged-in user already owns this product
        if (user?.id) {
          const { data: lib } = await supabase
            .from('user_library')
            .select('id, expires_at')
            .eq('user_id', user.id)
            .eq('product_id', data.id)
            .maybeSingle();
          setIsOwned(!!lib && (!lib.expires_at || new Date(lib.expires_at) > new Date()));
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [handle, user?.id]);

  if (loading) return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        <div className="h-4 w-40 rounded bg-white/5 animate-pulse mb-8" />
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
          <div className="space-y-4">
            <div className="h-9 w-3/4 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-5 w-1/3 rounded bg-white/5 animate-pulse" />
            <div className="h-24 w-full rounded-xl bg-white/5 animate-pulse mt-4" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
            <div className="h-12 w-full rounded-xl bg-white/5 animate-pulse mt-4" />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#0B0814] flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Product not found</h1>
          <p className="text-white/45 text-sm mb-6">This item may have been removed or is no longer available.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] hover:opacity-90 transition-opacity">
            Back to marketplace
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  const price       = selectedVariant ? selectedVariant.price / 100 : (product.price || 0) / 100;
  const isFree      = price === 0;
  const image       = product.images?.[0] || product.cover_art || product.cover_url;
  const rawType     = product.product_type?.toLowerCase() || '';
  const gradient    = TYPE_COLORS[rawType] || 'from-[#9D4EDD] to-purple-600';
  const contentType = toContentType(rawType);
  const creator     = product.vendor || product.artist || product.author;
  const previewUrl  = product.preview_url || product.audio_url;
  const trackSaved  = isSaved(product.id);
  const isPreviewing = currentTrack?.id === product.id && isPlaying;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handlePlay = () => {
    if (currentTrack?.id === product.id) { togglePlay(); return; }
    if (!previewUrl) return;
    play({
      id:       product.id,
      title:    product.title,
      artist:   creator || 'Unknown',
      albumArt: image   || undefined,
      cover:    image   || undefined,
      audioUrl: previewUrl,
      type:     contentType,
    });
  };

  const handleAddToCart = () => {
    addToCart({ id: product.id, title: product.title, price, image: image || '', variant: selectedVariant?.title });
  };

  const handleBuyNow = () => {
    addToCart({ id: product.id, title: product.title, price, image: image || '', variant: selectedVariant?.title });
    navigate('/cart');
  };

  const handleDownload = () => {
    const url = product.audio_url || product.preview_url;
    if (url) window.open(url, '_blank');
  };

  const handleSave = async () => {
    if (trackSaved) {
      await unsaveTrack(product.id);
    } else {
      await saveTrack({
        track_id:     product.id,
        content_type: contentType,
        title:        product.title,
        artist:       creator   || undefined,
        cover_url:    image     || undefined,
        audio_url:    product.audio_url || undefined,
      });
    }
  };

  const handleAddToPlaylist = () => {
    openAddToPlaylist({
      track_id:     product.id,
      content_type: contentType,
      title:        product.title,
      artist:       creator || undefined,
      cover_url:    image   || undefined,
      audio_url:    product.audio_url || undefined,
    });
  };

  return (
    <div className="relative min-h-screen bg-[#0B0814]">
      <Seo
        title={product.title}
        description={(product.body_html ? String(product.body_html).replace(/<[^>]+>/g, '').slice(0, 155) : '') || `${product.title}${creator ? ` by ${creator}` : ''} — available now on WANKONG.`}
        image={image || undefined}
        type="article"
      />
      <PremiumBackground />
      <Header />
      <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-8 py-12">

        <Link
          to="/music-store"
          className="text-sm text-white/55 hover:text-white mb-6 inline-flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </Link>

        <div className="grid md:grid-cols-2 gap-10 mt-4">

          {/* Cover art */}
          <div>
            <TiltCard className="rounded-2xl" max={8} glow="rgba(157,78,221,0.32)">
              {image ? (
                <img src={image} alt={product.title} className="w-full aspect-square object-cover rounded-2xl" />
              ) : (
                <div className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <span className="text-white/30 text-6xl font-bold">{product.title?.[0]}</span>
                </div>
              )}
            </TiltCard>
          </div>

          {/* Info panel */}
          <div>
            {/* Type + language badges */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs text-white font-medium bg-gradient-to-r ${gradient} capitalize`}>
                {product.product_type || rawType}
              </span>
              {product.language && (
                <span className="px-3 py-1 rounded-full text-xs text-white/70 bg-white/10">
                  {product.language}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">{product.title}</h1>
            {creator && <p className="text-white/55 mb-4">by {creator}</p>}

            {product.body_html && (
              <p className="text-white/70 leading-relaxed mb-6">{product.body_html}</p>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {product.genre && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-white/40">Genre</p>
                  <p className="text-sm text-white">{product.genre}</p>
                </div>
              )}
              {product.language && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-white/40">Language</p>
                  <p className="text-sm text-white">{product.language}</p>
                </div>
              )}
              {product.duration && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-white/40">Duration</p>
                  <p className="text-sm text-white">{product.duration}</p>
                </div>
              )}
              {product.pages && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-white/40">Pages</p>
                  <p className="text-sm text-white">{product.pages}</p>
                </div>
              )}
            </div>

            {/* Variant selector */}
            {variants.length > 1 && (
              <div className="mb-5">
                <p className="text-sm text-white/55 mb-2">Options</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedVariant?.id === v.id
                          ? 'bg-[#9D4EDD] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {v.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              {isOwned ? (
                <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-xl font-bold rounded-xl border border-emerald-500/30 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  You own this
                </span>
              ) : isFree ? (
                <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-xl font-bold rounded-xl border border-emerald-500/30">
                  FREE
                </span>
              ) : (
                <p className="text-3xl font-bold text-white">${price.toFixed(2)}</p>
              )}
              {!isFree && (
                <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 text-white hover:bg-white/15 rounded-lg flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <span className="text-white w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-8 text-white hover:bg-white/15 rounded-lg flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* ── Primary action buttons ── */}
            <div className="flex flex-wrap gap-3">

              {/* Play Preview — always shown when audio exists */}
              {previewUrl && (
                <button
                  onClick={handlePlay}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-colors font-medium ${
                    isPreviewing
                      ? 'bg-[#9D4EDD] text-white hover:bg-[#7C3AED]'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    {isPreviewing
                      ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      : <path d="M8 5v14l11-7z" />
                    }
                  </svg>
                  {isPreviewing ? 'Pause' : 'Play Preview'}
                </button>
              )}

              {/* Already owned → access button replaces purchase */}
              {isOwned ? (
                <button
                  onClick={() => {
                    const t = rawType;
                    if (t === 'book' || t === 'books' || t === 'ebook') navigate(`/reader/${product.id}`);
                    else if (t === 'audiobook') { if (previewUrl) handlePlay(); }
                    else if (previewUrl) handlePlay();
                    else navigate(`/library`);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {rawType === 'book' || rawType === 'books' ? 'Read Now' : rawType === 'audiobook' ? 'Listen Now' : 'Access Content'}
                </button>
              ) : isFree ? (
                <>
                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>

                  {/* Add to Library */}
                  <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-colors ${
                      trackSaved
                        ? 'bg-[#9D4EDD] text-white hover:bg-[#7C3AED]'
                        : 'border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={trackSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {trackSaved ? 'In Library' : 'Add to Library'}
                  </button>
                </>
              ) : (
                <>
                  {/* Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center gap-2 px-5 py-3 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                  </button>

                  {/* Buy Now */}
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-semibold rounded-xl transition-colors"
                  >
                    Buy Now — ${(price * quantity).toFixed(2)}
                  </button>
                </>
              )}
            </div>

            {/* ── Secondary actions ── */}
            <div className="flex gap-2 mt-4">
              {/* Save (for paid products, shown separately since library is primary for free) */}
              {!isFree && (
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors ${
                    trackSaved
                      ? 'bg-[#9D4EDD]/20 text-[#B794F4] border border-[#9D4EDD]/30'
                      : 'bg-white/10 text-white/55 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill={trackSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {trackSaved ? 'Saved' : 'Save'}
                </button>
              )}

              {/* Add to Playlist */}
              <button
                onClick={handleAddToPlaylist}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white/10 text-white/55 hover:text-white rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Playlist
              </button>

              {/* Share Clip — only for tracks with audio */}
              {previewUrl && (contentType === 'music' || contentType === 'podcast') && (
                <button
                  onClick={() => setShowClipModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white/10 text-white/55 hover:text-[#00D9FF] rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6-6 6 6M6 15l6 6 6-6" />
                  </svg>
                  Share Clip
                </button>
              )}
            </div>


            {/* ── External streaming buttons ── */}
            {(product.spotify_url || product.apple_music_url || product.youtube_music_url || product.deezer_url) && (
              <div className="mt-6 pt-5 border-t border-white/8">
                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Also available on</p>
                <div className="flex flex-wrap gap-2">
                  {product.spotify_url && (
                    <a
                      href={product.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      style={{ background: '#1DB95415', border: '1px solid #1DB95430', color: '#1DB954' }}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Play on Spotify
                    </a>
                  )}
                  {product.spotify_url && (
                    <a
                      href={`https://open.spotify.com/search/${encodeURIComponent(product.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      style={{ background: '#1DB95410', border: '1px solid #1DB95420', color: '#1DB95490' }}
                    >
                      Add to Spotify Playlist
                    </a>
                  )}
                  {product.apple_music_url && (
                    <a
                      href={product.apple_music_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      style={{ background: '#FC3C4415', border: '1px solid #FC3C4430', color: '#FC3C44' }}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.848.187 1.286.218.332.024.665.034 1 .04h11.95c.338-.005.676-.015 1.01-.044.584-.05 1.16-.157 1.698-.4 1.298-.57 2.147-1.504 2.6-2.829.144-.42.216-.853.26-1.292.045-.426.056-.852.056-1.278 0-4.152 0-8.304-.003-12.455zM7.952 4.72c-.18.002-.332-.148-.337-.33a.34.34 0 01.33-.34c.181-.003.334.146.337.327a.34.34 0 01-.33.342zm4.029 9.296c-1.977 0-3.58-1.6-3.58-3.577 0-1.977 1.603-3.58 3.58-3.58 1.977 0 3.577 1.603 3.577 3.58 0 1.977-1.6 3.577-3.577 3.577zm5.765-9.296a.34.34 0 01-.34-.333.34.34 0 01.33-.34c.184-.002.338.148.34.33a.34.34 0 01-.33.342z"/>
                      </svg>
                      Open in Apple Music
                    </a>
                  )}
                  {product.youtube_music_url && (
                    <a
                      href={product.youtube_music_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      style={{ background: '#FF000015', border: '1px solid #FF000030', color: '#FF4444' }}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
                      </svg>
                      Open in YouTube Music
                    </a>
                  )}
                  {product.deezer_url && (
                    <a
                      href={product.deezer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      style={{ background: '#A238FF15', border: '1px solid #A238FF30', color: '#A238FF' }}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.03h5.19V8.38H6.27zm6.27 0v3.03h5.19V8.38h-5.19zm6.27 0v3.03H24V8.38h-5.19zM6.27 12.6v3.04h5.19V12.6H6.27zm6.27 0v3.04h5.19V12.6h-5.19zm6.27 0v3.04H24V12.6h-5.19zM0 16.81v3.03h5.19v-3.03H0zm6.27 0v3.03h5.19v-3.03H6.27zm6.27 0v3.03h5.19v-3.03h-5.19zm6.27 0v3.03H24v-3.03h-5.19z"/>
                      </svg>
                      Open in Deezer
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reactions */}
        <div className="mt-8">
          <ReactionBar contentId={product.id} contentType={rawType || 'product'} />
        </div>

        {/* Reviews (verified purchasers) */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <ProductReviews productId={product.id} canReview={isOwned} />
        </div>

        {/* Related products */}
        <RelatedProducts product={product} className="mt-12 pt-8 border-t border-white/5" />

        {/* Comments */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <CommentsSection productId={product.id} />
        </div>
      </div>
      <Footer />

      {/* Share Clip Modal */}
      {showClipModal && (
        <ShareClipModal
          track={{
            id:       product.id,
            title:    product.title,
            artist:   creator || 'Unknown',
            albumArt: image   || undefined,
            audioUrl: previewUrl!,
            type:     contentType,
          }}
          onClose={() => setShowClipModal(false)}
        />
      )}
    </div>
  );
}
