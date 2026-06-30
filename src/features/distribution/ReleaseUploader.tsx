import React, { useRef, useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Music2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── ReleaseUploader ───────────────────────────────────────────
// Handles single-release upload: audio + artwork → distribution_releases.

interface ReleaseUploaderProps {
  artistId: string;
  onSuccess: (releaseId: string) => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface FileUploadState {
  file: File | null;
  status: UploadStatus;
  progress: UploadProgress;
  url: string | null;
  error: string | null;
}

const initState = (): FileUploadState => ({
  file: null,
  status: 'idle',
  progress: { loaded: 0, total: 0, percent: 0 },
  url: null,
  error: null,
});

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

async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
  onProgress: (p: UploadProgress) => void,
): Promise<string> {
  // Supabase JS v2 upload with progress via XMLHttpRequest fallback
  return new Promise(async (resolve, reject) => {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    // Use fetch upload — progress via XHR for better browser support
    const xhr = new XMLHttpRequest();
    const uploadUrl = `${(supabase as any).supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? '';

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress({ loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100) });
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        resolve(publicUrl);
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    const formData = new FormData();
    formData.append('', file, file.name);
    xhr.send(formData);
  });
}

export function ReleaseUploader({ artistId, onSuccess }: ReleaseUploaderProps) {
  const [releaseName, setReleaseName] = useState('');
  const [audio, setAudio] = useState<FileUploadState>(initState());
  const [artwork, setArtwork] = useState<FileUploadState>(initState());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);

  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudio({ ...initState(), file });
  }, []);

  const handleArtworkSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArtwork({ ...initState(), file });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!releaseName.trim()) { setSubmitError('Please enter a release name.'); return; }
    if (!audio.file) { setSubmitError('Please select an audio file.'); return; }
    if (!artwork.file) { setSubmitError('Please select an artwork file.'); return; }

    setSubmitError(null);
    setSubmitting(true);

    const timestamp = Date.now();
    const audioPath = `${artistId}/${timestamp}_${audio.file.name.replace(/\s+/g, '_')}`;
    const artworkPath = `${artistId}/${timestamp}_${artwork.file.name.replace(/\s+/g, '_')}`;

    // Upload audio
    setAudio((prev) => ({ ...prev, status: 'uploading' }));
    let audioUrl: string;
    try {
      audioUrl = await uploadToStorage('music_uploads', audioPath, audio.file!, (p) =>
        setAudio((prev) => ({ ...prev, progress: p })),
      );
      setAudio((prev) => ({ ...prev, status: 'done', url: audioUrl }));
    } catch (err: any) {
      setAudio((prev) => ({ ...prev, status: 'error', error: err.message }));
      setSubmitting(false);
      return;
    }

    // Upload artwork
    setArtwork((prev) => ({ ...prev, status: 'uploading' }));
    let artworkUrl: string;
    try {
      artworkUrl = await uploadToStorage('cover_artworks', artworkPath, artwork.file!, (p) =>
        setArtwork((prev) => ({ ...prev, progress: p })),
      );
      setArtwork((prev) => ({ ...prev, status: 'done', url: artworkUrl }));
    } catch (err: any) {
      setArtwork((prev) => ({ ...prev, status: 'error', error: err.message }));
      setSubmitting(false);
      return;
    }

    // Insert distribution release record
    const { data: release, error: insertErr } = await supabase
      .from('distribution_releases')
      .insert({
        artist_id: artistId,
        title: releaseName.trim(),
        audio_url: audioUrl,
        cover_url: artworkUrl,
        release_type: 'single',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertErr || !release) {
      setSubmitError(insertErr?.message ?? 'Failed to create release record.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess(release.id);
  }, [releaseName, audio, artwork, artistId, onSuccess]);

  const StatusIcon = ({ status }: { status: UploadStatus }) => {
    if (status === 'uploading') return <Loader2 size={16} className="animate-spin" style={{ color: '#00D9FF' }} />;
    if (status === 'done') return <CheckCircle2 size={16} style={{ color: '#00F5A0' }} />;
    if (status === 'error') return <XCircle size={16} style={{ color: '#FF6B00' }} />;
    return null;
  };

  return (
    <div
      className="w-full max-w-xl mx-auto rounded-2xl p-6"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h2 className="text-lg font-bold mb-5" style={{ color: '#fff' }}>
        Upload Release
      </h2>

      {/* Release name */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Release Name
        </label>
        <input
          type="text"
          value={releaseName}
          onChange={(e) => setReleaseName(e.target.value)}
          placeholder="Enter track or EP title…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#00D9FF')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
        />
      </div>

      {/* Audio upload */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Audio File (WAV / FLAC / MP3)
        </label>
        <div
          className="relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl cursor-pointer transition-all"
          style={{
            background: audio.file ? 'rgba(0,217,255,0.06)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${audio.file ? '#00D9FF' : 'rgba(255,255,255,0.12)'}`,
          }}
          onClick={() => audioInputRef.current?.click()}
        >
          <input
            ref={audioInputRef}
            type="file"
            accept=".wav,.flac,.mp3,audio/*"
            className="hidden"
            onChange={handleAudioSelect}
          />
          <Music2 size={28} style={{ color: audio.file ? '#00D9FF' : '#6b7280' }} />
          {audio.file ? (
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: '#00D9FF' }}>
                {audio.file.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(audio.file.size / 1_048_576).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-400">Click to select audio file</p>
              <p className="text-xs text-gray-600 mt-0.5">WAV, FLAC, or MP3</p>
            </div>
          )}
        </div>
        {audio.status !== 'idle' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1">
              <ProgressBar percent={audio.progress.percent} color="#00D9FF" />
            </div>
            <StatusIcon status={audio.status} />
            <span className="text-xs text-gray-500">{audio.progress.percent}%</span>
          </div>
        )}
        {audio.error && <p className="text-xs mt-1" style={{ color: '#FF6B00' }}>{audio.error}</p>}
      </div>

      {/* Artwork upload */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Cover Artwork (JPG / PNG)
        </label>
        <div
          className="relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl cursor-pointer transition-all"
          style={{
            background: artwork.file ? 'rgba(157,78,221,0.06)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${artwork.file ? '#9D4EDD' : 'rgba(255,255,255,0.12)'}`,
          }}
          onClick={() => artworkInputRef.current?.click()}
        >
          <input
            ref={artworkInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={handleArtworkSelect}
          />
          {artwork.file && artwork.url === null ? (
            <img
              src={URL.createObjectURL(artwork.file)}
              alt="Artwork preview"
              className="w-24 h-24 object-cover rounded-lg"
            />
          ) : (
            <ImageIcon size={28} style={{ color: artwork.file ? '#9D4EDD' : '#6b7280' }} />
          )}
          {artwork.file ? (
            <p className="text-sm font-medium" style={{ color: '#9D4EDD' }}>
              {artwork.file.name}
            </p>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-400">Click to select artwork</p>
              <p className="text-xs text-gray-600 mt-0.5">JPG or PNG, min 3000×3000 recommended</p>
            </div>
          )}
        </div>
        {artwork.status !== 'idle' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1">
              <ProgressBar percent={artwork.progress.percent} color="#9D4EDD" />
            </div>
            <StatusIcon status={artwork.status} />
            <span className="text-xs text-gray-500">{artwork.progress.percent}%</span>
          </div>
        )}
        {artwork.error && <p className="text-xs mt-1" style={{ color: '#FF6B00' }}>{artwork.error}</p>}
      </div>

      {submitError && (
        <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ color: '#FF6B00', background: 'rgba(255,107,0,0.1)' }}>
          {submitError}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: submitting ? 'rgba(0,217,255,0.3)' : '#00D9FF',
          color: '#0B0814',
          opacity: submitting ? 0.7 : 1,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload size={16} />
            Upload Release
          </>
        )}
      </button>
    </div>
  );
}
