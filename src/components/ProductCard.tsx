import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { usePlaylistContext } from '@/contexts/PlaylistContext';
import { usePlayer } from '@/components/GlobalPlayer';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  handle: string;
  title: string;
  vendor?: string;
  product_type?: string;
  image?: string;
  price?: number;
  language?: string;
  artist?: string;
  author?: string;
  audio_url?: string;
  preview_url?: string;
  genre?: string;
}

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'featured' | 'portrait' | 'square';
}

const TYPE_COLORS: Record<string, string> = {
  Music:    'from-[#9D4EDD] to-purple-600',
  Books:    'from-amber-500 to-orange-600',
  Videos:   'from-red-500 to-pink-600',
  Podcasts: 'from-green-500 to-teal-600',
  Courses:  'from-blue-500 to-cyan-600',
};

const TYPE_CONTENT: Record<string, 'music' | 'video' | 'audiobook' | 'podcast' | 'course'> = {
  Music:    'music',
  Videos:   'video',
  Books:    'audiobook',
  Podcasts: 'podcast',
  Courses:  'course',
};

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const { addToCart }         = useCart();
  const { openAddToPlaylist } = usePlaylistContext();
  const { play }              = usePlayer();
  const { user }              = useApp();

  const [saved, setSaved] = useState(false);

  const price      = product.price ? product.price / 100 : 0;
  const isFree     = price === 0;
  const type       = product.product_type || 'Music';
  const gradient   = TYPE_COLORS[type] ?? TYPE_COLORS['Music'];
  const contentType = TYPE_CONTENT[type] ?? 'music';
  const creator    = product.artist || product.author || product.vendor;
  const previewUrl = product.preview_url || product.audio_url;

  // Load initial saved state for this track
  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_tracks')
      .select('id')
      .eq('user_id', user.id)
      .eq('track_id', product.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, product.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const next = !saved;
    setSaved(next); // optimistic
    if (next) {
      await supabase.from('saved_tracks').insert([{
        user_id:      user.id,
        track_id:     product.id,
        content_type: contentType,
        title:        product.title,
        artist:       creator ?? null,
        cover_url:    product.image ?? null,
        audio_url:    product.audio_url ?? null,
      }]);
    } else {
      await supabase.from('saved_tracks').delete()
        .eq('user_id', user.id)
        .eq('track_id', product.id);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!previewUrl) return;
    play({
      id:       product.id,
      title:    product.title,
      artist:   creator ?? 'Unknown',
      albumArt: product.image,
      audioUrl: previewUrl,
      type:     contentType,
    });
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openAddToPlaylist({
      track_id:     product.id,
      content_type: contentType,
      title:        product.title,
      artist:       creator,
      cover_url:    product.image,
      audio_url:    product.audio_url,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({ id: product.id, title: product.title, price, image: product.image || '' });
  };

  const priceBadge = isFree ? (
    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500 text-white font-bold">FREE</span>
  ) : (
    <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#9D4EDD] text-white font-bold">${price.toFixed(2)}</span>
  );

  // ── Portrait variant (2:3 ratio — reference card for all discovery grids) ───

  if (variant === 'portrait') {
    const handleDownload = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (previewUrl) window.open(previewUrl, '_blank');
    };

    return (
      <Link
        to={`/products/${product.handle}`}
        className="group block hover:-translate-y-1 transition-all duration-300"
      >
        {/* Cover — aspect-[2/3] */}
        <div
          className="relative rounded-xl overflow-hidden border border-white/10 shadow-lg group-hover:scale-[1.02] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300"
          style={{ aspectRatio: '2/3' }}
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            /* Fallback: gradient + initials + title + creator name overlay */
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-1.5 p-3 text-center`}>
              <span className="text-4xl font-black text-white/25 leading-none">{product.title?.[0] ?? '?'}</span>
              <span className="text-white/70 text-[11px] font-semibold line-clamp-2 leading-tight mt-1">{product.title}</span>
              {creator && <span className="text-white/40 text-[10px]">{creator}</span>}
            </div>
          )}

          {/* Spine shimmer */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/15 rounded-l-xl" />

          {/* Type badge — top-left */}
          <div className="absolute top-2 left-2">
            <span className={`px-1.5 py-0.5 text-[9px] font-bold text-white rounded bg-gradient-to-r ${gradient}`}>
              {type}
            </span>
          </div>

          {/* Price badge — top-right */}
          <div className="absolute top-2 right-2">
            {isFree ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00F5A0] text-[#0B0814]">FREE</span>
            ) : (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FFB800] text-[#0B0814]">${price.toFixed(2)}</span>
            )}
          </div>

          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={handlePreview}
              className="w-12 h-12 rounded-full bg-[#9D4EDD] hover:bg-[#9D4EDD]/90 flex items-center justify-center shadow-xl transition-colors"
            >
              <svg className="w-5 h-5 fill-white ml-1" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info below cover */}
        <div className="pt-2.5 px-0.5">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{product.title}</p>
          {creator && <p className="text-gray-400 text-[11px] truncate mt-0.5">{creator}</p>}

          {/* Action row */}
          <div className="flex items-center gap-1.5 mt-2">
            {previewUrl && (
              <button
                onClick={handlePreview}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-white/5 hover:bg-[#9D4EDD]/20 text-white/60 hover:text-[#9D4EDD] border border-white/5 transition-colors"
              >
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play
              </button>
            )}
            {isFree ? (
              <button
                onClick={handleDownload}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-[#00F5A0]/10 hover:bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/15 transition-colors"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Free
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-[#9D4EDD]/15 hover:bg-[#9D4EDD]/25 text-[#B794F4] border border-[#9D4EDD]/15 transition-colors"
              >
                + Cart
              </button>
            )}
            <button
              onClick={handleAddToPlaylist}
              title="Add to playlist"
              className="ml-auto p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white border border-white/5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // ── Square variant (1:1 — New Releases carousel, 200 × 200) ────────────────

  if (variant === 'square') {
    return (
      <Link
        to={`/products/${product.handle}`}
        className="group block hover:-translate-y-1 transition-all duration-300"
      >
        {/* Cover — 1:1 */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/8 shadow-lg group-hover:shadow-[0_8px_28px_rgba(0,0,0,0.6)] transition-all duration-300 bg-[#0B0814]">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2 p-3 text-center opacity-80`}>
              <span className="text-5xl font-black text-white/20 leading-none">{product.title?.[0] ?? '?'}</span>
              <span className="text-white/60 text-[11px] font-semibold line-clamp-2 leading-tight">{product.title}</span>
            </div>
          )}

          {/* Gradient scrim bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Price badge — top-right */}
          <div className="absolute top-2 right-2">
            {isFree ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">FREE</span>
            ) : (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-600 text-white">${price.toFixed(2)}</span>
            )}
          </div>

          {/* Type badge — top-left */}
          <div className="absolute top-2 left-2">
            <span className={`px-1.5 py-0.5 text-[9px] font-bold text-white rounded-md bg-gradient-to-r ${gradient} opacity-90`}>
              {type}
            </span>
          </div>

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handlePreview}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5 fill-white ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>

          {/* Save button — bottom-left */}
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleSave}
              title={saved ? 'Saved' : 'Save'}
              className={`p-1.5 rounded-lg transition-colors ${saved ? 'bg-violet-600 text-white' : 'bg-black/60 hover:bg-black/80 text-white/70 hover:text-white'}`}
            >
              <svg className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          {/* Cart button — bottom-right */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleAddToCart}
              title={isFree ? 'Get Free' : 'Add to Cart'}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-violet-600 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info below */}
        <div className="pt-2.5 px-0.5">
          <p className="text-white text-xs font-semibold line-clamp-1 leading-tight">{product.title}</p>
          {creator && <p className="text-white/40 text-[11px] truncate mt-0.5">{creator}</p>}
        </div>
      </Link>
    );
  }

  // ── Featured variant ────────────────────────────────────────────────────────

  if (variant === 'featured') {
    return (
      <Link
        to={`/products/${product.handle}`}
        className="group relative block rounded-2xl overflow-hidden aspect-[3/4] bg-gray-900"
      >
        {product.image && (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs text-white bg-gradient-to-r ${gradient} mb-2`}>
            {type}
          </span>
          <h3 className="text-white font-bold text-lg leading-tight">{product.title}</h3>
          {creator && <p className="text-gray-300 text-sm mt-1">{creator}</p>}
          <div className="flex items-center justify-between mt-3">
            {priceBadge}
            <div className="flex items-center gap-1.5">
              {previewUrl && (
                <button
                  onClick={handlePreview}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  title="Preview"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}
              <button
                onClick={handleAddToCart}
                className="px-3 py-1.5 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-xs rounded-lg transition-colors"
              >
                {isFree ? 'Get Free' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Default variant ─────────────────────────────────────────────────────────

  return (
    <Link
      to={`/products/${product.handle}`}
      className="group block bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-[#9D4EDD]/30 transition-all hover:-translate-y-0.5"
    >
      {/* Cover art */}
      <div className="relative aspect-square overflow-hidden bg-gray-800">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-white/50 text-4xl font-bold">{product.title?.[0] ?? '?'}</span>
          </div>
        )}

        {/* Type badge (top-left) */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 text-[10px] text-white rounded-full bg-gradient-to-r ${gradient}`}>
            {type}
          </span>
        </div>

        {/* Language badge (top-right) */}
        {product.language && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 text-[10px] text-white bg-black/50 rounded-full">
              {product.language}
            </span>
          </div>
        )}

        {/* Hover action buttons (bottom-right) */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {/* Save */}
          <button
            onClick={handleSave}
            title={saved ? 'Saved' : 'Save'}
            className={`p-2 rounded-lg transition-colors ${
              saved ? 'bg-[#9D4EDD] text-white' : 'bg-gray-900/80 hover:bg-gray-700 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Preview */}
          {previewUrl && (
            <button
              onClick={handlePreview}
              title="Preview"
              className="bg-gray-900/80 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* Add to playlist */}
          <button
            onClick={handleAddToPlaylist}
            title="Add to playlist"
            className="bg-gray-900/80 hover:bg-[#9D4EDD] text-white p-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </button>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            title={isFree ? 'Get Free' : 'Add to Cart'}
            className="bg-[#9D4EDD] hover:bg-[#7C3AED] text-white p-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card footer */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate">{product.title}</h3>
        {creator && <p className="text-xs text-gray-400 truncate mt-0.5">{creator}</p>}
        {product.genre && <p className="text-xs text-gray-500 truncate">{product.genre}</p>}
        <div className="mt-2">{priceBadge}</div>
      </div>
    </Link>
  );
}
