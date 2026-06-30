import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import RoyaltySplitEditor, { type Split } from '@/components/distribution/RoyaltySplitEditor';
import {
  Music, ImageIcon, Upload, ChevronRight, Globe, DollarSign,
  CheckCircle, Loader2, AlertCircle, Calendar, Zap,
} from 'lucide-react';

// ── constants ────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { key: 'spotify',       label: 'Spotify'         },
  { key: 'apple_music',   label: 'Apple Music'     },
  { key: 'tiktok',        label: 'TikTok'          },
  { key: 'youtube_music', label: 'YouTube Music'   },
  { key: 'boomplay',      label: 'Boomplay'        },
  { key: 'audiomack',     label: 'Audiomack'       },
  { key: 'instagram',     label: 'Instagram Reels' },
  { key: 'facebook',      label: 'Facebook Music'  },
  { key: 'amazon',        label: 'Amazon Music'    },
  { key: 'deezer',        label: 'Deezer'          },
];

const GENRES    = ['Gospel','Afrobeats','Hip-Hop','RnB','Jazz','EDM','Classical','Reggae','Highlife','Blues','Pop','Rock'];
const LANGUAGES = [
  'English','French','Spanish','Arabic','Swahili',
  'Yoruba','Igbo','Hausa','Zulu','Portuguese',
];
const STEPS = ['Upload', 'Metadata', 'Platforms', 'Royalties', 'Confirm'];

const inputCls   = "w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]/40 focus:border-[#9D4EDD]/40 transition-colors";
const selectCls  = inputCls + " cursor-pointer";

// ── helper ────────────────────────────────────────────────────────────────────
function validateAudioFormat(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['wav', 'flac', 'mp3'].includes(ext ?? '');
}

// ── component ─────────────────────────────────────────────────────────────────
// ── Album track type ──────────────────────────────────────────────────────────
interface AlbumTrack {
  id: string;
  title: string;
  audioFile: File | null;
  duration_s: number;
  explicit: boolean;
}

