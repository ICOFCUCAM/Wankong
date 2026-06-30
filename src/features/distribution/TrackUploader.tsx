import React, { useRef, useState, useCallback } from 'react';
import { Upload, Music2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── TrackUploader ─────────────────────────────────────────────
// Single track uploader: fields + audio → 'tracks' table.

interface TrackUploaderProps {
  artistId: string;
  onSuccess: (trackId: string) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

const GENRES = [
  'Afrobeats', 'Afro-Pop', 'Afro-Soul', 'Amapiano', 'Bongo Flava', 'Highlife',
  'Hip-Hop', 'R&B', 'Gospel', 'Jazz', 'Blues', 'Electronic', 'Pop',
  'Reggae', 'Dancehall', 'World', 'Classical', 'Other',
];

const KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
];

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}

const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors";
const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
} as React.CSSProperties;

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

export function TrackUploader({ artistId, onSuccess }: TrackUploaderProps) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setFormError('Track title is required.'); return; }
    if (!audioFile) { setFormError('Please select an audio file.'); return; }

    setFormError(null);
    setSubmitting(true);

    const timestamp = Date.now();
    const path = `${artistId}/${timestamp}_${audioFile.name.replace(/\s+/g, '_')}`;

    setUploadStatus('uploading');
    let audioUrl: string;
    try {
      audioUrl = await xhrUpload('music_uploads', path, audioFile, setUploadProgress);
      setUploadStatus('done');
    } catch (err: any) {
      setUploadStatus('error');
      setUploadError(err.message);
      setSubmitting(false);
      return;
    }

    // Insert into 'tracks' table
    const { data: track, error: insertErr } = await supabase
      .from('tracks')
      .insert({
        artist_id: artistId,
        title: title.trim(),
        genre: genre || null,
        bpm: bpm ? Number(bpm) : null,
        audio_url: audioUrl,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertErr || !track) {
      setFormError(insertErr?.message ?? 'Failed to save track record.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess(track.id);
  }, [title, genre, bpm, key, audioFile, artistId, onSuccess]);

  return (
    <div
      className="w-full max-w-lg mx-auto rounded-2xl p-6"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
    >
      <h2 className="text-lg font-bold mb-6">Upload Single Track</h2>

      {/* Track title */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Track Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Track name…"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Genre */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Genre
        </label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className={inputClass}
          style={{ ...inputStyle, appearance: 'none' }}
        >
          <option value="">Select genre…</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* BPM + Key */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
            BPM
          </label>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            placeholder="e.g. 120"
            min="40"
            max="300"
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
            Key
          </label>
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className={inputClass}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            <option value="">Select key…</option>
            {KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audio file */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Audio File (WAV / FLAC / MP3) *
        </label>
        <div
          className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
          style={{
            background: audioFile ? 'rgba(0,217,255,0.05)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${audioFile ? '#00D9FF' : 'rgba(255,255,255,0.12)'}`,
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".wav,.flac,.mp3,audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Music2 size={32} style={{ color: audioFile ? '#00D9FF' : '#4b5563' }} />
          {audioFile ? (
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: '#00D9FF' }}>
                {audioFile.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(audioFile.size / 1_048_576).toFixed(1)} MB · Click to change
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-400">Click to select audio file</p>
              <p className="text-xs text-gray-600 mt-0.5">WAV, FLAC, or MP3 supported</p>
            </div>
          )}
        </div>

        {uploadStatus !== 'idle' && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar percent={uploadProgress} color="#00D9FF" />
              </div>
              {uploadStatus === 'uploading' && (
                <Loader2 size={14} className="animate-spin shrink-0" style={{ color: '#00D9FF' }} />
              )}
              {uploadStatus === 'done' && (
                <CheckCircle2 size={14} className="shrink-0" style={{ color: '#00F5A0' }} />
              )}
              {uploadStatus === 'error' && (
                <XCircle size={14} className="shrink-0" style={{ color: '#FF6B00' }} />
              )}
              <span className="text-xs text-gray-500 shrink-0">{uploadProgress}%</span>
            </div>
            {uploadError && (
              <p className="text-xs" style={{ color: '#FF6B00' }}>{uploadError}</p>
            )}
          </div>
        )}
      </div>

      {formError && (
        <p
          className="text-sm mb-4 px-3 py-2 rounded-lg"
          style={{ color: '#FF6B00', background: 'rgba(255,107,0,0.1)' }}
        >
          {formError}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: submitting ? 'rgba(0,217,255,0.35)' : '#00D9FF',
          color: '#0B0814',
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" /> Uploading…</>
        ) : (
          <><Upload size={16} /> Upload Track</>
        )}
      </button>
    </div>
  );
}
