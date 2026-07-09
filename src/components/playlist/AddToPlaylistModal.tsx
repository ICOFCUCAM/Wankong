import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Music } from 'lucide-react';
import { usePlaylistContext } from '@/contexts/PlaylistContext';
import { usePlaylist, Playlist } from '@/hooks/usePlaylist';
import PlaylistCreateModal from './PlaylistCreateModal';

export default function AddToPlaylistModal() {
  const { pendingItem, closeAddToPlaylist, myPlaylists, refreshPlaylists } = usePlaylistContext();
  const { addTrackToPlaylist, createPlaylist } = usePlaylist();

  const [addedIds,     setAddedIds]     = useState<Set<string>>(new Set());
  const [showCreate,   setShowCreate]   = useState(false);
  const [feedback,     setFeedback]     = useState('');

  useEffect(() => {
    if (pendingItem) setAddedIds(new Set());
  }, [pendingItem]);

  if (!pendingItem) return null;

  const handleAdd = async (playlist: Playlist) => {
    if (addedIds.has(playlist.id)) return;
    const ok = await addTrackToPlaylist(playlist.id, pendingItem);
    if (ok) {
      setAddedIds(prev => new Set([...prev, playlist.id]));
      setFeedback(`Added to "${playlist.name}"`);
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const handleCreateAndAdd = async (name: string, description: string, isPublic: boolean) => {
    const pl = await createPlaylist(name, description, isPublic);
    if (pl) {
      await addTrackToPlaylist(pl.id, pendingItem);
      setAddedIds(prev => new Set([...prev, pl.id]));
      setFeedback(`Added to "${pl.name}"`);
      await refreshPlaylists();
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAddToPlaylist} />

        <div className="relative w-full max-w-sm bg-[#0B0814] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">Add to Playlist</h2>
              <p className="text-xs text-gray-400 truncate mt-0.5">{pendingItem.title}</p>
            </div>
            <button onClick={closeAddToPlaylist} className="text-gray-500 hover:text-white ml-3 shrink-0 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback toast */}
          {feedback && (
            <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-emerald-400 text-sm">{feedback}</p>
            </div>
          )}

          {/* Create new playlist */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[#9D4EDD]/20 border border-[#9D4EDD]/30 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-[#B794F4]" />
            </div>
            <span className="text-white text-sm font-medium">Create new playlist</span>
          </button>

          {/* Playlist list */}
          <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {myPlaylists.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No playlists yet.</p>
                <p className="text-gray-500 text-xs mt-1">Create one above.</p>
              </div>
            ) : (
              myPlaylists.map(pl => {
                const added = addedIds.has(pl.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleAdd(pl)}
                    disabled={added}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors disabled:opacity-60"
                  >
                    {/* Cover */}
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {pl.cover_url
                        ? <img src={pl.cover_url} alt="" className="w-full h-full object-cover" />
                        : <Music className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-medium truncate">{pl.name}</p>
                      <p className="text-gray-400 text-xs">{pl.track_count} track{pl.track_count !== 1 ? 's' : ''}</p>
                    </div>
                    {added && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      <PlaylistCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onConfirm={handleCreateAndAdd}
      />
    </>
  );
}
