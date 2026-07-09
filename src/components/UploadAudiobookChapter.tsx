import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Headphones, Loader2, CheckCircle, AlertCircle, Music } from 'lucide-react';

interface UploadAudiobookChapterProps {
  audiobookId: string;
  chapterNum: number;
  onSuccess: () => void;
}

// Detect audio duration from a File object
function getDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
      const dur = isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(dur);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
    audio.src = url;
    audio.load();
  });
}

// Format seconds as mm:ss
function formatDuration(secs: number): string {
  if (!secs || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

const UploadAudiobookChapter: React.FC<UploadAudiobookChapterProps> = ({
  audiobookId,
  chapterNum,
  onSuccess,
}) => {
  const [chapterTitle, setChapterTitle] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setDetectedDuration(0);
    // Auto-detect duration
    const dur = await getDuration(file);
    setDetectedDuration(dur);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!chapterTitle.trim()) return setError('Chapter title is required.');
    if (!audioFile) return setError('Please select an audio file.');

    setUploading(true);
    setProgress(0);

    try {
      // Build storage path: {audiobookId}/chapter_{chapterNum}.mp3
      const ext = audioFile.name.split('.').pop() ?? 'mp3';
      const storagePath = `${audiobookId}/chapter_${chapterNum}.${ext}`;

      // Upload to 'audiobook-audio' bucket via XHR for progress tracking
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const supabaseUrl: string = (supabase as any).supabaseUrl;
      const supabaseKey: string = (supabase as any).supabaseKey;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', ev => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            resolve();
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

        const url = `${supabaseUrl}/storage/v1/object/audiobook-audio/${storagePath}`;
        xhr.open('POST', url);
        if (accessToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        } else {
          xhr.setRequestHeader('apikey', supabaseKey);
          xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
        }
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.setRequestHeader('Content-Type', audioFile.type || 'audio/mpeg');
        xhr.send(audioFile);
      });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audiobook-audio')
        .getPublicUrl(storagePath);

      // Insert into 'audiobook_chapters' (audiobook_id, chapter_num, title, audio_url, duration_s)
      const { error: insertErr } = await supabase.from('audiobook_chapters').insert({
        audiobook_id: audiobookId,
        chapter_num: chapterNum,
        title: chapterTitle.trim(),
        audio_url: urlData.publicUrl,
        duration_s: Math.round(detectedDuration),
      });

      if (insertErr) throw insertErr;

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-[#120C22] rounded-2xl">
        <CheckCircle className="w-10 h-10 text-[#00F5A0]" />
        <p className="text-white font-semibold">Chapter {chapterNum} uploaded successfully!</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#120C22] rounded-2xl p-6 flex flex-col gap-5 w-full max-w-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Headphones className="w-6 h-6 text-[#00D9FF]" />
        <div>
          <h2 className="text-white text-lg font-bold leading-tight">Upload Chapter</h2>
          <span className="text-[#00D9FF] text-xs font-semibold tracking-wider uppercase">
            Chapter {chapterNum}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Chapter title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Chapter Title *</label>
        <input
          value={chapterTitle}
          onChange={e => setChapterTitle(e.target.value)}
          placeholder={`e.g. Chapter ${chapterNum}: The Beginning`}
          required
          className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors text-sm"
        />
      </div>

      {/* Audio file — accept audio/* */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Audio File *</label>
        <div
          onClick={() => audioInputRef.current?.click()}
          className="relative border-2 border-dashed border-[#2d3a5a] hover:border-[#00D9FF] rounded-xl p-5 cursor-pointer transition-colors"
        >
          {audioFile ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00D9FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5 text-[#00D9FF]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                {/* filename */}
                <span className="text-white text-sm font-medium truncate">{audioFile.name}</span>
                {/* file size */}
                <span className="text-gray-400 text-xs">{formatFileSize(audioFile.size)}</span>
                {/* detected duration mm:ss */}
                {detectedDuration > 0 && (
                  <span className="text-[#00F5A0] text-xs">
                    Duration: {formatDuration(detectedDuration)}
                  </span>
                )}
                <span className="text-[#00D9FF] text-xs">Click to change</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3">
              <Upload className="w-8 h-8 text-gray-500" />
              <span className="text-gray-400 text-sm">Click to upload audio</span>
              <span className="text-gray-600 text-xs">MP3, WAV, AAC, FLAC, OGG, M4A</span>
            </div>
          )}
        </div>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioChange}
          className="hidden"
        />
      </div>

      {/* Upload progress (0-100%) */}
      {uploading && (
        <div className="flex flex-col gap-2 bg-[#0B0814] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Uploading audio...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-[#2d3a5a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00D9FF] rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        type="submit"
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] hover:bg-[#00b8d9] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0814] font-bold py-3 rounded-xl transition-colors text-sm"
      >
        {uploading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Uploading {progress > 0 ? `${progress}%` : '...'}</>
        ) : (
          <><Upload className="w-5 h-5" /> Upload Chapter</>
        )}
      </button>
    </form>
  );
};

export default UploadAudiobookChapter;