export default function DistributeUploadPage() {
  const navigate  = useNavigate();
  const audioRef  = useRef<HTMLInputElement>(null);
  const artRef    = useRef<HTMLInputElement>(null);
  const albumAudioRef = useRef<HTMLInputElement>(null);

  const [step, setStep]             = useState(0);
  const [submitting, setSubmitting]  = useState(false);
  const [done,       setDone]        = useState(false);
  const [error,      setError]       = useState('');
  const [licenseAccepted, setLicenseAccepted] = useState(false);

  // Release mode: single or album/ep
  const [releaseMode, setReleaseMode] = useState<'single' | 'album'>('single');

  // Album tracks (for album/ep mode — up to 50 tracks)
  const [albumTracks, setAlbumTracks] = useState<AlbumTrack[]>([
    { id: '1', title: '', audioFile: null, duration_s: 0, explicit: false },
  ]);
  const [albumTitle,    setAlbumTitle]    = useState('');
  const [albumArtist,   setAlbumArtist]   = useState('');
  const [albumGenre,    setAlbumGenre]    = useState('');
  const [albumLanguage, setAlbumLanguage] = useState('English');

  // Step 1 — track files
  const [audioFile,    setAudioFile]    = useState<File | null>(null);
  const [artFile,      setArtFile]      = useState<File | null>(null);
  const [artPreview,   setArtPreview]   = useState('');
  const [track, setTrack] = useState({
    title: '', artist_name: '', genre: '', language: 'English', explicit: false,
  });

  // Step 2 — metadata
  const [meta, setMeta] = useState({
    release_type: 'single' as 'single' | 'ep' | 'album',
    release_date: '',
    release_time: '00:00',
    scheduled:    false,   // true = schedule for future date, false = release immediately
    copyright_owner: 'WANKONG Records',
    composer: '',
    producer: '',
    label_name: 'WANKONG Records',
  });

  // Step 3 — platforms
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({
    spotify: true, apple_music: true, tiktok: true, youtube_music: true,
    boomplay: true, audiomack: true, instagram: true,
    facebook: true, amazon: true, deezer: true,
  });
  const allSelected = Object.values(platforms).every(Boolean);

  // Step 4 — royalty splits
  const [splits, setSplits] = useState<Split[]>([
    { id: '1', role: 'artist',   label: track.artist_name, percentage: 70 },
    { id: '2', role: 'platform', label: 'WANKONG',          percentage: 30 },
  ]);
  const splitsTotal = splits.reduce((s, r) => s + r.percentage, 0);
  const splitsValid = Math.abs(splitsTotal - 100) < 0.01;

  // ── upload & submit ─────────────────────────────────────────────────────────
  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload audio
      let audioUrl = '';
      if (audioFile) {
        const path = `${user.id}/${Date.now()}_${audioFile.name}`;
        const { error: upErr } = await supabase.storage.from('music_uploads').upload(path, audioFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('music_uploads').getPublicUrl(path);
        audioUrl = publicUrl;
      }

      // Upload artwork
      let artworkUrl = '';
      if (artFile) {
        const path = `${user.id}/${Date.now()}_${artFile.name}`;
        const { error: upErr } = await supabase.storage.from('cover_artworks').upload(path, artFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('cover_artworks').getPublicUrl(path);
        artworkUrl = publicUrl;
      }

      // Compute publish_at for scheduled releases
      const publishAt = meta.scheduled && meta.release_date
        ? new Date(`${meta.release_date}T${meta.release_time || '00:00'}:00Z`).toISOString()
        : null;

      // Insert track
      const { data: trackRow, error: trackErr } = await supabase
        .from('tracks')
        .insert([{
          artist_id:   user.id,
          title:       track.title,
          genre:       track.genre,
          language:    track.language,
          explicit:    track.explicit,
          audio_url:   audioUrl,
          artwork_url: artworkUrl,
          status:      publishAt ? 'scheduled' : 'pending_review',
          publish_at:  publishAt,
        }])
        .select()
        .single();
      if (trackErr) throw trackErr;

      // Insert release_metadata
      await supabase.from('release_metadata').insert([{
        track_id: trackRow.id, ...meta,
      }]);

      // Insert distribution_targets
      await supabase.from('distribution_targets').insert([{
        track_id: trackRow.id, ...platforms,
      }]);

      // Insert royalty_splits
      await supabase.from('royalty_splits').insert(
        splits.map(s => ({
          track_id:     trackRow.id,
          role:         s.role,
          label:        s.label,
          percentage:   s.percentage,
          recipient_id: null,
        }))
      );

      // Insert distribution_releases
      const now = new Date().toISOString();
      await supabase.from('distribution_releases').insert([{
        track_id:                    trackRow.id,
        user_id:                     user.id,
        status:                      'pending_admin_review',
        submitted_at:                now,
        content_license_accepted_at: now,
        content_license_version:     '1.0',
      }]);

      setDone(true);
    } catch (err: any) {
      setError(err.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── success screen ──────────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-[#00F5A0]/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-[#00F5A0]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Submitted for Review</h2>
        <p className="text-gray-400 text-sm mb-6">
          "<span className="text-white">{track.title}</span>" is pending admin approval before distribution.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard" className="px-5 py-2.5 bg-[#9D4EDD] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">Dashboard</Link>
          <button onClick={() => { setDone(false); setStep(0); }} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Upload Another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">Distribute Music</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i === step ? 'bg-[#9D4EDD] text-white' :
                i < step  ? 'bg-[#9D4EDD]/20 text-[#9D4EDD]' :
                             'bg-white/5 text-gray-500'
              }`}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black bg-white/10">
                  {i < step ? '✓' : i + 1}
                </span>
                {s}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-white/10 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Release Mode Selector ────────────────────────────────── */}
        {step === 0 && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Release Type</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'single', label: 'Single / EP', desc: '1 track — fastest to distribute', icon: '🎵' },
                { id: 'album',  label: 'Album',        desc: 'Up to 50 tracks with track list', icon: '💿' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setReleaseMode(opt.id as 'single' | 'album')}
                  className={[
                    'flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                    releaseMode === opt.id
                      ? 'border-[#9D4EDD] bg-[#9D4EDD]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20',
                  ].join(' ')}
                >
                  <span className="text-2xl mt-0.5">{opt.icon}</span>
                  <div>
                    <p className={`font-bold text-sm ${releaseMode === opt.id ? 'text-[#9D4EDD]' : 'text-white'}`}>{opt.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ALBUM MODE — Track List Manager ──────────────────────── */}
        {step === 0 && releaseMode === 'album' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Upload Album</h2>
            <p className="text-gray-400 text-sm">Add up to 50 tracks. One shared artwork for the full album.</p>

            {/* Album info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Album Title *</label>
                <input value={albumTitle} onChange={e => setAlbumTitle(e.target.value)}
                  placeholder="Album title" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Artist Name *</label>
                <input value={albumArtist} onChange={e => setAlbumArtist(e.target.value)}
                  placeholder="Artist name" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Genre *</label>
                <select value={albumGenre} onChange={e => setAlbumGenre(e.target.value)} className={selectCls}>
                  <option value="">Select genre…</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Language</label>
                <select value={albumLanguage} onChange={e => setAlbumLanguage(e.target.value)} className={selectCls}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Album artwork */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Album Cover Artwork</p>
              <div
                onClick={() => artRef.current?.click()}
                className="w-40 h-40 rounded-2xl border-2 border-dashed border-white/10 hover:border-[#9D4EDD]/40 cursor-pointer overflow-hidden bg-[#0B0814] flex items-center justify-center transition-colors"
              >
                <input ref={artRef} type="file" className="hidden" accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setArtFile(f); setArtPreview(URL.createObjectURL(f)); } }}
                />
                {artPreview
                  ? <img src={artPreview} alt="" className="w-full h-full object-cover" />
                  : <div className="text-center p-4"><ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-1" /><p className="text-[10px] text-gray-500">3000×3000px</p></div>}
              </div>
            </div>

            {/* Track list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">Tracks ({albumTracks.length}/50)</h3>
                {albumTracks.length < 50 && (
                  <button
                    onClick={() => setAlbumTracks(prev => [
                      ...prev,
                      { id: String(Date.now()), title: '', audioFile: null, duration_s: 0, explicit: false },
                    ])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] text-xs font-semibold rounded-xl hover:bg-[#9D4EDD]/20 transition-colors"
                  >
                    + Add Track
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {albumTracks.map((at, idx) => (
                  <div key={at.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-gray-500 text-sm font-bold w-6 text-center shrink-0">{idx + 1}</span>
                    <input
                      value={at.title}
                      onChange={e => setAlbumTracks(prev => prev.map(t => t.id === at.id ? { ...t, title: e.target.value } : t))}
                      placeholder={`Track ${idx + 1} title`}
                      className="flex-1 bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
                    />
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-[#0B0814] cursor-pointer hover:border-[#9D4EDD]/40 transition-colors shrink-0">
                      <input
                        type="file"
                        accept=".wav,.flac,.mp3"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (!validateAudioFormat(f)) { setError('Only WAV, FLAC or MP3.'); return; }
                          setAlbumTracks(prev => prev.map(t => t.id === at.id ? { ...t, audioFile: f } : t));
                        }}
                      />
                      <Music className={`w-3.5 h-3.5 ${at.audioFile ? 'text-[#00D9FF]' : 'text-gray-500'}`} />
                      <span className={`text-xs ${at.audioFile ? 'text-[#00D9FF]' : 'text-gray-500'}`}>
                        {at.audioFile ? at.audioFile.name.slice(0, 16) + '…' : 'Audio'}
                      </span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer shrink-0">
                      <input type="checkbox" checked={at.explicit}
                        onChange={e => setAlbumTracks(prev => prev.map(t => t.id === at.id ? { ...t, explicit: e.target.checked } : t))}
                        className="accent-[#9D4EDD]" />
                      <span className="text-[10px] text-gray-500">E</span>
                    </label>
                    {albumTracks.length > 1 && (
                      <button
                        onClick={() => setAlbumTracks(prev => prev.filter(t => t.id !== at.id))}
                        className="text-gray-600 hover:text-red-400 transition-colors text-sm shrink-0"
                        aria-label="Remove track"
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Album submit */}
            <button
              onClick={async () => {
                if (!albumTitle.trim()) return setError('Album title required.');
                if (!albumArtist.trim()) return setError('Artist name required.');
                if (!albumGenre) return setError('Please select a genre.');
                const missingAudio = albumTracks.some(t => !t.audioFile);
                if (missingAudio) return setError('Please upload audio for all tracks.');
                const missingTitles = albumTracks.some(t => !t.title.trim());
                if (missingTitles) return setError('Please enter a title for all tracks.');

                setSubmitting(true);
                setError('');
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Not authenticated');

                  // Upload artwork
                  let artworkUrl = '';
                  if (artFile) {
                    const path = `${user.id}/albums/${Date.now()}_cover.${artFile.name.split('.').pop()}`;
                    const { error: ae } = await supabase.storage.from('cover_artworks').upload(path, artFile);
                    if (ae) throw ae;
                    const { data: { publicUrl } } = supabase.storage.from('cover_artworks').getPublicUrl(path);
                    artworkUrl = publicUrl;
                  }

                  // Create album record
                  const { data: albumRow, error: albumErr } = await supabase
                    .from('albums')
                    .insert({ artist_id: user.id, title: albumTitle, genre: albumGenre, language: albumLanguage, artwork_url: artworkUrl, total_tracks: albumTracks.length, status: 'pending_review' })
                    .select('id').single();
                  if (albumErr) throw albumErr;

                  // Upload and insert each track
                  for (let i = 0; i < albumTracks.length; i++) {
                    const at = albumTracks[i];
                    if (!at.audioFile) continue;
                    const audioPath = `${user.id}/albums/${albumRow.id}/track_${i + 1}_${Date.now()}.${at.audioFile.name.split('.').pop()}`;
                    const { error: ue } = await supabase.storage.from('music_uploads').upload(audioPath, at.audioFile);
                    if (ue) throw ue;
                    const { data: { publicUrl: audioUrl } } = supabase.storage.from('music_uploads').getPublicUrl(audioPath);
                    await supabase.from('tracks').insert({
                      artist_id: user.id, title: at.title, genre: albumGenre, language: albumLanguage,
                      explicit: at.explicit, audio_url: audioUrl, artwork_url: artworkUrl,
                      album_id: albumRow.id, track_number: i + 1, release_type: 'album',
                      status: 'pending_review',
                    });
                  }

                  setDone(true);
                } catch (e: any) {
                  setError(e.message ?? 'Album upload failed.');
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading Album…</> : <><Upload className="w-4 h-4" /> Submit Album for Review</>}
            </button>
          </div>
        )}

        {/* ── STEP 0 — Upload ──────────────────────────────────────── */}
        {step === 0 && releaseMode === 'single' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Upload Your Track</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Artwork */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Cover Artwork</p>
                <div
                  onClick={() => artRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-[#9D4EDD]/40 cursor-pointer overflow-hidden bg-[#0B0814] flex items-center justify-center transition-colors group"
                >
                  <input ref={artRef} type="file" className="hidden" accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setArtFile(f); setArtPreview(URL.createObjectURL(f)); }
                    }}
                  />
                  {artPreview
                    ? <img src={artPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2 group-hover:text-[#9D4EDD]/60 transition-colors" />
                        <p className="text-xs text-gray-500">Upload artwork</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">3000×3000px recommended</p>
                      </div>}
                </div>
              </div>

              {/* Audio */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Audio File</p>
                <div
                  onClick={() => audioRef.current?.click()}
                  className={`h-full min-h-[160px] rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center p-6 transition-colors ${
                    audioFile ? 'border-[#00D9FF]/40 bg-[#00D9FF]/5' : 'border-white/10 hover:border-white/20 bg-[#0B0814]'
                  }`}
                >
                  <input ref={audioRef} type="file" className="hidden" accept=".wav,.flac,.mp3"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (!validateAudioFormat(f)) {
                        setError('Only WAV, FLAC, or MP3 files are accepted.');
                        return;
                      }
                      setError('');
                      setAudioFile(f);
                    }}
                  />
                  <Music className={`w-8 h-8 mb-2 ${audioFile ? 'text-[#00D9FF]' : 'text-gray-600'}`} />
                  {audioFile
                    ? <><p className="text-white text-sm font-semibold text-center">{audioFile.name}</p>
                        <p className="text-gray-500 text-xs mt-1">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p></>
                    : <><p className="text-gray-400 text-sm">Click to upload</p>
                        <div className="flex gap-1.5 mt-2">
                          {['WAV','FLAC','MP3'].map(f => <span key={f} className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/5 text-gray-500">{f}</span>)}
                        </div></>}
                </div>
              </div>
            </div>

            {/* Track fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Track Title *</label>
                <input type="text" required value={track.title}
                  onChange={e => setTrack(p => ({ ...p, title: e.target.value }))}
                  className={inputCls} placeholder="Track title" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Artist Name *</label>
                <input type="text" required value={track.artist_name}
                  onChange={e => setTrack(p => ({ ...p, artist_name: e.target.value }))}
                  className={inputCls} placeholder="Your artist name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Genre</label>
                <select value={track.genre} onChange={e => setTrack(p => ({ ...p, genre: e.target.value }))} className={selectCls}>
                  <option value="">Select genre</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Language</label>
                <select value={track.language} onChange={e => setTrack(p => ({ ...p, language: e.target.value }))} className={selectCls}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0B0814] border border-white/10 rounded-xl">
              <div>
                <p className="text-white font-medium text-sm">Explicit Content</p>
                <p className="text-gray-500 text-xs">Contains strong language or adult themes</p>
              </div>
              <button type="button" onClick={() => setTrack(p => ({ ...p, explicit: !p.explicit }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${track.explicit ? 'bg-red-500' : 'bg-gray-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${track.explicit ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button onClick={() => setStep(1)}
              disabled={!track.title || !track.artist_name || !audioFile}
              className="w-full py-3.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              Next: Release Metadata <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 1 — Metadata ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Release Metadata</h2>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Release Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['single','ep','album'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setMeta(p => ({ ...p, release_type: t }))}
                    className={`py-3 rounded-xl text-sm font-semibold capitalize border transition-all ${
                      meta.release_type === t
                        ? 'bg-[#9D4EDD] border-[#9D4EDD] text-white'
                        : 'bg-[#0B0814] border-white/10 text-gray-400 hover:border-white/20'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduled release toggle */}
            <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00D9FF]" />
                Release Timing
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button type="button"
                  onClick={() => setMeta(p => ({ ...p, scheduled: false }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                    !meta.scheduled ? 'border-[#00D9FF] bg-[#00D9FF]/10 text-white' : 'border-white/10 text-white/50 hover:border-white/25'
                  }`}>
                  <Zap className="w-4 h-4" />
                  Release Now
                </button>
                <button type="button"
                  onClick={() => setMeta(p => ({ ...p, scheduled: true }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                    meta.scheduled ? 'border-[#9D4EDD] bg-[#9D4EDD]/10 text-white' : 'border-white/10 text-white/50 hover:border-white/25'
                  }`}>
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
              </div>
              {meta.scheduled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Date</label>
                    <input type="date" value={meta.release_date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setMeta(p => ({ ...p, release_date: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Time (UTC)</label>
                    <input type="time" value={meta.release_time}
                      onChange={e => setMeta(p => ({ ...p, release_time: e.target.value }))}
                      className={inputCls} />
                  </div>
                  {meta.release_date && (
                    <p className="col-span-2 text-[11px] text-[#9D4EDD] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Scheduled: {new Date(`${meta.release_date}T${meta.release_time}:00Z`).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} UTC
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Copyright Owner</label>
                <input type="text" value={meta.copyright_owner}
                  onChange={e => setMeta(p => ({ ...p, copyright_owner: e.target.value }))}
                  className={inputCls} placeholder="© Owner name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Composer</label>
                <input type="text" value={meta.composer}
                  onChange={e => setMeta(p => ({ ...p, composer: e.target.value }))}
                  className={inputCls} placeholder="Composer name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Producer</label>
                <input type="text" value={meta.producer}
                  onChange={e => setMeta(p => ({ ...p, producer: e.target.value }))}
                  className={inputCls} placeholder="Producer name" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Label Name</label>
                <input type="text" value={meta.label_name}
                  onChange={e => setMeta(p => ({ ...p, label_name: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Next: Platform Targets <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 — Platforms ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Distribution Targets</h2>

            {/* Select all toggle */}
            <div className="flex items-center justify-between p-4 bg-[#0B0814] border border-white/10 rounded-xl">
              <div>
                <p className="text-white font-semibold text-sm">Distribute to All Platforms</p>
                <p className="text-gray-500 text-xs">Reach every supported DSP at once</p>
              </div>
              <button type="button"
                onClick={() => setPlatforms(prev => Object.fromEntries(Object.keys(prev).map(k => [k, !allSelected])))}
                className={`w-12 h-6 rounded-full transition-colors relative ${allSelected ? 'bg-[#00D9FF]' : 'bg-gray-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${allSelected ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map(p => (
                <button key={p.key} type="button"
                  onClick={() => setPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    platforms[p.key]
                      ? 'bg-[#9D4EDD]/10 border-[#9D4EDD]/40 text-white'
                      : 'bg-[#0B0814] border-white/10 text-gray-400 hover:border-white/20'
                  }`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${platforms[p.key] ? 'bg-[#9D4EDD]' : 'bg-white/10'}`}>
                    {platforms[p.key] && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Next: Royalty Splits <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Royalties ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Royalty Splits</h2>
            <p className="text-gray-400 text-sm">Default: 70% artist, 30% platform. Add collaborators below.</p>

            <div className="p-5 bg-[#0B0814] border border-white/10 rounded-2xl">
              <RoyaltySplitEditor
                splits={splits}
                onChange={s => {
                  const updated = s.map(r =>
                    r.role === 'artist' && r.label === '' ? { ...r, label: track.artist_name } : r
                  );
                  setSplits(updated);
                }}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={() => setStep(4)} disabled={!splitsValid}
                className="flex-1 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Next: Confirm <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Confirm ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Confirm & Submit</h2>

            <div className="bg-[#0B0814] border border-white/10 rounded-2xl p-5 space-y-4">
              {artPreview && (
                <img src={artPreview} alt="Artwork" className="w-28 h-28 rounded-xl object-cover" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 text-xs">Track</p><p className="text-white font-semibold">{track.title}</p></div>
                <div><p className="text-gray-500 text-xs">Artist</p><p className="text-white font-semibold">{track.artist_name}</p></div>
                <div><p className="text-gray-500 text-xs">Genre</p><p className="text-white">{track.genre}</p></div>
                <div><p className="text-gray-500 text-xs">Type</p><p className="text-white capitalize">{meta.release_type}</p></div>
                <div><p className="text-gray-500 text-xs">Release Date</p><p className="text-white">{meta.release_date || 'Immediate'}</p></div>
                <div><p className="text-gray-500 text-xs">Label</p><p className="text-white">{meta.label_name}</p></div>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-2">Platforms</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.filter(p => platforms[p.key]).map(p => (
                    <span key={p.key} className="px-2 py-0.5 text-xs bg-[#9D4EDD]/20 text-[#9D4EDD] rounded-full">{p.label}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-2">Royalty Splits</p>
                <div className="space-y-1">
                  {splits.map(s => (
                    <div key={s.id} className="flex justify-between text-xs">
                      <span className="text-gray-400 capitalize">{s.role.replace('_', ' ')} {s.label && `· ${s.label}`}</span>
                      <span className="text-white font-semibold">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* License Agreement */}
            <div className={`rounded-2xl border p-4 transition-colors ${licenseAccepted ? 'border-[#00F5A0]/30 bg-[#00F5A0]/5' : 'border-white/10 bg-white/3'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={licenseAccepted}
                    onChange={e => setLicenseAccepted(e.target.checked)}
                    className="accent-[#00F5A0] w-4 h-4"
                  />
                </div>
                <div className="text-sm leading-relaxed">
                  <span className="text-white font-semibold">I accept the WANKONG Creator Content License Agreement.</span>
                  <span className="text-gray-400">
                    {' '}I confirm I own or have rights to this content and grant WANKONG a{' '}
                    <strong className="text-white">non-exclusive worldwide license</strong>{' '}
                    to host, stream, promote, sell, and distribute this recording across the platform and partner networks.
                    I retain full ownership of my master recordings.{' '}
                  </span>
                  <Link
                    to="/creator-license"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9D4EDD] hover:text-[#9D4EDD]/80 underline underline-offset-2 font-semibold transition-colors"
                  >
                    Read full agreement
                  </Link>
                </div>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={submit} disabled={submitting || !licenseAccepted}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Globe className="w-4 h-4" /> Distribute Worldwide</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
