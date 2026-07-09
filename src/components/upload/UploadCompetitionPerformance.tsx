import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';
import { validateVideoDuration, extractVideoMetadata, generatePreviewClip } from '@/services/competition/previewClipService';
import { pushAll } from '@/services/competition/socialPreviewPushService';
import { scoreCompetitionEntry } from '@/services/competition/aiScoringService';

const CATEGORIES = ['Singing','Rap/Hip-Hop','Instrumental','Dance','Comedy','Poetry','Acting','Spoken Word','Gospel','Traditional'];
const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'sw', name: 'Swahili' },
  { code: 'yo', name: 'Yoruba' }, { code: 'ha', name: 'Hausa' }, { code: 'ig', name: 'Igbo' },
  { code: 'es', name: 'Spanish' }, { code: 'pt', name: 'Portuguese' },
];

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';

interface Props { onSuccess: () => void; }

export default function UploadCompetitionPerformance({ onSuccess }: Props) {
  const { user } = useApp();

  const [title,       setTitle]       = useState('');
  const [artistName,  setArtistName]  = useState('');
  const [category,    setCategory]    = useState('');
  const [language,    setLanguage]    = useState('en');
  const [description, setDescription] = useState('');
  const [competitionId, setCompetitionId] = useState('');

  const [videoFile,   setVideoFile]   = useState<File | null>(null);
  const [videoMeta,   setVideoMeta]   = useState<{ duration: number; resolution: string } | null>(null);
  const [durationErr, setDurationErr] = useState('');
  const videoRef = useRef<HTMLInputElement>(null);

  const [stage,       setStage]       = useState<'idle'|'uploading'|'scoring'|'social'|'done'>('idle');
  const [progress,    setProgress]    = useState(0);
  const [stageLabel,  setStageLabel]  = useState('');
  const [error,       setError]       = useState('');
  const [scoreResult, setScoreResult] = useState<{ total_score: number } | null>(null);

  const handleVideo = async (file: File) => {
    setDurationErr('');
    setVideoFile(null);
    setVideoMeta(null);

    if (!file.name.match(/\.(mp4|mov|webm)$/i)) {
      setError('Video must be MP4, MOV or WEBM.'); return;
    }
    setError('');

    try {
      const meta = await extractVideoMetadata(file);
      const check = validateVideoDuration(meta.duration);
      if (!check.valid) { setDurationErr(check.message); return; }
      setVideoFile(file);
      setVideoMeta(meta);
    } catch {
      setError('Could not read video metadata. Please try another file.');
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artistName || !category) {
      setError('Title, artist name and category are required.'); return;
    }
    if (!videoFile || !videoMeta) { setError('Please upload a valid video (MP4/MOV/WEBM, 2–8 minutes).'); return; }

    setError('');
    setStage('uploading');
    setStageLabel('Uploading performance video...');
    setProgress(10);

    try {
      // 1. Insert competition entry
      const { data: entry, error: entryErr } = await supabase
        .from('competition_entries')
        .insert([{
          creator_id:       user?.id ?? null,
          title,
          description,
          competition_id:   competitionId || null,
          video_url:        videoFile.name, // production: upload to storage first
          duration_seconds: Math.round(videoMeta.duration),
          resolution:       videoMeta.resolution,
          status:           'processing',
        }])
        .select().single();
      if (entryErr) throw entryErr;

      const entryId = entry.id;
      setProgress(30);

      // 2. Generate preview clip
      setStageLabel('Generating preview clip...');
      let previewUrl = '';
      try {
        previewUrl = await generatePreviewClip(entryId, videoFile.name);
      } catch {
        // non-fatal: continue without preview
      }
      setProgress(50);

      // 3. AI scoring
      setStage('scoring');
      setStageLabel('Running AI performance analysis...');
      let scores: { total_score: number } | null = null;
      try {
        scores = await scoreCompetitionEntry(entryId);
        setScoreResult(scores);
      } catch {
        // non-fatal
      }
      setProgress(75);

      // 4. Social preview push
      if (previewUrl) {
        setStage('social');
        setStageLabel('Pushing preview to social platforms...');
        try {
          await pushAll({
            entryId,
            previewClipUrl: previewUrl,
            title,
            artistName,
            wankongUrl: `https://wankong.com/competition/${entryId}`,
          });
        } catch {
          // non-fatal
        }
      }
      setProgress(90);

      // 5. Mark live
      await supabase
        .from('competition_entries')
        .update({ status: 'live', preview_clip_url: previewUrl || null, updated_at: new Date().toISOString() })
        .eq('id', entryId);

      setProgress(100);
      setStage('done');
      setTimeout(() => onSuccess(), 1200);
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
      setStage('idle');
      setProgress(0);
    }
  };

  if (stage === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Entry Submitted!</h2>
        {scoreResult && (
          <div className="text-center">
            <p className="text-gray-400">AI Score</p>
            <p className="text-4xl font-bold text-[#B794F4]">{scoreResult.total_score.toFixed(1)}<span className="text-lg text-gray-400">/100</span></p>
          </div>
        )}
        <p className="text-gray-400 text-sm">Your performance is now live. Preview clips have been pushed to social platforms.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Competition Performance</h2>
        <p className="text-sm text-gray-400 mt-1">Submit a 2–8 minute video for AI scoring and public voting.</p>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Pipeline steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {['Upload', 'Preview Clip', 'AI Scoring', 'Social Push', 'Live'].map((step, i) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 ${i === 0 && stage !== 'idle' ? 'text-[#B794F4]' : i === 1 && (stage === 'scoring' || stage === 'social' || stage === 'done') ? 'text-[#B794F4]' : i === 2 && (stage === 'scoring' || stage === 'social' || stage === 'done') ? 'text-[#B794F4]' : i === 3 && (stage === 'social' || stage === 'done') ? 'text-[#B794F4]' : i === 4 && stage === 'done' ? 'text-emerald-400' : 'text-gray-600'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 4 && stage === 'done' ? 'bg-emerald-500/20' : 'bg-gray-800'}`}>{i + 1}</div>
              <span>{step}</span>
            </div>
            {i < 4 && <div className="flex-1 h-px bg-gray-800 max-w-6" />}
          </React.Fragment>
        ))}
      </div>

      {/* Performance info */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Performance Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={lbl}>Performance Title *</label><input className={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Original Song – Spring Vibes" required /></div>
          <div><label className={lbl}>Artist / Performer *</label><input className={inp} value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Your stage name" required /></div>
          <div><label className={lbl}>Category *</label>
            <select className={inp} value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">Select category</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Language</label>
            <select className={inp} value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2"><label className={lbl}>Competition ID (optional)</label><input className={inp} value={competitionId} onChange={e => setCompetitionId(e.target.value)} placeholder="Leave blank to enter the open competition" /></div>
        </div>
        <div><label className={lbl}>Description / Song Notes</label><textarea className={inp + ' resize-none'} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell the judges about your performance..." /></div>
      </section>

      {/* Video upload */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Performance Video</h3>
        <div className="grid grid-cols-3 gap-3 text-xs text-center">
          <div className="bg-gray-800/60 rounded-lg p-3"><p className="text-gray-400">Format</p><p className="text-white font-medium mt-1">MP4 · MOV · WEBM</p></div>
          <div className="bg-gray-800/60 rounded-lg p-3"><p className="text-gray-400">Min Duration</p><p className="text-white font-medium mt-1">2 minutes</p></div>
          <div className="bg-gray-800/60 rounded-lg p-3"><p className="text-gray-400">Max Duration</p><p className="text-white font-medium mt-1">8 minutes</p></div>
        </div>

        {durationErr && <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">{durationErr}</div>}

        <div onClick={() => videoRef.current?.click()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${videoFile ? 'border-emerald-500/50 bg-emerald-500/5' : durationErr ? 'border-amber-500/50' : 'border-gray-700 hover:border-[#9D4EDD]'}`}>
          <input ref={videoRef} type="file" className="hidden" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" onChange={e => { const f = e.target.files?.[0]; if (f) handleVideo(f); }} />
          {videoFile && videoMeta ? (
            <div className="space-y-2">
              <svg className="w-10 h-10 text-emerald-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <p className="text-white font-medium">{videoFile.name}</p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span>Duration: {formatDuration(videoMeta.duration)}</span>
                <span>·</span>
                <span>Resolution: {videoMeta.resolution}</span>
                <span>·</span>
                <span>{(videoFile.size / 1024 / 1024).toFixed(0)} MB</span>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); setVideoFile(null); setVideoMeta(null); }} className="text-xs text-red-400 hover:text-red-300 mt-1">Remove</button>
            </div>
          ) : (
            <div>
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <p className="text-gray-300 font-medium">Click to upload your performance</p>
              <p className="text-gray-500 text-sm mt-1">MP4, MOV or WEBM · 2–8 minutes</p>
            </div>
          )}
        </div>

        {/* What happens after upload */}
        <div className="bg-[#9D4EDD]/5 border border-[#9D4EDD]/20 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-[#C9B3F5]">After submission:</p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• A 30-second preview clip will be auto-generated</li>
            <li>• Our AI will score your performance across 5 criteria</li>
            <li>• Preview clips will be pushed to YouTube Shorts, Instagram Reels & TikTok</li>
            <li>• Public voting opens immediately</li>
          </ul>
        </div>
      </section>

      {/* Progress */}
      {stage !== 'idle' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-white">{stageLabel}</span>
            <span className="text-sm text-[#B794F4]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="bg-[#9D4EDD] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {scoreResult && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              AI Score: {scoreResult.total_score.toFixed(1)} / 100
            </div>
          )}
        </div>
      )}

      <button type="submit" disabled={stage !== 'idle' || !title || !artistName || !videoFile}
        className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base">
        {stage !== 'idle' ? stageLabel : 'Submit Competition Performance'}
      </button>
    </form>
  );
}
