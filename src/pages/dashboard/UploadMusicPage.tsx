import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Music, Upload, ImageIcon, CheckCircle, Loader2,
  AlertCircle, ChevronLeft, X,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const GENRES = [
  'Gospel', 'Afrobeats', 'Hip-Hop', 'RnB', 'Jazz', 'EDM',
  'Classical', 'Reggae', 'Highlife', 'Blues', 'Pop', 'Rock',
];

const LANGUAGES = [
  'English', 'French', 'Spanish', 'Arabic', 'Swahili',
  'Yoruba', 'Igbo', 'Hausa', 'Zulu', 'Portuguese',
];

const inputCls =
  'w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-3 text-white text-sm ' +
  'placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]/40 ' +
  'focus:border-[#9D4EDD]/40 transition-colors';

const selectCls = inputCls + ' cursor-pointer';

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateAudio(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['wav', 'flac', 'mp3'].includes(ext);
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Types ────────────────────────────────────────────────────────────────────

const LANG_CODES: Record<string, string> = {
  English: 'en', French: 'fr', Spanish: 'es', Arabic: 'ar',
  Swahili: 'sw', Yoruba: 'yo', Igbo: 'ig', Hausa: 'ha',
  Zulu: 'zu', Portuguese: 'pt',
};

interface FormState {
  title: string;
  artist: string;
  genre: string;
  language: string;
  explicit: boolean;
  release_date: string;
  lyrics: string;
  description: string;
  bpm: string;
  isrc: string;
  copyright_owner: string;
  composer: string;
  producer: string;
  label_name: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function UploadMusicPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const audioRef = useRef<HTMLInputElement>(null);
  const artRef   = useRef<HTMLInputElement>(null);

  const [audioFile,  setAudioFile]  = useState<File | null>(null);
  const [artFile,    setArtFile]    = useState<File | null>(null);
  const [artPreview, setArtPreview] = useState('');
  const [uploading,    setUploading]    = useState(false);
  const [draftSaving,  setDraftSaving]  = useState(false);
  const [done,         setDone]         = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);
  const [error,        setError]        = useState('');
  const [progress,     setProgress]     = useState(0);

  const [audioDragging, setAudioDragging] = useState(false);
  const [artDragging,   setArtDragging]   = useState(false);

  const [form, setForm] = useState<FormState>({
    title: '',
    artist: '',
    genre: '',
    language: 'English',
    explicit: false,
    release_date: '',
    lyrics: '',
    description: '',
    bpm: '',
    isrc: '',
    copyright_owner: '',
    composer: '',
    producer: '',
    label_name: '',
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  const handleAudioDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setAudioDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!validateAudio(file)) { setError('Only WAV, FLAC, or MP3 files are accepted.'); return; }
    setError('');
    setAudioFile(file);
  };

  const handleArtDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArtDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setArtFile(file);
    setArtPreview(URL.createObjectURL(file));
  };

  // ── Shared upload logic ───────────────────────────────────────────────────

  const doUploadAndSave = async (status: 'draft' | 'submitted') => {
    if (!form.title.trim()) { setError('Track title is required.'); return; }
    if (!audioFile)          { setError('Please upload an audio file.'); return; }
    if (!user)               { setError('You must be logged in.'); return; }

    if (status === 'submitted') {
      if (!form.artist.trim())  { setError('Artist name is required for submission.'); return; }
      if (!form.genre)          { setError('Genre is required for submission.'); return; }
      if (!form.release_date)   { setError('Release date is required for submission.'); return; }
      if (!artFile)             { setError('Cover art (3000 × 3000 px) is required for distribution.'); return; }
    }

    if (status === 'draft') setDraftSaving(true);
    else setUploading(true);
    setError('');
    setProgress(0);

    try {
      // Upload audio → bucket 'audio'
      const audioPath = `${user.id}/${Date.now()}_${audioFile.name}`;
      const { error: audioErr } = await supabase.storage
        .from('audio')
        .upload(audioPath, audioFile, { upsert: true });
      if (audioErr) throw audioErr;
      const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(audioPath);
      setProgress(50);

      // Upload cover art → bucket 'images'
      let coverUrl = '';
      if (artFile) {
        const coverPath = `covers/${user.id}/${Date.now()}_${artFile.name}`;
        const { error: artErr } = await supabase.storage
          .from('images')
          .upload(coverPath, artFile, { upsert: true });
        if (artErr) throw artErr;
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(coverPath);
        coverUrl = publicUrl;
      }
      setProgress(75);

      // Insert into `tracks`
      const { data: trackRow, error: trackErr } = await supabase.from('tracks').insert([{
        title:       form.title,
        artist_id:   user.id,
        genre:       form.genre,
        language:    form.language,
        explicit:    form.explicit,
        lyrics:      form.lyrics,
        bpm:         form.bpm ? Number(form.bpm) : null,
        audio_url:   audioUrl,
        artwork_url: coverUrl,
        status:      'pending',
        created_at:  new Date().toISOString(),
      }]).select('id').single();
      if (trackErr) throw trackErr;

      // Insert into `ecom_products` (status=pending — goes live only after admin approval)
      const { data: prodRow, error: prodErr } = await supabase.from('ecom_products').insert([{
        title:             form.title,
        vendor_id:         user.id,
        product_type:      'Music',
        audio_url:         audioUrl,
        cover_image_url:   coverUrl,
        genre:             form.genre,
        language:          form.language,
        status:            'pending',
        creator_id:        user.id,
      }]).select('id').single();
      if (prodErr) throw prodErr;

      // Create distribution_releases record
      const { error: distErr } = await supabase.from('distribution_releases').insert([{
        track_id:        trackRow.id,
        ecom_product_id: prodRow.id,
        user_id:         user.id,
        title:           form.title,
        artist_name:     form.artist,
        genre:           form.genre,
        language_code:   LANG_CODES[form.language] ?? 'en',
        release_type:    'single',
        cover_url:       coverUrl,
        audio_url:       audioUrl,
        explicit:        form.explicit,
        release_date:    form.release_date || null,
        isrc:            form.isrc || null,
        copyright_owner: form.copyright_owner || null,
        composer:        form.composer || null,
        producer:        form.producer || null,
        label_name:      form.label_name || null,
        track_count:     1,
        status,
        submitted_at:    status === 'submitted' ? new Date().toISOString() : null,
      }]);
      if (distErr) throw distErr;

      setProgress(100);
      if (status === 'draft') setSavedAsDraft(true);
      else setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setError(msg);
    } finally {
      setUploading(false);
      setDraftSaving(false);
    }
  };

  // ── Submit handlers ───────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doUploadAndSave('submitted');
  };

  const handleSaveDraft = async () => {
    await doUploadAndSave('draft');
  };

  const resetForm = () => {
    setAudioFile(null);
    setArtFile(null);
    setArtPreview('');
    setProgress(0);
    setError('');
    setDone(false);
    setSavedAsDraft(false);
    setForm({
      title: '', artist: '', genre: '', language: 'English',
      explicit: false, release_date: '', lyrics: '', description: '', bpm: '',
      isrc: '', copyright_owner: '', composer: '', producer: '', label_name: '',
    });
  };

  // ── Draft saved screen ────────────────────────────────────────────────────

  if (savedAsDraft) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-[#FFB800]/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#FFB800]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Draft Saved</h2>
            <p className="text-gray-400 text-sm mb-8">
              <span className="text-white font-medium">"{form.title}"</span> is saved as a draft.
              Complete it and submit for distribution when ready.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={resetForm}
                className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
              >
                Upload Another
              </button>
              <Link
                to="/dashboard"
                className="px-5 py-2.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-[#00D9FF]/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#00D9FF]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Submitted for Distribution!</h2>
            <p className="text-gray-400 text-sm mb-8">
              <span className="text-white font-medium">"{form.title}"</span> has been submitted
              and is pending admin review before going to Ditto Music.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={resetForm}
                className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
              >
                Upload Another
              </button>
              <Link
                to="/dashboard"
                className="px-5 py-2.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0814] flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-300">Upload Music</span>
        </div>

        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/15 flex items-center justify-center">
              <Music className="w-5 h-5 text-[#9D4EDD]" />
            </div>
            <h1 className="text-2xl font-black text-white">Upload a Track</h1>
          </div>
          <p className="text-gray-400 text-sm ml-13">
            Upload a single track quickly — no wizard, just the essentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── File uploads ──────────────────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* Audio file drop zone */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Audio File <span className="text-[#9D4EDD]">*</span>
              </label>
              <div
                onClick={() => audioRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setAudioDragging(true); }}
                onDragLeave={() => setAudioDragging(false)}
                onDrop={handleAudioDrop}
                className={[
                  'min-h-[160px] rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center p-6 transition-all',
                  audioDragging
                    ? 'border-[#00D9FF]/60 bg-[#00D9FF]/10'
                    : audioFile
                    ? 'border-[#00D9FF]/40 bg-[#00D9FF]/5'
                    : 'border-white/10 hover:border-white/20 bg-[#0B0814]',
                ].join(' ')}
              >
                <input
                  ref={audioRef}
                  type="file"
                  className="hidden"
                  accept=".wav,.flac,.mp3"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!validateAudio(f)) { setError('Only WAV, FLAC, or MP3 files are accepted.'); return; }
                    setError('');
                    setAudioFile(f);
                  }}
                />
                {audioFile ? (
                  <div className="text-center">
                    <Music className="w-8 h-8 text-[#00D9FF] mx-auto mb-2" />
                    <p className="text-[#00D9FF] text-sm font-medium truncate max-w-[160px]">
                      {audioFile.name}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">{fmtBytes(audioFile.size)}</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setAudioFile(null); }}
                      className="mt-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4 inline" /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Drop audio here or click</p>
                    <p className="text-gray-600 text-xs mt-1">WAV · FLAC · MP3</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cover art drop zone */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Cover Art
              </label>
              <div
                onClick={() => artRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setArtDragging(true); }}
                onDragLeave={() => setArtDragging(false)}
                onDrop={handleArtDrop}
                className={[
                  'min-h-[160px] rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden flex items-center justify-center transition-all',
                  artDragging
                    ? 'border-[#9D4EDD]/60 bg-[#9D4EDD]/10'
                    : 'border-white/10 hover:border-[#9D4EDD]/40 bg-[#0B0814]',
                ].join(' ')}
              >
                <input
                  ref={artRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setArtFile(f);
                    setArtPreview(URL.createObjectURL(f));
                  }}
                />
                {artPreview ? (
                  <img src={artPreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Drop artwork or click</p>
                    <p className="text-gray-600 text-xs mt-1">3000 × 3000 px recommended</p>
                  </div>
                )}
              </div>
              {artFile && (
                <button
                  type="button"
                  onClick={() => { setArtFile(null); setArtPreview(''); }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors self-start"
                >
                  <X className="w-3 h-3 inline mr-0.5" /> Remove artwork
                </button>
              )}
            </div>
          </div>

          {/* ── Core metadata ─────────────────────────────────────────── */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Track Details
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Title <span className="text-[#9D4EDD]">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="Track title"
                  className={inputCls}
                />
              </div>

              {/* Artist */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Artist Name <span className="text-[#9D4EDD]">*</span>
                </label>
                <input
                  value={form.artist}
                  onChange={e => setField('artist', e.target.value)}
                  placeholder="Stage name or artist name"
                  className={inputCls}
                />
              </div>

              {/* Genre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Genre</label>
                <select value={form.genre} onChange={e => setField('genre', e.target.value)} className={selectCls}>
                  <option value="">Select genre…</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Language */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Language</label>
                <select value={form.language} onChange={e => setField('language', e.target.value)} className={selectCls}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* BPM */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">BPM</label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={form.bpm}
                  onChange={e => setField('bpm', e.target.value)}
                  placeholder="e.g. 128"
                  className={inputCls}
                />
              </div>

              {/* Release date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Release Date</label>
                <input
                  type="date"
                  value={form.release_date}
                  onChange={e => setField('release_date', e.target.value)}
                  className={inputCls + ' [color-scheme:dark]'}
                />
              </div>

              {/* Explicit toggle */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 md:col-span-2">
                <div>
                  <p className="text-sm text-white font-medium">Explicit Content</p>
                  <p className="text-xs text-gray-500">Mark if this track contains explicit lyrics</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('explicit', !form.explicit)}
                  className={[
                    'relative w-11 h-6 rounded-full transition-colors',
                    form.explicit ? 'bg-[#9D4EDD]' : 'bg-white/10',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      form.explicit ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ── Optional extras ───────────────────────────────────────── */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Optional Extras
            </h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Tell listeners about this track…"
                className={inputCls + ' resize-none'}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Lyrics</label>
              <textarea
                rows={6}
                value={form.lyrics}
                onChange={e => setField('lyrics', e.target.value)}
                placeholder="Paste song lyrics here…"
                className={inputCls + ' resize-none font-mono text-xs leading-relaxed'}
              />
            </div>
          </div>

          {/* ── Distribution metadata (for Ditto submission) ──────────── */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Distribution Info</h2>
              <p className="text-xs text-gray-500 mt-1">Required for Ditto Music distribution. Leave blank to fill in later.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">ISRC Code</label>
                <input
                  value={form.isrc}
                  onChange={e => setField('isrc', e.target.value)}
                  placeholder="e.g. USAT20900"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Label Name</label>
                <input
                  value={form.label_name}
                  onChange={e => setField('label_name', e.target.value)}
                  placeholder="Your label or artist name"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Copyright Owner</label>
                <input
                  value={form.copyright_owner}
                  onChange={e => setField('copyright_owner', e.target.value)}
                  placeholder="© Year Artist / Label"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Composer</label>
                <input
                  value={form.composer}
                  onChange={e => setField('composer', e.target.value)}
                  placeholder="Songwriter / composer name"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Producer</label>
                <input
                  value={form.producer}
                  onChange={e => setField('producer', e.target.value)}
                  placeholder="Producer name"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* ── Progress bar ──────────────────────────────────────────── */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={uploading || draftSaving}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-gray-300 font-bold rounded-2xl hover:bg-white/8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {draftSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : (
                'Save Draft'
              )}
            </button>
            <button
              type="submit"
              disabled={uploading || draftSaving}
              className="flex-[2] flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit for Distribution
                </>
              )}
            </button>
          </div>

        </form>
      </main>

      <Footer />
    </div>
  );
}
