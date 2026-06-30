import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { usePlaylist, Playlist, PlaylistItemInput } from '@/hooks/usePlaylist';

// ── Item shape passed to openAddToPlaylist ────────────────────────────────────

export interface AddToPlaylistItem extends PlaylistItemInput {}

// ── Context ───────────────────────────────────────────────────────────────────

interface PlaylistContextValue {
  myPlaylists:        Playlist[];
  editorialPlaylists: Playlist[];
  loading:            boolean;
  openAddToPlaylist:  (item: AddToPlaylistItem) => void;
  closeAddToPlaylist: () => void;
  pendingItem:        AddToPlaylistItem | null;
  refreshPlaylists:   () => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function usePlaylistContext(): PlaylistContextValue {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylistContext must be inside PlaylistProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const playlist = usePlaylist();
  const [pendingItem, setPendingItem] = useState<AddToPlaylistItem | null>(null);

  const openAddToPlaylist  = useCallback((item: AddToPlaylistItem) => setPendingItem(item), []);
  const closeAddToPlaylist = useCallback(() => setPendingItem(null), []);

  const value = useMemo<PlaylistContextValue>(() => ({
    myPlaylists:        playlist.myPlaylists,
    editorialPlaylists: playlist.editorialPlaylists,
    loading:            playlist.loading,
    openAddToPlaylist,
    closeAddToPlaylist,
    pendingItem,
    refreshPlaylists:   playlist.loadAll,
  }), [
    playlist.myPlaylists, playlist.editorialPlaylists, playlist.loading, playlist.loadAll,
    openAddToPlaylist, closeAddToPlaylist, pendingItem,
  ]);

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}
