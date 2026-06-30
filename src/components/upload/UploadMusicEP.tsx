import React, { useState, useRef } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';
import RoyaltySplitEditor, { Split } from '@/components/distribution/RoyaltySplitEditor';
import { submitRelease } from '@/services/distribution/dittoDistributionService';

// ── helpers (same as single) ──────────────────────────────────────────────────

const generateISRC = () => {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `WKNG-${Date.now()}-${hex}`;
};

const validateArtwork = (file: File): Promise<string | null> =>
  new Promise(resolve => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) { resolve('Artwork must be JPG or PNG.'); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width !== img.height) resolve('Artwork must be square.');
      else if (img.width < 3000) resolve(`Artwork must be at least 3000×3000 px (got ${img.width}×${img.height}).`);
      else resolve(null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve('Could not read image.'); };
    img.src = url;
  });

const validateAudio = (file: File): string | null =>
  /\.(wav|mp3)$/i.test(file.name) ? null : 'Audio must be WAV (preferred) or MP3.';

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

const MIN_TRACKS = 2;
const MAX_TRACKS = 6;

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';

// ── track interface ───────────────────────────────────────────────────────────

interface TrackDraft {
  id:           string;
  title:        string;
  composer:     string;
  producer:     string;
  isrc:         string;
  previewStart: string;
  explicit:     boolean;
  audioFile:    File | null;
}

const newTrack = (): TrackDraft => ({
  id:           crypto.randomUUID(),
  title:        '',
  composer:     '',
  producer:     '',
  isrc:         '',
  previewStart: '0',
  explicit:     false,
  audioFile:    null,
});

// ── component ─────────────────────────────────────────────────────────────────

interface Props { onSuccess: () => void; }

