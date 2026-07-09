import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';

const validateArtwork = (file: File): Promise<string | null> =>
  new Promise(resolve => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) { resolve('Cover must be JPG or PNG.'); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width !== img.height) resolve('Cover must be square.');
      else if (img.width < 3000) resolve(`Cover must be at least 3000×3000 px (got ${img.width}×${img.height}).`);
      else resolve(null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve('Could not read image.'); };
    img.src = url;
  });

const CATEGORIES = ['Technology','Business','Education','Entertainment','Health','News','Sports','True Crime','Comedy','Society','Science','Arts','Religion','Government'];
const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'sw', name: 'Swahili' },
  { code: 'yo', name: 'Yoruba' }, { code: 'ha', name: 'Hausa' }, { code: 'ig', name: 'Igbo' },
  { code: 'es', name: 'Spanish' }, { code: 'pt', name: 'Portuguese' }, { code: 'ar', name: 'Arabic' },
];

const PODCAST_PLATFORMS = [
  { id: 'spotify',    name: 'Spotify' },
  { id: 'apple_pod',  name: 'Apple Podcasts' },
  { id: 'google_pod', name: 'Google Podcasts' },
  { id: 'amazon_mu',  name: 'Amazon Music' },
  { id: 'youtube',    name: 'YouTube Music' },
  { id: 'deezer',     name: 'Deezer' },
  { id: 'pocketcasts', name: 'Pocket Casts' },
  { id: 'overcast',   name: 'Overcast' },
  { id: 'stitcher',   name: 'Stitcher' },
  { id: 'iheartradio',name: 'iHeartRadio' },
];

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';

interface Props { onSuccess: () => void; }

