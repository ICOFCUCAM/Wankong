import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Music, Upload, ImageIcon, CheckCircle, Loader2,
  AlertCircle, ChevronLeft, X, GripVertical,
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

// ── Types ────────────────────────────────────────────────────────────────────

interface TrackRow {
  id: string;
  title: string;
  audioFile: File | null;
  explicit: boolean;
  trackNum: number;
}

const LANG_CODES: Record<string, string> = {
  English: 'en', French: 'fr', Spanish: 'es', Arabic: 'ar',
  Swahili: 'sw', Yoruba: 'yo', Igbo: 'ig', Hausa: 'ha',
  Zulu: 'zu', Portuguese: 'pt',
};

interface AlbumForm {
  title: string;
  artist: string;
  genre: string;
  language: string;
  release_date: string;
  description: string;
  type: 'ep' | 'album';
  isrc: string;
  copyright_owner: string;
  composer: string;
  producer: string;
  label_name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateAudio(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['wav', 'flac', 'mp3'].includes(ext);
}

let _idCounter = 0;
function uid(): string {
  return `track_${Date.now()}_${++_idCounter}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function UploadAlbumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const artRef = useRef<HTMLInputElement>(null);

  // Album cover
  const [albumArtFile, setAlbumArtFile] = useState<File | null>(null);
  const [artPreview,   setArtPreview]   = useState('');
  const [artDragging,  setArtDragging]  = useState(false);

  // Upload state
  const [uploading,     setUploading]     = useState(false);
  const [draftSaving,   setDraftSaving]   = useState(false);
  const [done,          setDone]          = useState(false);
  const [savedAsDraft,  setSavedAsDraft]  = useState(false);
  const [error,         setError]         = useState('');
  const [uploadStatus,  setUploadStatus]  = useState('');

  // Album metadata
  const [album, setAlbum] = useState<AlbumForm>({
    title:           '',
    artist:          '',
    genre:           '',
    language:        'English',
    release_date:    '',
    description:     '',
    type:            'album',
    isrc:            '',
    copyright_owner: '',
    composer:        '',
    producer:        '',
    label_name:      '',
  });

  const setAlbumField = <K extends keyof AlbumForm>(key: K, value: AlbumForm[K]) =>
    setAlbum(prev => ({ ...prev, [key]: value }));

  // Track list
  const [tracks, setTracks] = useState<TrackRow[]>([
    { id: uid(), title: '', audioFile: null, explicit: false, trackNum: 1 },
  ]);

  // Drag-and-drop reorder state
  const dragIdRef = useRef<string | null>(null);

  // Individual track audio file refs (keyed by track id)
  const trackAudioRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Track list helpers ────────────────────────────────────────────────────

  const addTrack = () => {
    if (tracks.length >= 50) return;
    const nextNum = tracks.length + 1;
    setTracks(prev => [...prev, { id: uid(), title: '', audioFile: null, explicit: false, trackNum: nextNum }]);
  };

  const removeTrack = (id: string) => {
    setTracks(prev => {
      const filtered = prev.filter(t => t.id !== id);
      return filtered.map((t, i) => ({ ...t, trackNum: i + 1 }));
    });
  };

  const updateTrack = <K extends keyof TrackRow>(id: string, key: K, value: TrackRow[K]) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, [key]: value } : t));
  };

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    if (!sourceId || sourceId === targetId) return;
    setTracks(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === sourceId);
      const toIdx   = arr.findIndex(t => t.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr.map((t, i) => ({ ...t, trackNum: i + 1 }));
    });
    dragIdRef.current = null;
  };

  // ── Art drop zone ─────────────────────────────────────────────────────────

  const handleArtDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArtDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setAlbumArtFile(file);
    setArtPreview(URL.createObjectURL(file));
  };

  // ── Shared upload logic ───────────────────────────────────────────────────

  const doUploadAndSave = async (releaseStatus: 'draft' | 'submitted') => {
    // Validation — draft only needs title
    if (!album.title.trim())  { setError('Album title is required.'); return; }
    if (tracks.length === 0)  { setError('Add at least one track.'); return; }
    const missingTitle = tracks.find(t => !t.title.trim());
    if (missingTitle)         { setError(`Track ${missingTitle.trackNum} needs a title.`); return; }
    const missingAudio = tracks.find(t => !t.audioFile);
    if (missingAudio)         { setError(`Track ${missingAudio.trackNum} needs an audio file.`); return; }
    if (!user)                { setError('You must be logged in.'); return; }

    if (releaseStatus === 'submitted') {
      if (!album.artist.trim()) { setError('Artist name is required for submission.'); return; }
      if (!albumArtFile)        { setError('Album cover art (3000 × 3000 px) is required for distribution.'); return; }
      if (!album.genre)         { setError('Genre is required for submission.'); return; }
      if (!album.release_date)  { setError('Release date is required for submission.'); return; }
    }

    if (releaseStatus === 'draft') setDraftSaving(true);
    else setUploading(true);
    setError('');

    try {
      // Upload album cover → bucket 'images'
      setUploadStatus('Uploading album cover…');
      const coverPath = `covers/${user.id}/${Date.now()}_${albumArtFile.name}`;
      const { error: coverErr } = await supabase.storage
        .from('images')
        .upload(coverPath, albumArtFile, { upsert: true });
      if (coverErr) throw coverErr;
      const { data: { publicUrl: coverUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(coverPath);

      // Insert parent `ecom_products` (pending until admin approves)
      setUploadStatus('Creating release record…');
      const { data: prodRow, error: prodErr } = await supabase.from('ecom_products').insert([{
        title:           album.title,
        vendor_id:       user.id,
        product_type:    'Music',
        cover_image_url: coverUrl,
        genre:           album.genre,
        language:        album.language,
        status:          'pending',
        creator_id:      user.id,
      }]).select('id').single();
      if (prodErr) throw prodErr;

      // Insert distribution_releases → admin review queue
      const { data: releaseRow, error: releaseErr } = await supabase
        .from('distribution_releases')
        .insert([{
          ecom_product_id: prodRow.id,
          user_id:         user.id,
          title:           album.title,
          artist_name:     album.artist,
          genre:           album.genre,
          language_code:   LANG_CODES[album.language] ?? 'en',
          release_type:    album.type,
          cover_url:       coverUrl,
          explicit:        false,
          release_date:    album.release_date || null,
          isrc:            album.isrc || null,
          copyright_owner: album.copyright_owner || null,
          composer:        album.composer || null,
          producer:        album.producer || null,
          label_name:      album.label_name || null,
          track_count:     tracks.length,
          status:          releaseStatus,
          submitted_at:    releaseStatus === 'submitted' ? new Date().toISOString() : null,
        }])
        .select('id')
        .single();
      if (releaseErr) throw releaseErr;
      const releaseId: string = releaseRow.id;

      // Upload and insert each track
      let firstAudioUrl = '';
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track.audioFile) continue;

        setUploadStatus(`Uploading track ${i + 1} of ${tracks.length}…`);

        const audioPath = `${user.id}/albums/${releaseId}/${Date.now()}_track${i + 1}_${track.audioFile.name}`;
        const { error: audioErr } = await supabase.storage
          .from('audio')
          .upload(audioPath, track.audioFile, { upsert: true });
        if (audioErr) throw audioErr;
        const { data: { publicUrl: audioUrl } } = supabase.storage
          .from('audio')
          .getPublicUrl(audioPath);
        if (i === 0) firstAudioUrl = audioUrl;

        const { data: trackRow, error: trackErr } = await supabase.from('tracks').insert([{
          title:        track.title,
          artist_id:    user.id,
          genre:        album.genre,
          language:     album.language,
          explicit:     track.explicit,
          audio_url:    audioUrl,
          artwork_url:  coverUrl,
          release_id:   releaseId,
          track_number: track.trackNum,
          status:       'pending',
          created_at:   new Date().toISOString(),
        }]).select('id').single();
        if (trackErr) throw trackErr;

        // Link first track's id and audio_url back onto the release for admin preview
        if (i === 0) {
          await supabase.from('distribution_releases').update({
            track_id:  trackRow.id,
            audio_url: firstAudioUrl,
          }).eq('id', releaseId);
        }
      }

      setUploadStatus('Finalising…');

      if (releaseStatus === 'draft') setSavedAsDraft(true);
      else setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setError(msg);
    } finally {
      setUploading(false);
      setDraftSaving(false);
      setUploadStatus('');
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
    setAlbumArtFile(null);
    setArtPreview('');
    setError('');
    setUploadStatus('');
    setDone(false);
    setSavedAsDraft(false);
    setAlbum({
      title: '', artist: '', genre: '', language: 'English',
      release_date: '', description: '', type: 'album',
      isrc: '', copyright_owner: '', composer: '', producer: '', label_name: '',
    });
    setTracks([{ id: uid(), title: '', audioFile: null, explicit: false, trackNum: 1 }]);
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
              <span className="text-white font-medium">"{album.title}"</span> ({tracks.length} track{tracks.length !== 1 ? 's' : ''})
              {' '}is saved as a draft. Complete and submit for distribution when ready.
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
            <div className="w-20 h-20 rounded-full bg-[#9D4EDD]/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#9D4EDD]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {album.type === 'ep' ? 'EP' : 'Album'} Submitted!
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              <span className="text-white font-medium">"{album.title}"</span> ({tracks.length} track{tracks.length !== 1 ? 's' : ''})
              {' '}is pending admin review before going to Ditto Music.
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12">
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
          <span className="text-gray-300">Upload Album / EP</span>
        </div>

        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/15 flex items-center justify-center">
              <Music className="w-5 h-5 text-[#9D4EDD]" />
            </div>
            <h1 className="text-2xl font-black text-white">Upload Album / EP</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Bundle up to 50 tracks under a single release. Cover art is shared across all tracks.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Two-column desktop layout ───────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">

            {/* ── LEFT: Album metadata ──────────────────────────────── */}
            <div className="space-y-6">

              {/* Cover art */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Album Cover <span className="text-[#9D4EDD]">*</span>
                </label>
                <div
                  onClick={() => artRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setArtDragging(true); }}
                  onDragLeave={() => setArtDragging(false)}
                  onDrop={handleArtDrop}
                  className={[
                    'w-full aspect-square max-w-xs rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden',
                    'flex items-center justify-center transition-all',
                    artDragging
                      ? 'border-[#9D4EDD]/60 bg-[#9D4EDD]/10'
                      : albumArtFile
                      ? 'border-[#9D4EDD]/40 bg-[#9D4EDD]/5'
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
                      setAlbumArtFile(f);
                      setArtPreview(URL.createObjectURL(f));
                    }}
                  />
                  {artPreview ? (
                    <img src={artPreview} alt="Album cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <ImageIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Drop cover art or click</p>
                      <p className="text-gray-600 text-xs mt-1">3000 × 3000 px recommended</p>
                    </div>
                  )}
                </div>
                {albumArtFile && (
                  <button
                    type="button"
                    onClick={() => { setAlbumArtFile(null); setArtPreview(''); }}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors self-start"
                  >
                    <X className="w-3 h-3 inline mr-0.5" /> Remove cover
                  </button>
                )}
              </div>

              {/* Release type toggle */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Release Type</label>
                <div className="flex rounded-xl overflow-hidden border border-white/10">
                  {(['album', 'ep'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAlbumField('type', t)}
                      className={[
                        'flex-1 py-2.5 text-sm font-semibold transition-colors',
                        album.type === t
                          ? 'bg-[#9D4EDD] text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10',
                      ].join(' ')}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Album metadata card */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Details</h2>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {album.type === 'ep' ? 'EP' : 'Album'} Title <span className="text-[#9D4EDD]">*</span>
                  </label>
                  <input
                    value={album.title}
                    onChange={e => setAlbumField('title', e.target.value)}
                    placeholder="Release title"
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Artist Name <span className="text-[#9D4EDD]">*</span>
                  </label>
                  <input
                    value={album.artist}
                    onChange={e => setAlbumField('artist', e.target.value)}
                    placeholder="Artist or band name"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Genre</label>
                    <select value={album.genre} onChange={e => setAlbumField('genre', e.target.value)} className={selectCls}>
                      <option value="">Select…</option>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Language</label>
                    <select value={album.language} onChange={e => setAlbumField('language', e.target.value)} className={selectCls}>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Release Date</label>
                  <input
                    type="date"
                    value={album.release_date}
                    onChange={e => setAlbumField('release_date', e.target.value)}
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Description</label>
                  <textarea
                    rows={4}
                    value={album.description}
                    onChange={e => setAlbumField('description', e.target.value)}
                    placeholder="About this release…"
                    className={inputCls + ' resize-none'}
                  />
                </div>
              </div>
            </div>

            {/* Distribution metadata */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Distribution Info</h2>
                <p className="text-xs text-gray-500 mt-1">For Ditto Music submission. Optional now, admin can update before forwarding.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">ISRC</label>
                  <input value={album.isrc} onChange={e => setAlbumField('isrc', e.target.value)} placeholder="USAT20900…" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Label Name</label>
                  <input value={album.label_name} onChange={e => setAlbumField('label_name', e.target.value)} placeholder="Your label" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Copyright Owner</label>
                  <input value={album.copyright_owner} onChange={e => setAlbumField('copyright_owner', e.target.value)} placeholder="© Year Artist" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Composer</label>
                  <input value={album.composer} onChange={e => setAlbumField('composer', e.target.value)} placeholder="Composer name" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Producer</label>
                  <input value={album.producer} onChange={e => setAlbumField('producer', e.target.value)} placeholder="Producer name" className={inputCls} />
                </div>
              </div>
            </div>

            {/* ── RIGHT: Track list ─────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-base">Tracks</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{tracks.length} / 50 · Drag to reorder</p>
                </div>
                {tracks.length < 50 && (
                  <button
                    type="button"
                    onClick={addTrack}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] text-xs font-semibold rounded-xl hover:bg-[#9D4EDD]/20 transition-colors"
                  >
                    + Add Track
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={e => handleDragStart(e, track.id)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, track.id)}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 group transition-colors hover:border-white/20"
                  >
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Track number */}
                    <span className="text-gray-500 text-xs font-bold w-5 text-center shrink-0">
                      {track.trackNum}
                    </span>

                    {/* Title input */}
                    <input
                      value={track.title}
                      onChange={e => updateTrack(track.id, 'title', e.target.value)}
                      placeholder={`Track ${track.trackNum} title`}
                      className="flex-1 min-w-0 bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
                    />

                    {/* Audio file pick */}
                    <label className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/10 bg-[#0B0814] cursor-pointer hover:border-[#00D9FF]/40 transition-colors shrink-0">
                      <input
                        ref={el => { trackAudioRefs.current[track.id] = el; }}
                        type="file"
                        accept=".wav,.flac,.mp3"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (!validateAudio(f)) { setError('Only WAV, FLAC or MP3.'); return; }
                          setError('');
                          updateTrack(track.id, 'audioFile', f);
                        }}
                      />
                      <Music className={`w-3.5 h-3.5 ${track.audioFile ? 'text-[#00D9FF]' : 'text-gray-500'}`} />
                      <span className={`text-xs max-w-[80px] truncate ${track.audioFile ? 'text-[#00D9FF]' : 'text-gray-500'}`}>
                        {track.audioFile ? track.audioFile.name : 'Audio'}
                      </span>
                    </label>

                    {/* Explicit toggle */}
                    <label className="flex items-center gap-1 cursor-pointer shrink-0 group/exp" title="Explicit">
                      <input
                        type="checkbox"
                        checked={track.explicit}
                        onChange={e => updateTrack(track.id, 'explicit', e.target.checked)}
                        className="accent-[#9D4EDD] w-3.5 h-3.5"
                      />
                      <span className={`text-[10px] font-bold ${track.explicit ? 'text-[#9D4EDD]' : 'text-gray-500'}`}>E</span>
                    </label>

                    {/* Remove button */}
                    {tracks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTrack(track.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                        aria-label="Remove track"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {tracks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl text-center">
                  <Music className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">No tracks yet</p>
                  <button
                    type="button"
                    onClick={addTrack}
                    className="mt-3 px-4 py-1.5 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] text-xs font-semibold rounded-lg hover:bg-[#9D4EDD]/20 transition-colors"
                  >
                    + Add First Track
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-6">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* ── Upload progress ────────────────────────────────────────── */}
          {uploading && uploadStatus && (
            <div className="flex items-center gap-3 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-xl px-4 py-3 mt-6">
              <Loader2 className="w-4 h-4 text-[#9D4EDD] animate-spin shrink-0" />
              <p className="text-sm text-[#9D4EDD]">{uploadStatus}</p>
            </div>
          )}

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div className="flex gap-3 mt-6">
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
                  {uploadStatus || 'Uploading…'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit {album.type === 'ep' ? 'EP' : 'Album'} ({tracks.length} track{tracks.length !== 1 ? 's' : ''})
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
