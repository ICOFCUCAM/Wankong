import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Music, BookOpen, Video, Mic, Trophy, Plus, Play, Pause,
  Heart, Shuffle, MoreVertical, Trash2, Edit2, Disc3, ShoppingBag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePlaylist, Playlist, SavedTrack, PlaylistTrack } from '@/hooks/usePlaylist';
import { usePlayer } from '@/components/GlobalPlayer';
import { useApp } from '@/store/AppContext';
import PlaylistView from '@/components/playlist/PlaylistView';
import PlaylistCreateModal from '@/components/playlist/PlaylistCreateModal';

// ── Section tabs ──────────────────────────────────────────────────────────────

type Tab = 'all' | 'playlists' | 'tracks' | 'albums' | 'audiobooks' | 'podcasts' | 'performances' | 'purchases';

interface PurchasedItem {
  id: string;
  product_id: string;
  access_type: string;
  expires_at: string | null;
  product: { title: string; cover_url: string | null; product_type: string | null; price: number } | null;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'all',          label: 'All',           icon: <Music       className="w-3.5 h-3.5" /> },
  { id: 'playlists',    label: 'Playlists',     icon: <Play        className="w-3.5 h-3.5" /> },
  { id: 'tracks',       label: 'Liked Songs',   icon: <Heart       className="w-3.5 h-3.5" /> },
  { id: 'albums',       label: 'Albums',        icon: <Disc3       className="w-3.5 h-3.5" /> },
  { id: 'audiobooks',   label: 'Audiobooks',    icon: <BookOpen    className="w-3.5 h-3.5" /> },
  { id: 'podcasts',     label: 'Podcasts',      icon: <Mic         className="w-3.5 h-3.5" /> },
  { id: 'performances', label: 'Performances',  icon: <Trophy      className="w-3.5 h-3.5" /> },
  { id: 'purchases',    label: 'Purchases',     icon: <ShoppingBag className="w-3.5 h-3.5" /> },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(sec: number | null | undefined): string {
  if (!sec) return '';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function PlaylistCard({
  playlist,
  onPlay,
  onOpen,
  onDelete,
  onRename,
  menuOpen,
  setMenuOpen,
}: {
  playlist:    Playlist;
  onPlay:      () => void;
  onOpen:      () => void;
  onDelete:    () => void;
  onRename:    () => void;
  menuOpen:    boolean;
  setMenuOpen: (v: boolean) => void;
}) {
  return (
    <div className="group relative bg-gray-900/40 border border-gray-800 hover:border-[#9D4EDD]/30 rounded-2xl overflow-hidden transition-all cursor-pointer"
      onClick={onOpen}>
      {/* Cover */}
      <div className="relative aspect-square bg-gradient-to-br from-[#9D4EDD]/30 to-purple-700/30 flex items-center justify-center overflow-hidden">
        {playlist.cover_url
          ? <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
          : <Music className="w-12 h-12 text-white/20" />}
        {playlist.is_editorial && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-[#9D4EDD] text-white rounded-full font-medium">Editorial</span>
        )}
        {/* Hover play */}
        <button
          onClick={e => { e.stopPropagation(); onPlay(); }}
          className="absolute bottom-2 right-2 w-10 h-10 bg-[#9D4EDD] hover:bg-[#9D4EDD] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl translate-y-2 group-hover:translate-y-0"
        >
          <Play className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate">{playlist.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{playlist.track_count} track{playlist.track_count !== 1 ? 's' : ''}</p>
        {playlist.description && <p className="text-xs text-gray-500 mt-1 truncate">{playlist.description}</p>}
      </div>

      {/* 3-dot menu (own playlists only) */}
      {!playlist.is_editorial && (
        <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-36 bg-[#0B0814] border border-white/10 rounded-xl shadow-2xl py-1">
                <button onClick={() => { onRename(); setMenuOpen(false); }} className="w-full text-left px-3.5 py-2.5 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" />Rename</button>
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full text-left px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />Delete</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SavedTrackRow({ track, onPlay, onUnsave }: { track: SavedTrack; onPlay: () => void; onUnsave: () => void }) {
  const ICONS: Record<string, string> = { music: '🎵', video: '🎬', audiobook: '🎧', podcast: '🎙️', course: '📖', competition: '🏆' };
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer" onClick={onPlay}>
      <div className="w-10 h-10 rounded-lg bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center">
        {track.cover_url
          ? <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-lg">{ICONS[track.content_type] ?? '🎵'}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{track.title}</p>
        {track.artist && <p className="text-xs text-gray-400 truncate">{track.artist}</p>}
      </div>
      {track.duration && <span className="text-xs text-gray-500 shrink-0 hidden sm:block">{fmt(track.duration)}</span>}
      <button
        onClick={e => { e.stopPropagation(); onUnsave(); }}
        className="p-1.5 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10 shrink-0"
        title="Remove from saved"
      >
        <Heart className="w-4 h-4 fill-current" />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pl = usePlaylist();
  const { play, isPlaying, currentTrack, togglePlay, toggleShuffle, shuffle } = usePlayer();

  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'all';
  const [activeTab,       setActiveTab]       = useState<Tab>(initialTab);
  const [openPlaylist,    setOpenPlaylist]     = useState<Playlist | null>(null);
  const [showCreate,      setShowCreate]       = useState(false);
  const [renameTarget,    setRenameTarget]     = useState<Playlist | null>(null);
  const [openMenu,        setOpenMenu]         = useState<string | null>(null);
  const [purchases,       setPurchases]        = useState<PurchasedItem[]>([]);

  // Admin state
  const isAdmin = user?.role === 'admin';
  const [showEditorial,   setShowEditorial]    = useState(false);
  const [editorialName,   setEditorialName]    = useState('');
  const [editorialType,   setEditorialType]    = useState<'trending'|'top_creators'|'winners'|'new_releases'>('trending');
  const [editorialDesc,   setEditorialDesc]    = useState('');

  useEffect(() => { pl.loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch purchased items from user_library
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_library')
      .select('id, product_id, access_type, expires_at, ecom_products:product_id(title, cover_url, product_type, price)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const valid = data.filter((r: any) => !r.expires_at || new Date(r.expires_at) > new Date());
        setPurchases(valid.map((r: any) => ({
          id:          r.id,
          product_id:  r.product_id,
          access_type: r.access_type,
          expires_at:  r.expires_at,
          product:     Array.isArray(r.ecom_products) ? r.ecom_products[0] ?? null : r.ecom_products,
        })));
      });
  }, [user?.id]);

  const savedMusic         = pl.savedTracks.filter(t => t.content_type === 'music');
  const savedAlbums        = pl.savedTracks.filter(t => t.content_type === 'album');
  const savedAudiobooks    = pl.savedTracks.filter(t => t.content_type === 'audiobook');
  const savedPodcasts      = pl.savedTracks.filter(t => t.content_type === 'podcast');
  const savedPerformances  = pl.savedTracks.filter(t => t.content_type === 'competition' || t.content_type === 'video');

  const playTrack = (track: SavedTrack) => {
    play({
      id:       track.track_id,
      title:    track.title,
      artist:   track.artist ?? 'Unknown',
      albumArt: track.cover_url ?? undefined,
      cover:    track.cover_url ?? undefined,
      audioUrl: track.audio_url ?? undefined,
      videoUrl: track.video_url ?? undefined,
      duration: track.duration ?? undefined,
    });
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    const tracks = await pl.getPlaylistTracks(playlist.id);
    pl.playPlaylist(tracks, 0);
  };

  const handleDelete = async (id: string) => {
    const ok = await pl.deletePlaylist(id);
    if (ok && openPlaylist?.id === id) setOpenPlaylist(null);
  };

  const handleCreateEditorial = async () => {
    if (!editorialName.trim()) return;
    await pl.createEditorialPlaylist(editorialName.trim(), editorialType, editorialDesc.trim() || undefined);
    setEditorialName(''); setEditorialDesc(''); setShowEditorial(false);
  };

  // If a playlist is open, render PlaylistView
  if (openPlaylist) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PlaylistView
          playlist={openPlaylist}
          onBack={() => setOpenPlaylist(null)}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  const showSection = (tab: Tab) => activeTab === 'all' || activeTab === tab;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Library</h1>
          <p className="text-gray-400 text-sm mt-1">Your playlists, saved tracks and followed collections.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Playlist
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Saved Tracks ── */}
      {showSection('tracks') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400 fill-current" /> Saved Tracks
              {savedMusic.length > 0 && <span className="text-sm font-normal text-gray-400">({savedMusic.length})</span>}
            </h2>
            {savedMusic.length > 1 && (
              <button
                onClick={() => { if (!shuffle) toggleShuffle(); playTrack(savedMusic[Math.floor(Math.random() * savedMusic.length)]); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Shuffle className="w-4 h-4" /> Shuffle
              </button>
            )}
          </div>

          {savedMusic.length === 0 ? (
            <div className="py-10 text-center bg-gray-900/30 rounded-2xl border border-gray-800">
              <Heart className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No saved tracks yet.</p>
              <p className="text-gray-500 text-sm mt-1">Tap the heart icon on any track to save it here.</p>
            </div>
          ) : (
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-3 space-y-1">
              {savedMusic.slice(0, activeTab === 'all' ? 8 : 9999).map(track => (
                <SavedTrackRow key={track.id} track={track} onPlay={() => playTrack(track)} onUnsave={() => pl.unsaveTrack(track.track_id)} />
              ))}
              {activeTab === 'all' && savedMusic.length > 8 && (
                <button onClick={() => setActiveTab('tracks')} className="w-full pt-3 text-sm text-[#B794F4] hover:text-[#C9B3F5] text-center transition-colors">
                  See all {savedMusic.length} saved tracks →
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Saved Albums ── */}
      {showSection('albums') && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-[#B794F4]" /> Saved Albums
            {savedAlbums.length > 0 && <span className="text-sm font-normal text-gray-400">({savedAlbums.length})</span>}
          </h2>
          {savedAlbums.length === 0 ? (
            <div className="py-10 text-center bg-gray-900/30 rounded-2xl border border-gray-800">
              <Disc3 className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No saved albums yet.</p>
              <p className="text-gray-500 text-sm mt-1">Save albums from the music store to find them here.</p>
            </div>
          ) : (
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-3 space-y-1">
              {savedAlbums.map(track => (
                <SavedTrackRow key={track.id} track={track} onPlay={() => playTrack(track)} onUnsave={() => pl.unsaveTrack(track.track_id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Saved Podcasts ── */}
      {showSection('podcasts') && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-green-400" /> Saved Podcasts
            {savedPodcasts.length > 0 && <span className="text-sm font-normal text-gray-400">({savedPodcasts.length})</span>}
          </h2>
          {savedPodcasts.length === 0 ? (
            <div className="py-10 text-center bg-gray-900/30 rounded-2xl border border-gray-800">
              <Mic className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No saved podcasts yet.</p>
              <p className="text-gray-500 text-sm mt-1">Save podcast episodes to find them here.</p>
            </div>
          ) : (
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-3 space-y-1">
              {savedPodcasts.map(track => (
                <SavedTrackRow key={track.id} track={track} onPlay={() => playTrack(track)} onUnsave={() => pl.unsaveTrack(track.track_id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── My Playlists ── */}
      {showSection('playlists') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-[#B794F4]" /> My Playlists
              {pl.myPlaylists.length > 0 && <span className="text-sm font-normal text-gray-400">({pl.myPlaylists.length})</span>}
            </h2>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm text-[#B794F4] hover:text-[#C9B3F5] transition-colors">
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>

          {pl.myPlaylists.length === 0 ? (
            <div className="py-10 text-center bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
              <Music className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No playlists yet.</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-[#B794F4] hover:text-[#C9B3F5] transition-colors">Create your first playlist →</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pl.myPlaylists.map(p => (
                <PlaylistCard
                  key={p.id}
                  playlist={p}
                  onPlay={() => handlePlayPlaylist(p)}
                  onOpen={() => setOpenPlaylist(p)}
                  onDelete={() => handleDelete(p.id)}
                  onRename={() => setRenameTarget(p)}
                  menuOpen={openMenu === p.id}
                  setMenuOpen={v => setOpenMenu(v ? p.id : null)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Followed Playlists ── */}
      {showSection('playlists') && pl.followedPlaylists.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Followed Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pl.followedPlaylists.map(p => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                onPlay={() => handlePlayPlaylist(p)}
                onOpen={() => setOpenPlaylist(p)}
                onDelete={() => pl.unfollowPlaylist(p.id)}
                onRename={() => {}}
                menuOpen={openMenu === p.id}
                setMenuOpen={v => setOpenMenu(v ? p.id : null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Editorial Playlists ── */}
      {showSection('playlists') && pl.editorialPlaylists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Featured Playlists</h2>
            {isAdmin && (
              <button onClick={() => setShowEditorial(!showEditorial)} className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Editorial
              </button>
            )}
          </div>

          {/* Admin: create editorial form */}
          {isAdmin && showEditorial && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-semibold text-purple-300">Create Editorial Playlist (Admin)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={editorialName} onChange={e => setEditorialName(e.target.value)} placeholder="Playlist name" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={editorialType} onChange={e => setEditorialType(e.target.value as any)}>
                    <option value="trending">Trending This Week</option>
                    <option value="top_creators">Top Creators This Week</option>
                    <option value="winners">Competition Winners</option>
                    <option value="new_releases">New Releases</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                  <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={editorialDesc} onChange={e => setEditorialDesc(e.target.value)} placeholder="Describe this editorial playlist..." />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEditorial(false)} className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={handleCreateEditorial} disabled={!editorialName.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors">Create Editorial Playlist</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pl.editorialPlaylists.map(p => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                onPlay={() => handlePlayPlaylist(p)}
                onOpen={() => setOpenPlaylist(p)}
                onDelete={() => {}}
                onRename={() => {}}
                menuOpen={false}
                setMenuOpen={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Saved Audiobooks ── */}
      {showSection('audiobooks') && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" /> Saved Audiobooks
            {savedAudiobooks.length > 0 && <span className="text-sm font-normal text-gray-400">({savedAudiobooks.length})</span>}
          </h2>
          {savedAudiobooks.length === 0 ? (
            <div className="py-10 text-center bg-gray-900/30 rounded-2xl border border-gray-800">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No saved audiobooks yet.</p>
            </div>
          ) : (
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-3 space-y-1">
              {savedAudiobooks.map(track => (
                <SavedTrackRow key={track.id} track={track} onPlay={() => playTrack(track)} onUnsave={() => pl.unsaveTrack(track.track_id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Saved Performances ── */}
      {showSection('performances') && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" /> Saved Performances
            {savedPerformances.length > 0 && <span className="text-sm font-normal text-gray-400">({savedPerformances.length})</span>}
          </h2>
          {savedPerformances.length === 0 ? (
            <div className="py-10 text-center bg-gray-900/30 rounded-2xl border border-gray-800">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No saved performances yet.</p>
            </div>
          ) : (
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-3 space-y-1">
              {savedPerformances.map(track => (
                <SavedTrackRow key={track.id} track={track} onPlay={() => playTrack(track)} onUnsave={() => pl.unsaveTrack(track.track_id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Purchases ── */}
      {showSection('purchases') && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#00D9FF]" /> My Purchases
            {purchases.length > 0 && <span className="text-sm font-normal text-gray-400">({purchases.length})</span>}
          </h2>
          {purchases.length === 0 ? (
            <div className="py-10 text-center bg-gray-900/30 rounded-2xl border border-gray-800">
              <ShoppingBag className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No purchases yet.</p>
              <p className="text-gray-500 text-sm mt-1">Books, audiobooks and courses you buy will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {purchases.slice(0, activeTab === 'all' ? 8 : 9999).map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/products/${item.product_id}`)}
                  className="bg-gray-900/40 border border-gray-800 hover:border-[#9D4EDD]/30 rounded-2xl overflow-hidden cursor-pointer group transition-all"
                >
                  <div className="aspect-square bg-gradient-to-br from-[#9D4EDD]/20 to-[#00D9FF]/10 overflow-hidden">
                    {item.product?.cover_url
                      ? <img src={item.product.cover_url} alt={item.product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate">{item.product?.title ?? 'Unknown'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500 capitalize">{item.product?.product_type ?? item.access_type}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00F5A0]/10 text-[#00F5A0] font-medium">Owned</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'all' && purchases.length > 8 && (
            <button onClick={() => setActiveTab('purchases')} className="w-full pt-1 text-sm text-[#B794F4] hover:text-[#C9B3F5] text-center transition-colors">
              See all {purchases.length} purchases →
            </button>
          )}
        </section>
      )}

      {/* ── Create Playlist Modal ── */}
      <PlaylistCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onConfirm={async (name, desc, pub) => {
          await pl.createPlaylist(name, desc, pub);
        }}
      />

      {/* Rename modal */}
      {renameTarget && (
        <PlaylistCreateModal
          open={!!renameTarget}
          title="Rename Playlist"
          initial={{ name: renameTarget.name, description: renameTarget.description ?? '' }}
          onClose={() => setRenameTarget(null)}
          onConfirm={async (name, desc) => {
            await pl.renamePlaylist(renameTarget.id, name, desc);
            setRenameTarget(null);
          }}
        />
      )}
    </div>
  );
}
