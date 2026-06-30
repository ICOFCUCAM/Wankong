import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, Shuffle, MoreVertical, Trash2, ArrowUp, ArrowDown,
  Music, Pause, ChevronLeft, Edit2,
} from 'lucide-react';
import { usePlaylist, Playlist, PlaylistTrack } from '@/hooks/usePlaylist';
import { usePlayer } from '@/components/GlobalPlayer';
import PlaylistCreateModal from './PlaylistCreateModal';

function fmt(sec: number | null): string {
  if (!sec) return '--:--';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

const CONTENT_ICONS: Record<string, string> = {
  music: '🎵', video: '🎬', audiobook: '🎧', podcast: '🎙️', course: '📖', competition: '🏆',
};

interface Props {
  playlist: Playlist;
  onBack:   () => void;
  onDelete: (id: string) => void;
}

export default function PlaylistView({ playlist, onBack, onDelete }: Props) {
  const { getPlaylistTracks, removeTrackFromPlaylist, reorderTracks, renamePlaylist, playPlaylist } = usePlaylist();
  const { currentTrack, isPlaying, togglePlay, shuffle, toggleShuffle } = usePlayer();

  const [tracks,      setTracks]      = useState<PlaylistTrack[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showRename,  setShowRename]  = useState(false);
  const [openMenu,    setOpenMenu]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getPlaylistTracks(playlist.id);
    setTracks(data);
    setLoading(false);
  }, [playlist.id, getPlaylistTracks]);

  useEffect(() => { load(); }, [load]);

  const isCurrentPlaylist = currentTrack && tracks.some(t => t.track_id === currentTrack.id);

  const handlePlay = (startIndex = 0) => {
    playPlaylist(tracks, startIndex);
  };

  const handleShuffle = () => {
    if (!shuffle) toggleShuffle();
    playPlaylist(tracks, 0, true);
  };

  const handleRemove = async (track: PlaylistTrack) => {
    const ok = await removeTrackFromPlaylist(playlist.id, track.track_id);
    if (ok) setTracks(prev => prev.filter(t => t.id !== track.id));
    setOpenMenu(null);
  };

  const moveTrack = async (idx: number, dir: -1 | 1) => {
    const newTracks = [...tracks];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newTracks.length) return;
    [newTracks[idx], newTracks[targetIdx]] = [newTracks[targetIdx], newTracks[idx]];
    setTracks(newTracks);
    await reorderTracks(playlist.id, newTracks);
  };

  const handleRename = async (name: string, description: string) => {
    await renamePlaylist(playlist.id, name, description);
    setShowRename(false);
  };

  const totalDuration = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Library
      </button>

      {/* Playlist header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Cover */}
        <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#9D4EDD] to-purple-700 flex items-center justify-center shrink-0 overflow-hidden">
          {playlist.cover_url
            ? <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
            : <Music className="w-16 h-16 text-white/30" />}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              {playlist.is_editorial && (
                <span className="inline-block px-2 py-0.5 text-xs bg-[#9D4EDD]/20 text-[#C9B3F5] border border-[#9D4EDD]/30 rounded-full mb-1">Editorial</span>
              )}
              <h1 className="text-2xl font-bold text-white truncate">{playlist.name}</h1>
              {playlist.description && <p className="text-gray-400 text-sm mt-1">{playlist.description}</p>}
            </div>
            {!playlist.is_editorial && (
              <button
                onClick={() => setShowRename(true)}
                className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors shrink-0 mt-1"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-sm text-gray-400">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}{totalDuration > 0 ? ` · ${fmt(totalDuration)} total` : ''}
            {!playlist.is_editorial && ` · ${playlist.is_public ? 'Public' : 'Private'}`}
          </p>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => isCurrentPlaylist && isPlaying ? togglePlay() : handlePlay(0)}
              disabled={!tracks.length}
              className="flex items-center gap-2 bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {isCurrentPlaylist && isPlaying
                ? <><Pause className="w-4 h-4" /> Pause</>
                : <><Play  className="w-4 h-4" /> Play</>}
            </button>
            <button
              onClick={handleShuffle}
              disabled={!tracks.length}
              className={`flex items-center gap-2 font-medium px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-40 ${shuffle ? 'bg-[#9D4EDD]/20 border-[#9D4EDD]/50 text-[#C9B3F5]' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'}`}
            >
              <Shuffle className="w-4 h-4" /> Shuffle
            </button>
            {!playlist.is_editorial && (
              <button
                onClick={() => onDelete(playlist.id)}
                className="p-2.5 text-gray-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                title="Delete playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl animate-pulse">
              <div className="w-10 h-10 bg-white/5 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/5 rounded w-2/3" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : tracks.length === 0 ? (
          <div className="py-16 text-center">
            <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">This playlist is empty.</p>
            <p className="text-gray-500 text-sm mt-1">Add tracks using the + button on any content card.</p>
          </div>
        ) : (
          tracks.map((track, idx) => {
            const isActive = currentTrack?.id === track.track_id;
            return (
              <div
                key={track.id}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-[#9D4EDD]/10' : 'hover:bg-white/5'}`}
              >
                {/* Index / play indicator */}
                <div className="w-7 text-center shrink-0">
                  {isActive && isPlaying
                    ? <div className="flex gap-0.5 items-end justify-center h-4">
                        {[3,5,4].map((h, i) => <div key={i} className="w-0.5 bg-[#00D9FF] rounded-full animate-pulse" style={{ height: h*2.5+'px', animationDelay: i*90+'ms' }} />)}
                      </div>
                    : <span className="text-gray-500 text-xs group-hover:hidden">{idx + 1}</span>}
                  <button
                    onClick={() => handlePlay(idx)}
                    className={`hidden group-hover:block ${isActive ? '!block' : ''} text-white`}
                    style={{ display: isActive && !isPlaying ? 'block' : undefined }}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Art */}
                <div className="w-10 h-10 rounded-lg bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center">
                  {track.cover_url
                    ? <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg">{CONTENT_ICONS[track.content_type] ?? '🎵'}</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-[#00D9FF]' : 'text-white'}`}>{track.title}</p>
                  {track.artist && <p className="text-xs text-gray-400 truncate">{track.artist}</p>}
                </div>

                {/* Duration */}
                <span className="text-xs text-gray-500 shrink-0 hidden sm:block">{fmt(track.duration)}</span>

                {/* Reorder (non-editorial only) */}
                {!playlist.is_editorial && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => moveTrack(idx, -1)} disabled={idx === 0}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-20 rounded transition-colors">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveTrack(idx, 1)} disabled={idx === tracks.length - 1}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-20 rounded transition-colors">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Track menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === track.id ? null : track.id)}
                    className="p-1.5 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white/10"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenu === track.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-8 z-20 w-40 bg-[#0B0814] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
                        <button
                          onClick={() => handlePlay(idx)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5" /> Play from here
                        </button>
                        {!playlist.is_editorial && (
                          <button
                            onClick={() => handleRemove(track)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove from playlist
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rename modal */}
      <PlaylistCreateModal
        open={showRename}
        title="Rename Playlist"
        initial={{ name: playlist.name, description: playlist.description ?? '' }}
        onClose={() => setShowRename(false)}
        onConfirm={handleRename}
      />
    </div>
  );
}
