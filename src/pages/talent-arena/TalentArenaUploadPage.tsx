import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { extractVideoMetadata, validateVideoDuration } from '@/services/competition/previewClipService';
import { scoreCompetitionEntry } from '@/services/competition/aiScoringService';
import { getCurrentDrop, dropPhase } from '@/services/competition/arenaDrops';
import { Upload, Video, Image as ImageIcon, CheckCircle, Loader2, AlertCircle, ChevronRight, Trophy } from 'lucide-react';

const CATEGORIES = ['Singing','Rap / Hip-Hop','Dance','Instrumental','Producer','Songwriting','Comedy','Spoken Word','Band / Group'];
const LANGUAGES  = ['English','French','Yoruba','Igbo','Hausa','Swahili','Zulu','Pidgin','Spanish','Portuguese'];

const inputCls  = "w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FFB800]/40 focus:border-[#FFB800]/40 transition-colors";
const selectCls = inputCls + " cursor-pointer";

export default function TalentArenaUploadPage() {
  const navigate   = useNavigate();
  const videoRef   = useRef<HTMLInputElement>(null);
  const thumbRef   = useRef<HTMLInputElement>(null);

  const [videoFile,    setVideoFile]    = useState<File | null>(null);
  const [thumbFile,    setThumbFile]    = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState('');
  const [durationInfo, setDurationInfo] = useState('');
  const [agreed,       setAgreed]       = useState(false);

  const [form, setForm] = useState({
    title:          '',
    performer_name: '',
    category:       '',
    language:       'English',
    song_title:     '',
    source_type:    'independent' as 'church' | 'school' | 'independent',
    is_original:    false,
    room_id:        '',
  });

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['mp4','mov'].includes(ext ?? '')) {
      setError('Only MP4 and MOV files are accepted.');
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('File size must be under 500 MB.');
      return;
    }
    setError('');
    try {
      const { duration, resolution } = await extractVideoMetadata(f);
      const valid = validateVideoDuration(duration);
      if (!valid.valid) { setError(valid.message); return; }
      setDurationInfo(`${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, '0')} · ${resolution}`);
      setVideoFile(f);
    } catch {
      setError('Could not read video metadata. Please try a different file.');
    }
  };

  const submit = async () => {
    if (!agreed) return setError('Please accept the competition rules.');
    if (!videoFile) return setError('Please upload a video.');
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to enter.');

      // Upload video
      const videoPath = `${user.id}/${Date.now()}_${videoFile.name}`;
      const { error: vErr } = await supabase.storage
        .from('competition_videos').upload(videoPath, videoFile, { cacheControl: '3600' });
      if (vErr) throw vErr;
      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('competition_videos').getPublicUrl(videoPath);

      // Upload thumbnail (optional)
      let thumbUrl = '';
      if (thumbFile) {
        const tPath = `${user.id}/${Date.now()}_${thumbFile.name}`;
        await supabase.storage.from('competition_thumbnails').upload(tPath, thumbFile);
        const { data: { publicUrl } } = supabase.storage.from('competition_thumbnails').getPublicUrl(tPath);
        thumbUrl = publicUrl;
      }

      // Extract duration
      const { duration, resolution } = await extractVideoMetadata(videoFile);

      // Attach to the current Arena Drop while its submission window is open
      let dropId: string | null = null;
      try {
        const drop = await getCurrentDrop();
        if (drop && dropPhase(drop) === 'live') dropId = drop.id;
      } catch { /* entry still valid without a drop */ }

      // Insert entry
      const { data: entry, error: entryErr } = await supabase
        .from('competition_entries_v2')
        .insert([{
          drop_id:          dropId,
          user_id:          user.id,
          room_id:          form.room_id || null,
          title:            form.title,
          category:         form.category,
          language:         form.language,
          performer_name:   form.performer_name,
          song_title:       form.song_title,
          source_type:      form.source_type,
          is_original:      form.is_original,
          video_url:        videoUrl,
          thumbnail_url:    thumbUrl || null,
          duration_seconds: Math.round(duration),
          resolution,
          status:           'pending_review',
        }])
        .select()
        .single();
      if (entryErr) throw entryErr;

      // Kick off AI scoring asynchronously
      scoreCompetitionEntry(entry.id).catch(() => {});

      setDone(true);
    } catch (err: any) {
      setError(err.message ?? 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-[#FFB800]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Entry Submitted!</h2>
        <p className="text-gray-400 text-sm mb-4">
          Your performance is under review. Once approved, it's auto-published to WANKONG's official social
          channels first, then to your own connected accounts, and then it goes live on the home page for voting.
        </p>
        <Link to="/dashboard?view=settings" className="inline-flex items-center gap-1.5 text-[#FFB800] text-sm font-semibold hover:underline mb-6">
          Connect your social accounts →
        </Link>
        <div className="flex gap-3 justify-center">
          <Link to="/talent-arena" className="px-5 py-2.5 bg-[#FFB800] text-black font-bold rounded-xl hover:opacity-90 transition-opacity">Talent Arena</Link>
          <button onClick={() => { setDone(false); setVideoFile(null); setThumbFile(null); setThumbPreview(''); setDurationInfo(''); setAgreed(false); setForm({ title: '', performer_name: '', category: '', language: 'English', song_title: '', source_type: 'independent', is_original: false, room_id: '' }); }}
            className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">
            Submit Another
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link to="/talent-arena" className="hover:text-white transition-colors">Talent Arena</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">Submit Entry</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#FFB800]/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#FFB800]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Submit Your Performance</h1>
            <p className="text-gray-400 text-sm">Video must be 2–8 minutes · MP4 or MOV · Max 500 MB</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Video upload */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Performance Video *</p>
            <div
              onClick={() => videoRef.current?.click()}
              className={`p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors text-center ${
                videoFile ? 'border-[#FFB800]/40 bg-[#FFB800]/5' : 'border-white/10 hover:border-white/20 bg-[#0B0814]'
              }`}
            >
              <input ref={videoRef} type="file" className="hidden" accept=".mp4,.mov" onChange={handleVideo} />
              <Video className={`w-10 h-10 mx-auto mb-3 ${videoFile ? 'text-[#FFB800]' : 'text-gray-600'}`} />
              {videoFile
                ? <>
                    <p className="text-white font-semibold">{videoFile.name}</p>
                    <p className="text-[#FFB800] text-sm mt-1">{durationInfo}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </>
                : <>
                    <p className="text-gray-400">Click to upload your performance video</p>
                    <p className="text-gray-600 text-xs mt-1">MP4 · MOV · 2–8 minutes · Under 500 MB</p>
                  </>}
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Thumbnail <span className="normal-case text-gray-600">(optional)</span></p>
            <div
              onClick={() => thumbRef.current?.click()}
              className="p-5 rounded-xl border border-dashed border-white/10 hover:border-white/20 cursor-pointer bg-[#0B0814] flex items-center gap-4 transition-colors group"
            >
              <input ref={thumbRef} type="file" className="hidden" accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }
                }}
              />
              {thumbPreview
                ? <img src={thumbPreview} alt="Thumbnail" className="w-16 h-10 rounded object-cover shrink-0" />
                : <ImageIcon className="w-8 h-8 text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors" />}
              <div>
                <p className="text-gray-400 text-sm">{thumbPreview ? thumbFile?.name : 'Upload thumbnail image'}</p>
                <p className="text-gray-600 text-xs">JPG or PNG · 16:9 ratio</p>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Video Title *</label>
              <input type="text" required value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className={inputCls} placeholder="Give your entry a title" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Performer Name *</label>
              <input type="text" required value={form.performer_name}
                onChange={e => setForm(p => ({ ...p, performer_name: e.target.value }))}
                className={inputCls} placeholder="Your name or group name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Song Title</label>
              <input type="text" value={form.song_title}
                onChange={e => setForm(p => ({ ...p, song_title: e.target.value }))}
                className={inputCls} placeholder="Song being performed" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={selectCls}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Language</label>
              <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} className={selectCls}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Representing</label>
              <select value={form.source_type} onChange={e => setForm(p => ({ ...p, source_type: e.target.value as any }))} className={selectCls}>
                <option value="church">Church</option>
                <option value="school">School</option>
                <option value="independent">Independent</option>
              </select>
            </div>
          </div>

          {/* Original / Cover */}
          <div className="flex items-center gap-4">
            {['original', 'cover'].map(v => (
              <button key={v} type="button"
                onClick={() => setForm(p => ({ ...p, is_original: v === 'original' }))}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border capitalize transition-all ${
                  (v === 'original') === form.is_original
                    ? 'bg-[#FFB800]/20 border-[#FFB800]/40 text-[#FFB800]'
                    : 'bg-[#0B0814] border-white/10 text-gray-400 hover:border-white/20'
                }`}>
                {v === 'original' ? 'Original Song' : 'Cover Song'}
              </button>
            ))}
          </div>

          {/* Agreement */}
          <div className="flex items-start gap-3 p-4 bg-[#0B0814] border border-white/10 rounded-xl">
            <button type="button" onClick={() => setAgreed(p => !p)}
              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${agreed ? 'bg-[#FFB800] border-[#FFB800]' : 'border-gray-600 bg-transparent'}`}>
              {agreed && <span className="text-black text-xs font-black">✓</span>}
            </button>
            <p className="text-gray-400 text-xs leading-relaxed">
              I confirm this performance is original or properly licensed for competition use. I grant WANKONG a non-exclusive licence to display and promote this entry. I accept the{' '}
              <Link to="/terms-of-service" className="text-[#FFB800] hover:underline">competition rules</Link>.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button onClick={submit}
            disabled={submitting || !videoFile || !form.title || !form.performer_name || !agreed}
            className="w-full py-4 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-base">
            {submitting
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading…</>
              : <><Upload className="w-5 h-5" /> Submit to Talent Arena</>}
          </button>
        </div>
      </div>
    </div>
  );
}