export default function UploadPodcast({ onSuccess }: Props) {
  const { user } = useApp();

  // Episode info
  const [episodeTitle, setEpisodeTitle]   = useState('');
  const [showName,     setShowName]       = useState('');
  const [host,         setHost]           = useState('');
  const [episodeNumber,setEpisodeNumber]  = useState('');
  const [seasonNumber, setSeasonNumber]   = useState('');
  const [category,     setCategory]       = useState('');
  const [language,     setLanguage]       = useState('en');
  const [description,  setDescription]    = useState('');
  const [explicit,     setExplicit]       = useState(false);
  const [publishDate,  setPublishDate]    = useState('');
  const [websiteUrl,   setWebsiteUrl]     = useState('');

  const [audioFile,    setAudioFile]      = useState<File | null>(null);
  const [coverFile,    setCoverFile]      = useState<File | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [platforms, setPlatforms] = useState<Record<string, boolean>>(
    Object.fromEntries(PODCAST_PLATFORMS.map(p => [p.id, true]))
  );

  const [submitting, setSubmitting] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState('');

  const handleCover = async (file: File) => {
    const err = await validateArtwork(file);
    if (err) { setError(err); return; }
    setCoverFile(file);
    setError('');
  };

  const handleAudio = (file: File) => {
    if (!file.name.match(/\.(mp3|wav|m4a|ogg|aac)$/i)) {
      setError('Podcast audio must be MP3, WAV, M4A, OGG or AAC.'); return;
    }
    setAudioFile(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!episodeTitle || !showName || !host) {
      setError('Episode title, show name and host are required.'); return;
    }
    setSubmitting(true); setError('');
    const ticker = setInterval(() => setProgress(p => p < 85 ? p + Math.random() * 12 : p), 400);

    try {
      const { data: release, error: relErr } = await supabase
        .from('releases')
        .insert([{
          creator_id:    user?.id ?? null,
          release_title: episodeTitle,
          release_type:  'podcast',
          primary_artist: host,
          genre:         category,
          language,
          description,
          explicit,
          release_date:  publishDate || null,
          status:        'processing',
        }])
        .select().single();
      if (relErr) throw relErr;

      const releaseId = release.id;

      // Track record for the episode
      await supabase.from('tracks').insert([{
        release_id:   releaseId,
        artist_id:    user?.id ?? null,
        creator_id:   user?.id ?? null,
        track_number: parseInt(episodeNumber, 10) || 1,
        title:        episodeTitle,
        explicit,
      }]);

      // Distribution targets
      await supabase.from('distribution_targets').insert(
        PODCAST_PLATFORMS.map(p => ({ release_id: releaseId, platform: p.name, enabled: platforms[p.id], status: platforms[p.id] ? 'pending' : 'disabled' }))
      );

      await supabase.from('releases').update({ status: 'submitted', updated_at: new Date().toISOString() }).eq('id', releaseId);

      clearInterval(ticker); setProgress(100);
      setTimeout(() => { setSubmitting(false); onSuccess(); }, 600);
    } catch (err: any) {
      clearInterval(ticker);
      setError(err.message || 'Submission failed.');
      setSubmitting(false); setProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Podcast Episode</h2>
        <p className="text-sm text-gray-400 mt-1">Publish an episode to all major podcast platforms.</p>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Episode info */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Episode Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={lbl}>Episode Title *</label><input className={inp} value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)} placeholder="Episode title" required /></div>
          <div><label className={lbl}>Show / Podcast Name *</label><input className={inp} value={showName} onChange={e => setShowName(e.target.value)} placeholder="Your podcast name" required /></div>
          <div><label className={lbl}>Host Name *</label><input className={inp} value={host} onChange={e => setHost(e.target.value)} placeholder="Host or presenter name" required /></div>
          <div><label className={lbl}>Publish Date</label><input type="date" className={inp} value={publishDate} onChange={e => setPublishDate(e.target.value)} /></div>
          <div><label className={lbl}>Episode #</label><input type="number" className={inp} value={episodeNumber} onChange={e => setEpisodeNumber(e.target.value)} placeholder="1" min="1" /></div>
          <div><label className={lbl}>Season #</label><input type="number" className={inp} value={seasonNumber} onChange={e => setSeasonNumber(e.target.value)} placeholder="1" min="1" /></div>
          <div><label className={lbl}>Category</label>
            <select className={inp} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select category</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Language</label>
            <select className={inp} value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2"><label className={lbl}>Website / Show Link</label><input className={inp} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yourpodcast.com" type="url" /></div>
        </div>
        <div><label className={lbl}>Episode Description</label><textarea className={inp + ' resize-none'} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this episode about?" /></div>
        <div className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-3">
          <div><p className="text-sm font-medium text-white">Explicit Content</p><p className="text-xs text-gray-400">Contains mature language or themes</p></div>
          <button type="button" onClick={() => setExplicit(!explicit)} className={`w-12 h-6 rounded-full relative transition-colors ${explicit ? 'bg-red-500' : 'bg-gray-700'}`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${explicit ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </section>

      {/* Files */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Files</h3>

        {/* Podcast audio */}
        <div>
          <label className={lbl}>Episode Audio (MP3, WAV, M4A, OGG, AAC)</label>
          <div onClick={() => audioRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${audioFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-[#9D4EDD]'}`}>
            <input ref={audioRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,.ogg,.aac,audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleAudio(f); }} />
            {audioFile
              ? <div className="flex items-center justify-center gap-3"><svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><div className="text-left"><p className="text-white text-sm font-medium">{audioFile.name}</p><p className="text-gray-400 text-xs">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p></div><button type="button" onClick={e => { e.stopPropagation(); setAudioFile(null); }} className="ml-4 text-xs text-red-400">Remove</button></div>
              : <div><svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg><p className="text-gray-300 text-sm">Click to upload episode audio</p><p className="text-gray-500 text-xs mt-1">MP3 recommended</p></div>
            }
          </div>
        </div>

        {/* Cover art */}
        <div>
          <label className={lbl}>Podcast Cover Art</label>
          <p className="text-xs text-gray-500 mb-2">Minimum 3000×3000 px · Square · JPG or PNG</p>
          <div onClick={() => coverRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${coverFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-[#9D4EDD]'}`}>
            <input ref={coverRef} type="file" className="hidden" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) handleCover(f); }} />
            {coverFile
              ? <div className="flex items-center justify-center gap-3"><svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><p className="text-white text-sm">{coverFile.name}</p><button type="button" onClick={e => { e.stopPropagation(); setCoverFile(null); }} className="text-xs text-red-400 ml-2">Remove</button></div>
              : <p className="text-gray-400 text-sm">Click to upload cover art (JPG/PNG, 3000×3000 min)</p>
            }
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Podcast Platforms</h3>
          <button type="button" onClick={() => setPlatforms(Object.fromEntries(PODCAST_PLATFORMS.map(p => [p.id, true])))} className="text-xs text-[#B794F4] hover:text-[#C9B3F5]">Select All</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PODCAST_PLATFORMS.map(p => (
            <button key={p.id} type="button" onClick={() => setPlatforms(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${platforms[p.id] ? 'bg-[#9D4EDD]/20 border-[#9D4EDD]/50 text-[#C9B3F5]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {submitting && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex justify-between mb-2"><span className="text-sm text-white">Publishing podcast episode...</span><span className="text-sm text-[#B794F4]">{Math.round(progress)}%</span></div>
          <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-[#9D4EDD] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <button type="submit" disabled={submitting || !episodeTitle || !showName || !host}
        className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base">
        {submitting ? 'Publishing Episode...' : 'Publish Podcast Episode'}
      </button>
    </form>
  );
}