export default function UploadMusicEP({ onSuccess }: Props) {
  const { user } = useApp();

  // release-level metadata
  const [releaseTitle,   setReleaseTitle]   = useState('');
  const [primaryArtist,  setPrimaryArtist]  = useState('');
  const [featuredArtists,setFeaturedArtists]= useState('');
  const [releaseDate,    setReleaseDate]    = useState('');
  const [genre,          setGenre]          = useState('');
  const [language,       setLanguage]       = useState('en');
  const [explicit,       setExplicit]       = useState(false);
  const [recordLabel,    setRecordLabel]    = useState('');
  const [copyrightOwner, setCopyrightOwner] = useState('');
  const [artworkFile,    setArtworkFile]    = useState<File | null>(null);
  const artworkRef = useRef<HTMLInputElement>(null);

  // tracks
  const [tracks, setTracks] = useState<TrackDraft[]>([newTrack(), newTrack()]);

  // platforms
  const [platforms, setPlatforms] = useState<Record<string, boolean>>(
    Object.fromEntries(PLATFORMS.map(p => [p.id, true]))
  );

  // royalty splits
  const [splits, setSplits] = useState<Split[]>([
    { id: crypto.randomUUID(), role: 'artist',   label: '', percentage: 70 },
    { id: crypto.randomUUID(), role: 'platform',  label: 'WANKONG', percentage: 30 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState('');

  // track file refs map
  const audioRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const handleArtwork = async (file: File) => {
    const err = await validateArtwork(file);
    if (err) { setError(err); return; }
    setArtworkFile(file);
    setError('');
  };

  const updateTrack = (id: string, field: keyof TrackDraft, value: TrackDraft[keyof TrackDraft]) =>
    setTracks(ts => ts.map(t => t.id === id ? { ...t, [field]: value } : t));

  const addTrack = () => {
    if (tracks.length >= MAX_TRACKS) return;
    setTracks(ts => [...ts, newTrack()]);
  };

  const removeTrack = (id: string) => {
    if (tracks.length <= MIN_TRACKS) return;
    setTracks(ts => ts.filter(t => t.id !== id));
  };

  const duplicateTrack = (id: string) => {
    if (tracks.length >= MAX_TRACKS) return;
    const src = tracks.find(t => t.id === id);
    if (!src) return;
    setTracks(ts => [...ts, { ...src, id: crypto.randomUUID(), title: src.title + ' (copy)', audioFile: null }]);
  };

  const handleTrackAudio = (trackId: string, file: File) => {
    const err = validateAudio(file);
    if (err) { setError(err); return; }
    updateTrack(trackId, 'audioFile', file);
    setError('');
  };

  const splitsValid = Math.abs(splits.reduce((s, r) => s + r.percentage, 0) - 100) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseTitle || !primaryArtist || !copyrightOwner) {
      setError('Release title, primary artist and copyright owner are required.');
      return;
    }
    if (tracks.some(t => !t.title)) { setError('All tracks must have a title.'); return; }
    if (!splitsValid) { setError('Royalty splits must total 100%.'); return; }

    setSubmitting(true);
    setError('');

    const ticker = setInterval(() => setProgress(p => p < 85 ? p + Math.random() * 10 : p), 400);

    try {
      // 1. Insert release
      const { data: release, error: relErr } = await supabase
        .from('releases')
        .insert([{
          creator_id:      user?.id ?? null,
          release_title:   releaseTitle,
          release_type:    'ep',
          primary_artist:  primaryArtist,
          featured_artists: featuredArtists || null,
          release_date:    releaseDate || null,
          genre, language, explicit,
          record_label:    recordLabel || null,
          copyright_owner: copyrightOwner,
          status:          'processing',
        }])
        .select().single();

      if (relErr) throw relErr;
      const releaseId = release.id;

      // 2. Insert tracks
      const trackRows = tracks.map((t, i) => ({
        release_id:    releaseId,
        creator_id:    user?.id ?? null,
        track_number:  i + 1,
        title:         t.title,
        composer:      t.composer || null,
        producer:      t.producer || null,
        isrc:          t.isrc.trim() || generateISRC(),
        preview_start: parseInt(t.previewStart, 10) || 0,
        explicit:      t.explicit,
      }));

      const { data: insertedTracks, error: trkErr } = await supabase
        .from('tracks').insert(trackRows).select();
      if (trkErr) throw trkErr;

      const firstTrackId = insertedTracks[0].id;

      // 3. Royalty splits (linked to release)
      if (splits.length > 0) {
        await supabase.from('royalty_splits').insert(
          splits.map(s => ({ release_id: releaseId, track_id: firstTrackId, role: s.role, label: s.label, percentage: s.percentage }))
        );
      }

      // 4. Distribution targets
      await supabase.from('distribution_targets').insert(
        PLATFORMS.map(p => ({
          release_id: releaseId,
          platform:   p.name,
          enabled:    platforms[p.id],
          status:     platforms[p.id] ? 'pending' : 'disabled',
        }))
      );

      // 5. Ditto submission (first track as lead)
      const enabledPlatforms = PLATFORMS.filter(p => platforms[p.id]).map(p => p.name);
      await submitRelease({
        trackId:        firstTrackId,
        title:          releaseTitle,
        artistName:     primaryArtist,
        genre, language,
        releaseDate:    releaseDate || new Date().toISOString().slice(0, 10),
        audioUrl:       tracks[0].audioFile?.name ?? '',
        artworkUrl:     artworkFile?.name ?? '',
        releaseType:    'ep',
        copyrightOwner,
        composer:       tracks[0].composer || primaryArtist,
        producer:       tracks[0].producer || primaryArtist,
        labelName:      recordLabel || 'Independent',
        explicit,
        platforms:      enabledPlatforms,
      });

      // 6. Mark submitted
      await supabase.from('releases').update({ status: 'submitted', updated_at: new Date().toISOString() }).eq('id', releaseId);

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
        <h2 className="text-xl font-bold text-white">EP Release <span className="text-sm font-normal text-gray-400 ml-2">{MIN_TRACKS}–{MAX_TRACKS} tracks</span></h2>
        <p className="text-sm text-gray-400 mt-1">Extended play distributed to all major platforms.</p>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Release info */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Release Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={lbl}>EP Title *</label><input className={inp} value={releaseTitle} onChange={e => setReleaseTitle(e.target.value)} placeholder="EP title" required /></div>
          <div><label className={lbl}>Primary Artist *</label><input className={inp} value={primaryArtist} onChange={e => setPrimaryArtist(e.target.value)} placeholder="Artist name" required /></div>
          <div><label className={lbl}>Featured Artists</label><input className={inp} value={featuredArtists} onChange={e => setFeaturedArtists(e.target.value)} placeholder="Comma-separated" /></div>
          <div><label className={lbl}>Release Date</label><input type="date" className={inp} value={releaseDate} onChange={e => setReleaseDate(e.target.value)} /></div>
          <div>
            <label className={lbl}>Genre *</label>
            <select className={inp} value={genre} onChange={e => setGenre(e.target.value)} required>
              <option value="">Select genre</option>
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Language</label>
            <select className={inp} value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Record Label</label><input className={inp} value={recordLabel} onChange={e => setRecordLabel(e.target.value)} placeholder="Label or 'Independent'" /></div>
          <div><label className={lbl}>Copyright Owner *</label><input className={inp} value={copyrightOwner} onChange={e => setCopyrightOwner(e.target.value)} placeholder="© 2026 Your Name" required /></div>
        </div>
        <div className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-3">
          <div><p className="text-sm font-medium text-white">Explicit Content</p><p className="text-xs text-gray-400">EP contains explicit material</p></div>
          <button type="button" onClick={() => setExplicit(!explicit)} className={`w-12 h-6 rounded-full relative transition-colors ${explicit ? 'bg-red-500' : 'bg-gray-700'}`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${explicit ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </section>

      {/* Artwork */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">EP Artwork</h3>
        <p className="text-xs text-gray-400">Minimum 3000×3000 px · Square · JPG or PNG</p>
        <div onClick={() => artworkRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${artworkFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-[#9D4EDD]'}`}>
          <input ref={artworkRef} type="file" className="hidden" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) handleArtwork(f); }} />
          {artworkFile ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <p className="text-white text-sm">{artworkFile.name}</p>
              <button type="button" onClick={e => { e.stopPropagation(); setArtworkFile(null); }} className="text-xs text-red-400">Remove</button>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-gray-300 text-sm">Click to upload EP artwork</p>
            </div>
          )}
        </div>
      </section>

      {/* Track list */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Tracks ({tracks.length}/{MAX_TRACKS})</h3>
          <button type="button" onClick={addTrack} disabled={tracks.length >= MAX_TRACKS}
            className="flex items-center gap-1.5 text-xs text-[#B794F4] hover:text-[#C9B3F5] disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add Track
          </button>
        </div>

        {tracks.map((track, idx) => (
          <div key={track.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase">Track {idx + 1}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => duplicateTrack(track.id)} title="Duplicate"
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[#B794F4] rounded-lg hover:bg-[#9D4EDD]/10 transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {tracks.length > MIN_TRACKS && (
                  <button type="button" onClick={() => removeTrack(track.id)} title="Remove"
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={lbl}>Track Title *</label><input className={inp} value={track.title} onChange={e => updateTrack(track.id, 'title', e.target.value)} placeholder={`Track ${idx + 1} title`} required /></div>
              <div><label className={lbl}>ISRC <span className="text-gray-500 font-normal">(auto if blank)</span></label><input className={inp} value={track.isrc} onChange={e => updateTrack(track.id, 'isrc', e.target.value)} placeholder="GBAYE6300001" /></div>
              <div><label className={lbl}>Composer</label><input className={inp} value={track.composer} onChange={e => updateTrack(track.id, 'composer', e.target.value)} placeholder="Songwriter" /></div>
              <div><label className={lbl}>Producer</label><input className={inp} value={track.producer} onChange={e => updateTrack(track.id, 'producer', e.target.value)} placeholder="Producer name" /></div>
              <div><label className={lbl}>Preview Start (seconds)</label><input type="number" className={inp} value={track.previewStart} onChange={e => updateTrack(track.id, 'previewStart', e.target.value)} min="0" /></div>
              <div className="flex items-end">
                <div className="flex items-center gap-3 py-3">
                  <span className="text-sm text-gray-300">Explicit</span>
                  <button type="button" onClick={() => updateTrack(track.id, 'explicit', !track.explicit)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${track.explicit ? 'bg-red-500' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${track.explicit ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Audio file for this track */}
            <div>
              <label className={lbl}>Audio File (WAV or MP3)</label>
              <div
                onClick={() => audioRefs.current.get(track.id)?.click()}
                className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${track.audioFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-600 hover:border-[#9D4EDD]'}`}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".wav,.mp3,audio/wav,audio/mpeg"
                  ref={el => { if (el) audioRefs.current.set(track.id, el); }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleTrackAudio(track.id, f); }}
                />
                {track.audioFile
                  ? <p className="text-emerald-400 text-sm">{track.audioFile.name} ({(track.audioFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                  : <p className="text-gray-400 text-sm">Click to upload audio for this track</p>}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Royalty splits */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
        <RoyaltySplitEditor splits={splits} onChange={setSplits} />
      </section>

      {/* Platforms */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Distribution Platforms</h3>
          <button type="button" onClick={() => setPlatforms(Object.fromEntries(PLATFORMS.map(p => [p.id, true])))} className="text-xs text-[#B794F4] hover:text-[#C9B3F5]">Select All</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PLATFORMS.map(p => (
            <button key={p.id} type="button" onClick={() => setPlatforms(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${platforms[p.id] ? 'bg-[#9D4EDD]/20 border-[#9D4EDD]/50 text-[#C9B3F5]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {submitting && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex justify-between mb-2"><span className="text-sm text-white">Submitting EP...</span><span className="text-sm text-[#B794F4]">{Math.round(progress)}%</span></div>
          <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-[#9D4EDD] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <button type="submit" disabled={submitting || !releaseTitle || !primaryArtist}
        className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base">
        {submitting ? 'Submitting EP to Ditto...' : `Submit EP for Distribution (${tracks.length} tracks)`}
      </button>
    </form>
  );
}
