import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';
import RoyaltySplitEditor, { Split } from '@/components/distribution/RoyaltySplitEditor';
import { submitRelease } from '@/services/distribution/dittoDistributionService';

// ── helpers ───────────────────────────────────────────────────────────────────

const generateISRC = () => {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `WKNG-${Date.now()}-${hex}`;
};

const validateArtwork = (file: File): Promise<string | null> =>
  new Promise(resolve => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      resolve('Artwork must be JPG or PNG.');
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width !== img.height) resolve('Artwork must be square (equal width and height).');
      else if (img.width < 3000) resolve(`Artwork must be at least 3000×3000 px (uploaded: ${img.width}×${img.height}).`);
      else resolve(null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve('Could not read image file.'); };
    img.src = url;
  });

const validateAudio = (file: File): string | null => {
  if (/\.(wav|mp3)$/i.test(file.name)) return null;
  return 'Audio must be WAV (preferred) or MP3.';
};

const PLATFORMS = [
  { id: 'spotify',       name: 'Spotify' },
  { id: 'apple_music',   name: 'Apple Music' },
  { id: 'youtube_music', name: 'YouTube Music' },
  { id: 'tiktok',        name: 'TikTok' },
  { id: 'amazon_music',  name: 'Amazon Music' },
  { id: 'deezer',        name: 'Deezer' },
  { id: 'tidal',         name: 'Tidal' },
  { id: 'pandora',       name: 'Pandora' },
  { id: 'soundcloud',    name: 'SoundCloud' },
  { id: 'boomplay',      name: 'Boomplay' },
];

const GENRES = ['Afrobeats','Hip-Hop','Electronic','Soul','Jazz','Amapiano','Highlife','Bongo Flava','Gospel','R&B','Pop','Dancehall','Reggae','Classical','Country'];
const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'sw', name: 'Swahili' },
  { code: 'yo', name: 'Yoruba' }, { code: 'ha', name: 'Hausa' }, { code: 'ig', name: 'Igbo' },
  { code: 'zu', name: 'Zulu' }, { code: 'af', name: 'Afrikaans' }, { code: 'am', name: 'Amharic' },
  { code: 'es', name: 'Spanish' }, { code: 'pt', name: 'Portuguese' }, { code: 'ar', name: 'Arabic' },
];

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const label = 'block text-sm font-medium text-gray-300 mb-1';

// ── component ─────────────────────────────────────────────────────────────────

interface Props { onSuccess: () => void; }

