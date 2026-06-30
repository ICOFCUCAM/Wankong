import React, { useRef, useState, useCallback } from 'react';
import {
  PlusCircle,
  Trash2,
  Upload,
  Music2,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  GripVertical,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── AlbumUploader ─────────────────────────────────────────────
// Multi-track album upload: up to 50 tracks + artwork → distribution_releases.

interface AlbumUploaderProps {
  artistId: string;
  onSuccess: () => void;
}

interface TrackEntry {
  id: string; // local uuid for keying
  title: string;
  trackNumber: number;
  file: File | null;
  uploadProgress: number;
  uploadStatus: 'idle' | 'uploading' | 'done' | 'error';
  audioUrl: string | null;
  error: string | null;
}

const MAX_TRACKS = 50;

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeTrack(num: number): TrackEntry {
  return {
    id: uid(),
    title: '',
    trackNumber: num,
    file: null,
    uploadProgress: 0,
    uploadStatus: 'idle',
    audioUrl: null,
    error: null,
  };
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}

async function xhrUpload(
  bucket: string,
  path: string,
  file: File,
  onProgress: (p: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? '';
    const uploadUrl = `${(supabase as any).supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));

    const form = new FormData();
    form.append('', file, file.name);
    xhr.send(form);
  });
}

export function AlbumUploader({ artistId, onSuccess }: AlbumUploaderProps) {
  const [albumTitle, setAlbumTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkStatus, setArtworkStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [artworkProgress, setArtworkProgress] = useState(0);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);

  const [tracks, setTracks] = useState<TrackEntry[]>([makeTrack(1)]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const artworkRef = useRef<HTMLInputElement>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Track list management ─────────────────────────────────────

  const addTrack = useCallback(() => {
    setTracks((prev) => {
      if (prev.length >= MAX_TRACKS) return prev;
      return [...prev, makeTrack(prev.length + 1)];
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    setTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      return filtered.map((t, i) => ({ ...t, trackNumber: i + 1 }));
    });
  }, []);

  const updateTrack = useCallback((id: string, updates: Partial<TrackEntry>) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const handleTrackFile = useCallback(
    (id: string, file: File) => {
      updateTrack(id, { file, uploadStatus: 'idle', uploadProgress: 0, audioUrl: null, error: null });
    },
    [updateTrack],
  );

  // ── Upload all track audio files ──────────────────────────────

  const uploadAllTracks = useCallback(async (): Promise<TrackEntry[]> => {
    const timestamp = Date.now();
    const results: TrackEntry[] = [...tracks];

    for (let i = 0; i < results.length; i++) {
      const track = results[i];
      if (!track.file) continue;
      if (track.uploadStatus === 'done' && track.audioUrl) continue;

      updateTrack(track.id, { uploadStatus: 'uploading' });
      const path = `${artistId}/albums/${timestamp}/track_${track.trackNumber}_${track.file.name.replace(/\s+/g, '_')}`;

      try {
        const url = await xhrUpload('music_uploads', path, track.file, (p) =>
          updateTrack(track.id, { uploadProgress: p }),
        );
        updateTrack(track.id, { uploadStatus: 'done', audioUrl: url, uploadProgress: 100 });
        results[i] = { ...results[i], uploadStatus: 'done', audioUrl: url };
      } catch (err: any) {
        updateTrack(track.id, { uploadStatus: 'error', error: err.message });
        results[i] = { ...results[i], uploadStatus: 'error', error: err.message };
      }
    }

    return results;
  }, [tracks, artistId, updateTrack]);

  // ── Submit ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!albumTitle.trim()) { setSubmitError('Please enter an album title.'); return; }
    if (tracks.some((t) => !t.title.trim())) { setSubmitError('All tracks need a title.'); return; }
    if (tracks.some((t) => !t.file)) { setSubmitError('All tracks need an audio file.'); return; }

    setSubmitError(null);
    setSubmitting(true);

    const timestamp = Date.now();

    // Upload artwork
    let coverUrl: string | null = null;
    if (artworkFile) {
      setArtworkStatus('uploading');
      const artPath = `${artistId}/albums/${timestamp}_cover_${artworkFile.name.replace(/\s+/g, '_')}`;
      try {
        coverUrl = await xhrUpload('cover_artworks', artPath, artworkFile, setArtworkProgress);
        setArtworkStatus('done');
        setArtworkUrl(coverUrl);
      } catch (err: any) {
        setArtworkStatus('error');
        setSubmitError(`Artwork upload failed: ${err.message}`);
        setSubmitting(false);
        return;
      }
    }

    // Upload all track audio files
    const uploadedTracks = await uploadAllTracks();
    const failed = uploadedTracks.filter((t) => t.file && t.uploadStatus === 'error');
    if (failed.length > 0) {
      setSubmitError(`${failed.length} track(s) failed to upload. Please retry.`);
      setSubmitting(false);
      return;
    }

    // Insert distribution release record
    const { data: release, error: releaseErr } = await supabase
      .from('distribution_releases')
      .insert({
        user_id: artistId,
        title: albumTitle.trim(),
        cover_url: coverUrl,
        release_type: 'album',
        release_date: releaseDate || null,
        status: 'pending',
        track_count: uploadedTracks.length,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (releaseErr || !release) {
      setSubmitError(releaseErr?.message ?? 'Failed to create album record.');
      setSubmitting(false);
      return;
    }

    // Insert individual tracks linked to the release
    const trackInserts = uploadedTracks.map((t) => ({
      release_id: release.id,
      creator_id: artistId,
      title: t.title.trim(),
      track_number: t.trackNumber,
      audio_url: t.audioUrl,
      created_at: new Date().toISOString(),
    }));

    const { error: tracksErr } = await supabase.from('tracks').insert(trackInserts);

    if (tracksErr) {
      console.error('AlbumUploader track insert error:', tracksErr);
      // Non-fatal: the release is created, continue
    }

    setSubmitting(false);
    onSuccess();
  }, [albumTitle, releaseDate, artworkFile, tracks, artistId, uploadAllTracks, onSuccess]);

  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-2xl p-6"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
    >
      <h2 className="text-lg font-bold mb-6">Upload Album</h2>

      {/* Album Title */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Album Title
        </label>
        <input
          type="text"
          value={albumTitle}
          onChange={(e) => setAlbumTitle(e.target.value)}
          placeholder="Enter album title…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
        />
      </div>

      {/* Release Date */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Release Date
        </label>
        <input
          type="date"
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
        />
      </div>

      {/* Artwork */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Album Artwork (JPG / PNG)
        </label>
        <div
          className="flex items-center gap-4 p-4 rounded-xl cursor-pointer"
          style={{
            background: artworkFile ? 'rgba(157,78,221,0.06)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${artworkFile ? '#9D4EDD' : 'rgba(255,255,255,0.12)'}`,
          }}
          onClick={() => artworkRef.current?.click()}
        >
          <input
            ref={artworkRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)}
          />
          {artworkFile ? (
            <img
              src={URL.createObjectURL(artworkFile)}
              alt="Album cover"
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          ) : (
            <ImageIcon size={32} style={{ color: '#6b7280' }} />
          )}
          <div>
            <p className="text-sm" style={{ color: artworkFile ? '#9D4EDD' : '#9ca3af' }}>
              {artworkFile ? artworkFile.name : 'Click to select artwork'}
            </p>
            {artworkFile && (
              <p className="text-xs text-gray-500">{(artworkFile.size / 1_048_576).toFixed(1)} MB</p>
            )}
          </div>
        </div>
        {artworkStatus !== 'idle' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1"><ProgressBar percent={artworkProgress} color="#9D4EDD" /></div>
            <span className="text-xs text-gray-500">{artworkProgress}%</span>
            {artworkStatus === 'done' && <CheckCircle2 size={14} style={{ color: '#00F5A0' }} />}
            {artworkStatus === 'error' && <XCircle size={14} style={{ color: '#FF6B00' }} />}
          </div>
        )}
      </div>

      {/* Track list */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Tracks ({tracks.length}/{MAX_TRACKS})
          </label>
          <button
            type="button"
            onClick={addTrack}
            disabled={tracks.length >= MAX_TRACKS}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: tracks.length >= MAX_TRACKS ? 'rgba(255,255,255,0.05)' : 'rgba(0,217,255,0.12)',
              color: tracks.length >= MAX_TRACKS ? '#6b7280' : '#00D9FF',
            }}
          >
            <PlusCircle size={14} />
            Add Track
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <GripVertical size={16} className="text-gray-600 shrink-0" />
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'rgba(157,78,221,0.2)', color: '#9D4EDD' }}
                >
                  {track.trackNumber}
                </span>
                <input
                  type="text"
                  value={track.title}
                  onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                  placeholder={`Track ${track.trackNumber} title…`}
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeTrack(track.id)}
                  disabled={tracks.length === 1}
                  className="p-1.5 rounded-lg transition-colors shrink-0"
                  style={{
                    color: tracks.length === 1 ? '#374151' : '#FF6B00',
                    background: 'transparent',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* File picker */}
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                style={{
                  background: track.file ? 'rgba(0,217,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px dashed ${track.file ? '#00D9FF40' : 'rgba(255,255,255,0.08)'}`,
                }}
                onClick={() => fileRefs.current[track.id]?.click()}
              >
                <input
                  ref={(el) => { fileRefs.current[track.id] = el; }}
                  type="file"
                  accept=".wav,.flac,.mp3,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleTrackFile(track.id, f);
                  }}
                />
                <Music2 size={16} style={{ color: track.file ? '#00D9FF' : '#6b7280' }} />
                <span className="text-xs truncate" style={{ color: track.file ? '#00D9FF' : '#6b7280' }}>
                  {track.file ? track.file.name : 'Select audio file…'}
                </span>
                {track.uploadStatus === 'done' && <CheckCircle2 size={14} className="ml-auto shrink-0" style={{ color: '#00F5A0' }} />}
                {track.uploadStatus === 'error' && <XCircle size={14} className="ml-auto shrink-0" style={{ color: '#FF6B00' }} />}
                {track.uploadStatus === 'uploading' && <Loader2 size={14} className="ml-auto shrink-0 animate-spin" style={{ color: '#00D9FF' }} />}
              </div>

              {track.uploadStatus === 'uploading' && (
                <div className="mt-2">
                  <ProgressBar percent={track.uploadProgress} color="#00D9FF" />
                </div>
              )}
              {track.error && (
                <p className="text-xs mt-1" style={{ color: '#FF6B00' }}>{track.error}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ color: '#FF6B00', background: 'rgba(255,107,0,0.1)' }}>
          {submitError}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-2"
        style={{
          background: submitting ? 'rgba(0,217,255,0.3)' : '#00D9FF',
          color: '#0B0814',
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" /> Uploading Album…</>
        ) : (
          <><Upload size={16} /> Submit Album</>
        )}
      </button>
    </div>
  );
}
