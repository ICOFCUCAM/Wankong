import React, { useRef, useState } from 'react';
import { Upload, FileAudio, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { addChapter } from './AudiobookService';

interface AudiobookChapterUploaderProps {
  audiobookId: string;
  existingChapterCount: number;
  onSuccess: () => void;
}

type UploadStatus = 'idle' | 'reading' | 'uploading' | 'saving' | 'done' | 'error';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudiobookChapterUploader({
  audiobookId,
  existingChapterCount,
  onSuccess,
}: AudiobookChapterUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenAudioRef = useRef<HTMLAudioElement>(null);

  const [chapterTitle, setChapterTitle] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const chapterNum = existingChapterCount + 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMessage('Please select a valid audio file.');
      return;
    }

    setAudioFile(file);
    setErrorMessage('');
    setStatus('reading');

    // Determine duration using a hidden audio element
    const objectUrl = URL.createObjectURL(file);
    const audio = hiddenAudioRef.current ?? new Audio();
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      setAudioDuration(Math.round(audio.duration));
      setStatus('idle');
      URL.revokeObjectURL(objectUrl);
    };
    audio.onerror = () => {
      setErrorMessage('Could not read audio metadata. The file may be corrupted.');
      setStatus('error');
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audioFile) {
      setErrorMessage('Please select an audio file.');
      return;
    }
    if (!chapterTitle.trim()) {
      setErrorMessage('Please enter a chapter title.');
      return;
    }

    setStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Upload audio file to Supabase Storage
      const storagePath = `${audiobookId}/chapter_${chapterNum}.mp3`;

      // Simulate progress via a controlled upload
      setUploadProgress(10);

      const { error: storageError } = await supabase.storage
        .from('audiobook-audio')
        .upload(storagePath, audioFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: audioFile.type,
        });

      if (storageError) throw storageError;

      setUploadProgress(75);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audiobook-audio')
        .getPublicUrl(storagePath);

      const audioUrl = urlData.publicUrl;

      setUploadProgress(85);
      setStatus('saving');

      // Save chapter record to DB
      await addChapter({
        audiobook_id: audiobookId,
        chapter_num: chapterNum,
        title: chapterTitle.trim(),
        audio_url: audioUrl,
        duration_s: audioDuration,
      });

      setUploadProgress(100);
      setStatus('done');

      // Reset form after brief delay
      setTimeout(() => {
        setChapterTitle('');
        setAudioFile(null);
        setAudioDuration(0);
        setUploadProgress(0);
        setStatus('idle');
        onSuccess();
      }, 1200);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setStatus('error');
      setUploadProgress(0);
    }
  };

  const isWorking = status === 'reading' || status === 'uploading' || status === 'saving';

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0B0814] rounded-2xl border border-white/10 p-6 space-y-5"
    >
      {/* Hidden audio element for duration probing */}
      <audio ref={hiddenAudioRef} className="hidden" />

      <div>
        <h2 className="text-lg font-bold text-white">
          Upload Chapter {chapterNum}
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Add the audio file for the next chapter of this audiobook.
        </p>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success state */}
      {status === 'done' && (
        <div className="flex flex-col items-center justify-center gap-3 py-8 bg-[#00F5A0]/5 border border-[#00F5A0]/30 rounded-xl">
          <CheckCircle size={36} className="text-[#00F5A0]" />
          <p className="text-[#00F5A0] font-semibold">Chapter uploaded successfully!</p>
        </div>
      )}

      {status !== 'done' && (
        <>
          {/* Chapter title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
              Chapter Title
            </label>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder={`Chapter ${chapterNum}: Enter title`}
              disabled={isWorking}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Audio file drop zone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
              Audio File
            </label>
            <div
              onClick={() => !isWorking && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                audioFile
                  ? 'border-[#00D9FF]/50 bg-[#00D9FF]/5'
                  : 'border-white/10 hover:border-[#00D9FF]/40 bg-white/2'
              } ${isWorking ? 'pointer-events-none opacity-60' : ''}`}
            >
              {audioFile ? (
                <div className="flex flex-col items-center gap-2 text-[#00D9FF]">
                  <FileAudio size={28} />
                  <p className="text-sm font-medium truncate max-w-full px-4">
                    {audioFile.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatFileSize(audioFile.size)}</span>
                    {audioDuration > 0 && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span>
                          {Math.floor(audioDuration / 60)}m{' '}
                          {audioDuration % 60}s
                        </span>
                      </>
                    )}
                    {status === 'reading' && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-[#00D9FF] animate-pulse">
                          Reading metadata…
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto mb-2 text-gray-500" />
                  <p className="text-sm text-gray-400">
                    Click to select an audio file
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    MP3, WAV, AAC, OGG and other audio formats
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isWorking}
              />
            </div>
          </div>

          {/* Upload progress */}
          {(status === 'uploading' || status === 'saving') && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>
                  {status === 'saving' ? 'Saving chapter record…' : 'Uploading audio…'}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isWorking || !audioFile || status === 'reading'}
            className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] hover:bg-[#00D9FF]/85 disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0814] font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
          >
            {isWorking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {status === 'uploading'
                  ? 'Uploading…'
                  : status === 'saving'
                  ? 'Saving…'
                  : 'Working…'}
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Chapter {chapterNum}
              </>
            )}
          </button>
        </>
      )}
    </form>
  );
}

export default AudiobookChapterUploader;