export default function UploadMusicSingle({ onSuccess }: Props) {
  const { user } = useApp();

  // metadata
  const [releaseTitle,     setReleaseTitle]     = useState('');
  const [primaryArtist,    setPrimaryArtist]    = useState('');
  const [featuredArtists,  setFeaturedArtists]  = useState('');
  const [releaseDate,      setReleaseDate]      = useState('');
  const [genre,            setGenre]            = useState('');
  const [language,         setLanguage]         = useState('en');
  const [explicit,         setExplicit]         = useState(false);
  const [recordLabel,      setRecordLabel]      = useState('');
  const [copyrightOwner,   setCopyrightOwner]   = useState('');
  const [composer,         setComposer]         = useState('');
  const [producer,         setProducer]         = useState('');
  const [isrc,             setIsrc]             = useState('');
  const [previewStart,     setPreviewStart]     = useState('0');

  // files
  const [artworkFile,      setArtworkFile]      = useState<File | null>(null);
  const [audioFile,        setAudioFile]        = useState<File | null>(null);
  const artworkRef = useRef<HTMLInputElement>(null);
  const audioRef   = useRef<HTMLInputElement>(null);

  // platforms — all on by default
  const [platforms, setPlatforms] = useState<Record<string, boolean>>(
    Object.fromEntries(PLATFORMS.map(p => [p.id, true]))
  );

  // royalty splits
  const [splits, setSplits] = useState<Split[]>([
    { id: crypto.randomUUID(), role: 'artist',   label: '', percentage: 70 },
    { id: crypto.randomUUID(), role: 'platform',  label: 'WANKONG', percentage: 30 },
  ]);

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState('');

  const handleArtwork = async (file: File) => {
    const err = await validateArtwork(file);
    if (err) { setError(err); return; }
    setArtworkFile(file);
    setError('');
  };

  const handleAudio = (file: File) => {
    const err = validateAudio(file);
    if (err) { setError(err); return; }
    setAudioFile(file);
    setError('');
  };

  const togglePlatform = (id: string) =>
    setPlatforms(p => ({ ...p, [id]: !p[id] }));

  const splitsValid = Math.abs(splits.reduce((s, r) => s + r.percentage, 0) - 100) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseTitle || !primaryArtist || !copyrightOwner) {
      setError('Release title, primary artist, and copyright owner are required.');
      return;
    }
    if (!splitsValid) { setError('Royalty splits must total 100%.'); return; }
    setSubmitting(true);
    setError('');

    const ticker = setInterval(() => {
      setProgress(p => p < 85 ? p + Math.random() * 12 : p);
    }, 400);

    try {
      const finalIsrc = isrc.trim() || generateISRC();
      const enabledPlatforms = PLATFORMS.filter(p => platforms[p.id]).map(p => p.name);

      // 1. Insert release record
      const { data: release, error: relErr } = await supabase
        .from('releases')
        .insert([{
          creator_id:      user?.id ?? null,
          release_title:   releaseTitle,
          release_type:    'single',
          primary_artist:  primaryArtist,
          featured_artists: featuredArtists || null,
          release_date:    releaseDate || null,
          genre,
          language,
          explicit,
          record_label:    recordLabel || null,
          copyright_owner: copyrightOwner,
          status:          'processing',
        }])
        .select()
        .single();

      if (relErr) throw relErr;

      const releaseId = release.id;

      // 2. Insert track record
      const { data: track, error: trkErr } = await supabase
        .from('tracks')
        .insert([{
          release_id:    releaseId,
          creator_id:    user?.id ?? null,
          track_number:  1,
          title:         releaseTitle,
          composer:      composer || null,
          producer:      producer || null,
          isrc:          finalIsrc,
          preview_start: parseInt(previewStart, 10) || 0,
          explicit,
        }])
        .select()
        .single();

      if (trkErr) throw trkErr;

      const trackId = track.id;

      // 3. Insert royalty splits
      if (splits.length > 0) {
        await supabase.from('royalty_splits').insert(
          splits.map(s => ({
            release_id:  releaseId,
            track_id:    trackId,
            role:        s.role,
            label:       s.label,
            percentage:  s.percentage,
          }))
        );
      }

      // 4. Insert distribution targets
      await supabase.from('distribution_targets').insert(
        PLATFORMS.map(p => ({
          release_id: releaseId,
          platform:   p.name,
          enabled:    platforms[p.id],
          status:     platforms[p.id] ? 'pending' : 'disabled',
        }))
      );

      // 5. Submit to Ditto
      await submitRelease({
        trackId,
        title:          releaseTitle,
        artistName:     primaryArtist,
        genre,
        language,
        releaseDate:    releaseDate || new Date().toISOString().slice(0, 10),
        audioUrl:       audioFile?.name ?? '',
        artworkUrl:     artworkFile?.name ?? '',
        releaseType:    'single',
        copyrightOwner,
        composer:       composer || primaryArtist,
        producer:       producer || primaryArtist,
        labelName:      recordLabel || 'Independent',
        explicit,
        platforms:      enabledPlatforms,
      });

      // 6. Mark release submitted
      await supabase
        .from('releases')
        .update({ status: 'submitted', updated_at: new Date().toISOString() })
        .eq('id', releaseId);

      clearInterval(ticker);
      setProgress(100);
      setTimeout(() => { setSubmitting(false); onSuccess(); }, 600);
    } catch (err: any) {
      clearInterval(ticker);
      setError(err.message || 'Submission failed. Please try again.');
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Single Release</h2>
        <p className="text-sm text-gray-400 mt-1">One track distributed to all major platforms.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* ── Release info ── */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Release Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={label}>Release Title *</label>
            <input className={inp} value={releaseTitle} onChange={e => setReleaseTitle(e.target.value)} placeholder="Track title" required />
          </div>
          <div>
            <label className={label}>Primary Artist *</label>
            <input className={inp} value={primaryArtist} onChange={e => setPrimaryArtist(e.target.value)} placeholder="Your artist name" required />
          </div>
          <div>
            <label className={label}>Featured Artists</label>
            <input className={inp} value={featuredArtists} onChange={e => setFeaturedArtists(e.target.value)} placeholder="Feat. Artist A, Artist B (comma-separated)" />
          </div>
          <div>
            <label className={label}>Release Date</label>
            <input type="date" className={inp} value={releaseDate} onChange={e => setReleaseDate(e.target.value)} />
          </div>
          <div>
            <label className={label}>Genre *</label>
            <select className={inp} value={genre} onChange={e => setGenre(e.target.value)} required>
              <option value="">Select genre</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Language</label>
            <select className={inp} value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Record Label</label>
            <input className={inp} value={recordLabel} onChange={e => setRecordLabel(e.target.value)} placeholder="Label name or 'Independent'" />
          </div>
          <div>
            <label className={label}>Copyright Owner *</label>
            <input className={inp} value={copyrightOwner} onChange={e => setCopyrightOwner(e.target.value)} placeholder="© 2026 Your Name" required />
          </div>
        </div>

        {/* Explicit toggle */}
        <div className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Explicit Content</p>
            <p className="text-xs text-gray-400">Contains explicit lyrics or themes</p>
          </div>
          <button type="button" onClick={() => setExplicit(!explicit)}
            className={`w-12 h-6 rounded-full relative transition-colors ${explicit ? 'bg-red-500' : 'bg-gray-700'}`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${explicit ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </section>

      {/* ── Artwork ── */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Artwork</h3>
        <p className="text-xs text-gray-400">Minimum 3000×3000 px · Square · JPG or PNG</p>
        <div
          onClick={() => artworkRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${artworkFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-[#9D4EDD]'}`}
        >
          <input ref={artworkRef} type="file" className="hidden" accept="image/jpeg,image/png"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleArtwork(f); }} />
          {artworkFile ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <div className="text-left">
                <p className="text-white text-sm font-medium">{artworkFile.name}</p>
                <p className="text-gray-400 text-xs">{(artworkFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); setArtworkFile(null); }} className="ml-4 text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-gray-300 text-sm">Click to upload artwork</p>
              <p className="text-gray-500 text-xs mt-1">JPG or PNG · 3000×3000 px minimum</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Audio ── */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Audio File</h3>
        <p className="text-xs text-gray-400">WAV preferred · MP3 accepted</p>
        <div
          onClick={() => audioRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${audioFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-[#9D4EDD]'}`}
        >
          <input ref={audioRef} type="file" className="hidden" accept=".wav,.mp3,audio/wav,audio/mpeg"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAudio(f); }} />
          {audioFile ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <div className="text-left">
                <p className="text-white text-sm font-medium">{audioFile.name}</p>
                <p className="text-gray-400 text-xs">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); setAudioFile(null); }} className="ml-4 text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
              <p className="text-gray-300 text-sm">Click to upload audio</p>
              <p className="text-gray-500 text-xs mt-1">WAV or MP3</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className={label}>Composer</label>
            <input className={inp} value={composer} onChange={e => setComposer(e.target.value)} placeholder="Songwriter / composer" />
          </div>
          <div>
            <label className={label}>Producer</label>
            <input className={inp} value={producer} onChange={e => setProducer(e.target.value)} placeholder="Beat / track producer" />
          </div>
          <div>
            <label className={label}>ISRC <span className="text-gray-500 font-normal">(auto-generated if blank)</span></label>
            <input className={inp} value={isrc} onChange={e => setIsrc(e.target.value)} placeholder="e.g. GBAYE6300001" />
          </div>
          <div>
            <label className={label}>Preview Start (seconds)</label>
            <input type="number" className={inp} value={previewStart} onChange={e => setPreviewStart(e.target.value)} min="0" placeholder="0" />
          </div>
        </div>
      </section>

      {/* ── Royalty Splits ── */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
        <RoyaltySplitEditor splits={splits} onChange={setSplits} />
      </section>

      {/* ── Platforms ── */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Distribution Platforms</h3>
          <button type="button" onClick={() => setPlatforms(Object.fromEntries(PLATFORMS.map(p => [p.id, true])))}
            className="text-xs text-[#B794F4] hover:text-[#C9B3F5]">Select All</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PLATFORMS.map(p => (
            <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${platforms[p.id] ? 'bg-[#9D4EDD]/20 border-[#9D4EDD]/50 text-[#C9B3F5]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* ── Progress bar ── */}
      {submitting && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-white">Submitting release...</span>
            <span className="text-sm text-[#B794F4]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="bg-[#9D4EDD] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <button type="submit" disabled={submitting || !releaseTitle || !primaryArtist}
        className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base">
        {submitting ? 'Submitting to Ditto...' : 'Submit Single for Distribution'}
      </button>
    </form>
  );
}
