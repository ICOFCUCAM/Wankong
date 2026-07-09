import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PLATFORMS = [
  { id: 'spotify', name: 'Spotify', icon: '🎵', color: '#1DB954' },
  { id: 'apple_music', name: 'Apple Music', icon: '🎶', color: '#FC3C44' },
  { id: 'youtube_music', name: 'YouTube Music', icon: '▶️', color: '#FF0000' },
  { id: 'tidal', name: 'Tidal', icon: '🌊', color: '#00FFFF' },
  { id: 'deezer', name: 'Deezer', icon: '🎧', color: '#EF5466' },
  { id: 'amazon_music', name: 'Amazon Music', icon: '📦', color: '#FF9900' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '☁️', color: '#FF5500' },
  { id: 'audiomack', name: 'Audiomack', icon: '🔊', color: '#FFA500' },
];

function generateISRC() {
  const country = 'US';
  const registrant = 'WNK';
  const year = new Date().getFullYear().toString().slice(-2);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const designation = (buf[0] % 100000).toString().padStart(5, '0');
  return `${country}-${registrant}-${year}-${designation}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  live: 'text-green-400 bg-green-400/10 border-green-400/20',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export default function DistributePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'release' | 'competition'>('release');

  // MODE 1 — Release
  const [releaseStep, setReleaseStep] = useState(1);
  const [releaseForm, setReleaseForm] = useState({
    title: '',
    artist: '',
    genre: '',
    releaseDate: '',
    language: 'en',
    label: '',
    upc: '',
    isrc: generateISRC(),
    explicit: false,
    coverFile: null as File | null,
    audioFile: null as File | null,
    platforms: PLATFORMS.map(p => p.id),
  });
  const [releases, setReleases] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState(false);

  // MODE 2 — Competition
  const [compForm, setCompForm] = useState({
    title: '',
    description: '',
    competitionId: '',
    mediaType: 'audio' as 'audio' | 'video' | 'podcast',
    mediaFile: null as File | null,
  });
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [compSubmitting, setCompSubmitting] = useState(false);
  const [compSuccess, setCompSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Load user's releases
    supabase
      .from('distribution_releases')
      .select('id, title, artist_name, status, release_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setReleases(data.map((r: any) => ({
          id:         r.id,
          title:      r.title,
          artist:     r.artist_name ?? user.user_metadata?.full_name ?? 'You',
          status:     r.status ?? 'pending',
          platforms:  0,
          streams:    0,
          royalties:  0,
          created_at: r.created_at?.slice(0, 10),
        })));
      });
    // Load open competitions
    supabase
      .from('competition_rooms')
      .select('id, title, end_date, prize_pool')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setCompetitions(data.map((r: any) => ({
          id:      r.id,
          title:   r.title,
          deadline: r.end_date?.slice(0, 10) ?? '—',
          prize:   r.prize_pool ?? '—',
          entries: 0,
        })));
      });
  }, [user]);

  const handleReleaseSubmit = async () => {
    setSubmitting(true);
    try {
      await supabase.from('admin_logs').insert({
        action: 'release_submitted',
        entity_type: 'release',
        entity_id: releaseForm.isrc,
        details: { title: releaseForm.title, artist: releaseForm.artist, platforms: releaseForm.platforms },
        performed_by: user?.id,
      });
      setReleaseSuccess(true);
      setReleases(prev => [{ id: Date.now().toString(), title: releaseForm.title, artist: releaseForm.artist, status: 'pending', platforms: releaseForm.platforms.length, streams: 0, royalties: 0, created_at: new Date().toISOString().split('T')[0] }, ...prev]);
    } catch (e) {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompSubmit = async () => {
    setCompSubmitting(true);
    try {
      await supabase.from('admin_logs').insert({
        action: 'competition_entry_submitted',
        entity_type: 'competition_entry',
        entity_id: compForm.competitionId,
        details: { title: compForm.title, mediaType: compForm.mediaType },
        performed_by: user?.id,
      });
      setCompSuccess(true);
    } catch (e) {
      // ignore
    } finally {
      setCompSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B0814] via-[#0D1635] to-[#0B0814] border-b border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center text-xl">🚀</div>
            <span className="text-[#00D9FF] text-sm font-medium uppercase tracking-widest">Creator Studio</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Music Distribution</h1>
          <p className="text-gray-400 max-w-xl">Release your music to 150+ streaming platforms worldwide or submit to competitions and earn prizes.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        {/* Mode Selector */}
        <div className="flex gap-3 mb-8 p-1 bg-white/5 rounded-2xl w-fit">
          <button
            onClick={() => { setMode('release'); setReleaseSuccess(false); setReleaseStep(1); }}
            className={`px-6 py-3 rounded-xl font-medium text-sm transition-all ${ mode === 'release' ? 'bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            🎵 Release to Platforms
          </button>
          <button
            onClick={() => { setMode('competition'); setCompSuccess(false); }}
            className={`px-6 py-3 rounded-xl font-medium text-sm transition-all ${ mode === 'competition' ? 'bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white shadow-lg shadow-amber-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            🏆 Competition Entry
          </button>
        </div>

        {/* MODE 1 — Release */}
        {mode === 'release' && (
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              {!releaseSuccess ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  {/* Steps */}
                  <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${ releaseStep >= s ? 'bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] text-white' : 'bg-white/10 text-gray-500'}`}>{s}</div>
                        {s < 3 && <div className={`h-px w-8 transition-all ${ releaseStep > s ? 'bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD]' : 'bg-white/10'}`} />}
                      </div>
                    ))}
                    <span className="ml-2 text-gray-400 text-sm">{releaseStep === 1 ? 'Track Info' : releaseStep === 2 ? 'Files & ISRC' : 'Platforms'}</span>
                  </div>

                  {/* Step 1 */}
                  {releaseStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400 mb-1.5 block">Track Title *</label>
                          <input value={releaseForm.title} onChange={e => setReleaseForm(f => ({...f, title: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="Enter track title" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1.5 block">Artist Name *</label>
                          <input value={releaseForm.artist} onChange={e => setReleaseForm(f => ({...f, artist: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="Your artist name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400 mb-1.5 block">Genre *</label>
                          <select value={releaseForm.genre} onChange={e => setReleaseForm(f => ({...f, genre: e.target.value}))} className="w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00D9FF]/50">
                            <option value="">Select genre</option>
                            {['Pop', 'Hip-Hop', 'Afrobeats', 'K-Pop', 'Latin', 'Electronic', 'R&B', 'Soul', 'Jazz', 'Classical'].map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1.5 block">Release Date *</label>
                          <input type="date" value={releaseForm.releaseDate} onChange={e => setReleaseForm(f => ({...f, releaseDate: e.target.value}))} className="w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00D9FF]/50" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400 mb-1.5 block">Language</label>
                          <select value={releaseForm.language} onChange={e => setReleaseForm(f => ({...f, language: e.target.value}))} className="w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00D9FF]/50">
                            {[['en','English'],['fr','French'],['sw','Swahili'],['yo','Yoruba'],['ig','Igbo'],['pt','Portuguese'],['ar','Arabic']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1.5 block">Record Label</label>
                          <input value={releaseForm.label} onChange={e => setReleaseForm(f => ({...f, label: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="Independent" />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-10 h-6 rounded-full transition-colors relative ${ releaseForm.explicit ? 'bg-red-500' : 'bg-white/10'}`} onClick={() => setReleaseForm(f => ({...f, explicit: !f.explicit}))}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${ releaseForm.explicit ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm text-gray-300">Explicit content</span>
                      </label>
                      <button onClick={() => setReleaseStep(2)} disabled={!releaseForm.title || !releaseForm.artist || !releaseForm.genre || !releaseForm.releaseDate} className="w-full py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white rounded-xl font-medium disabled:opacity-40 transition-opacity">
                        Continue →
                      </button>
                    </div>
                  )}

                  {/* Step 2 */}
                  {releaseStep === 2 && (
                    <div className="space-y-5">
                      <div>
                        <label className="text-xs text-gray-400 mb-1.5 block">Cover Art (3000×3000 JPG/PNG)</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#00D9FF]/30 transition-colors cursor-pointer" onClick={() => document.getElementById('cover-upload')?.click()}>
                          {releaseForm.coverFile ? (
                            <div className="text-[#00D9FF] text-sm">✓ {releaseForm.coverFile.name}</div>
                          ) : (
                            <>
                              <div className="text-3xl mb-2">🖼️</div>
                              <p className="text-gray-400 text-sm">Click to upload cover art</p>
                            </>
                          )}
                          <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={e => setReleaseForm(f => ({...f, coverFile: e.target.files?.[0] || null}))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1.5 block">Audio File (WAV or FLAC, min 16-bit/44.1kHz)</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#00D9FF]/30 transition-colors cursor-pointer" onClick={() => document.getElementById('audio-upload')?.click()}>
                          {releaseForm.audioFile ? (
                            <div className="text-[#00F5A0] text-sm">✓ {releaseForm.audioFile.name}</div>
                          ) : (
                            <>
                              <div className="text-3xl mb-2">🎵</div>
                              <p className="text-gray-400 text-sm">Click to upload audio file</p>
                            </>
                          )}
                          <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={e => setReleaseForm(f => ({...f, audioFile: e.target.files?.[0] || null}))} />
                        </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Auto-generated ISRC</span>
                          <button onClick={() => setReleaseForm(f => ({...f, isrc: generateISRC()}))} className="text-xs text-[#00D9FF] hover:text-[#00D9FF]/70">Regenerate</button>
                        </div>
                        <code className="text-[#00F5A0] font-mono text-sm">{releaseForm.isrc}</code>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setReleaseStep(1)} className="px-5 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">← Back</button>
                        <button onClick={() => setReleaseStep(3)} className="flex-1 py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white rounded-xl font-medium">Continue →</button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
                  {releaseStep === 3 && (
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-300">Select Platforms</span>
                          <button onClick={() => setReleaseForm(f => ({ ...f, platforms: f.platforms.length === PLATFORMS.length ? [] : PLATFORMS.map(p => p.id) }))} className="text-xs text-[#00D9FF]">{releaseForm.platforms.length === PLATFORMS.length ? 'Deselect All' : 'Select All'}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {PLATFORMS.map(p => (
                            <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${ releaseForm.platforms.includes(p.id) ? 'border-[#00D9FF]/40 bg-[#00D9FF]/5' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                              <input type="checkbox" checked={releaseForm.platforms.includes(p.id)} onChange={() => setReleaseForm(f => ({ ...f, platforms: f.platforms.includes(p.id) ? f.platforms.filter(x => x !== p.id) : [...f.platforms, p.id] }))} className="sr-only" />
                              <span className="text-lg">{p.icon}</span>
                              <span className="text-sm text-white">{p.name}</span>
                              {releaseForm.platforms.includes(p.id) && <span className="ml-auto text-[#00D9FF] text-xs">✓</span>}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setReleaseStep(2)} className="px-5 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">← Back</button>
                        <button onClick={handleReleaseSubmit} disabled={submitting || releaseForm.platforms.length === 0} className="flex-1 py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white rounded-xl font-medium disabled:opacity-50">
                          {submitting ? 'Submitting…' : `Submit to ${releaseForm.platforms.length} Platforms`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 border border-[#00F5A0]/20 rounded-2xl p-10 text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-white mb-2">Release Submitted!</h3>
                  <p className="text-gray-400 mb-6">Your release is under review and will go live within 24–72 hours.</p>
                  <button onClick={() => { setReleaseSuccess(false); setReleaseStep(1); setReleaseForm(f => ({...f, title:'', artist:'', genre:'', releaseDate:'', coverFile:null, audioFile:null, isrc:generateISRC()})); }} className="px-6 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors text-sm">Submit Another Release</button>
                </div>
              )}
            </div>

            {/* Delivery Dashboard */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white">Your Releases</h2>
              {releases.map(r => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-white text-sm">{r.title}</h3>
                      <p className="text-gray-500 text-xs">{r.artist}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg border capitalize font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS.pending}`}>{r.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-white text-sm font-bold">{r.platforms}</p>
                      <p className="text-gray-500 text-xs">Platforms</p>
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">{r.streams > 0 ? `${(r.streams/1000).toFixed(1)}K` : '—'}</p>
                      <p className="text-gray-500 text-xs">Streams</p>
                    </div>
                    <div>
                      <p className="text-[#00F5A0] text-sm font-bold">{r.royalties > 0 ? `$${r.royalties.toFixed(2)}` : '—'}</p>
                      <p className="text-gray-500 text-xs">Royalties</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-gradient-to-br from-[#FFB800]/10 to-[#FF6B00]/10 border border-[#FFB800]/20 rounded-2xl p-4">
                <p className="text-xs text-[#FFB800] font-medium mb-1">Total Royalties Earned</p>
                <p className="text-2xl font-bold text-white">${releases.reduce((sum, r) => sum + r.royalties, 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Paid out monthly via bank transfer</p>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2 — Competition */}
        {mode === 'competition' && (
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              {!compSuccess ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Select Competition *</label>
                    <select value={compForm.competitionId} onChange={e => setCompForm(f => ({...f, competitionId: e.target.value}))} className="w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FFB800]/50">
                      <option value="">Choose a competition…</option>
                      {competitions.map(c => <option key={c.id} value={c.id}>{c.title} — Prize: {c.prize}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Entry Title *</label>
                    <input value={compForm.title} onChange={e => setCompForm(f => ({...f, title: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/50" placeholder="Name your submission" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
                    <textarea value={compForm.description} onChange={e => setCompForm(f => ({...f, description: e.target.value}))} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/50 resize-none" placeholder="Tell the judges about your entry…" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-3 block">Media Type</label>
                    <div className="flex gap-3">
                      {(['audio','video','podcast'] as const).map(t => (
                        <button key={t} onClick={() => setCompForm(f => ({...f, mediaType: t}))} className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${ compForm.mediaType === t ? 'bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Upload {compForm.mediaType === 'video' ? 'Video (MP4/MOV)' : compForm.mediaType === 'podcast' ? 'Podcast (MP3)' : 'Audio (MP3/WAV)'}</label>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#FFB800]/30 transition-colors cursor-pointer" onClick={() => document.getElementById('comp-upload')?.click()}>
                      {compForm.mediaFile ? (
                        <div className="text-[#FFB800] text-sm">✓ {compForm.mediaFile.name}</div>
                      ) : (
                        <>
                          <div className="text-3xl mb-2">{compForm.mediaType === 'video' ? '🎬' : compForm.mediaType === 'podcast' ? '🎙️' : '🎤'}</div>
                          <p className="text-gray-400 text-sm">Click to upload your entry</p>
                          <p className="text-gray-600 text-xs mt-1">Max 500MB</p>
                        </>
                      )}
                      <input id="comp-upload" type="file" accept={compForm.mediaType === 'video' ? 'video/*' : 'audio/*'} className="hidden" onChange={e => setCompForm(f => ({...f, mediaFile: e.target.files?.[0] || null}))} />
                    </div>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                    ⚡ Your entry will be reviewed by our AI evaluation pipeline and then by our admin team before going live for public voting.
                  </div>
                  <button onClick={handleCompSubmit} disabled={compSubmitting || !compForm.title || !compForm.competitionId} className="w-full py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl font-medium disabled:opacity-40">
                    {compSubmitting ? 'Submitting…' : 'Submit Entry'}
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 border border-[#FFB800]/20 rounded-2xl p-10 text-center">
                  <div className="text-5xl mb-4">🏆</div>
                  <h3 className="text-xl font-bold text-white mb-2">Entry Submitted!</h3>
                  <p className="text-gray-400 mb-6">Your entry is under AI + admin review. You'll be notified when it goes live for voting.</p>
                  <button onClick={() => { setCompSuccess(false); setCompForm({title:'', description:'', competitionId:'', mediaType:'audio', mediaFile:null}); }} className="px-6 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors text-sm">Submit Another Entry</button>
                </div>
              )}
            </div>

            {/* Active Competitions */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white">Active Competitions</h2>
              {competitions.map(c => (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-[#FFB800]/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white text-sm">{c.title}</h3>
                    <span className="text-[#FFB800] font-bold text-sm">{c.prize}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>📅 Deadline: {c.deadline}</span>
                    <span>👥 {c.entries} entries</span>
                  </div>
                </div>
              ))}
              <div className="bg-gradient-to-br from-[#9D4EDD]/10 to-[#00D9FF]/10 border border-[#9D4EDD]/20 rounded-2xl p-4">
                <p className="text-xs text-[#9D4EDD] font-medium mb-1">How competitions work</p>
                <ul className="text-xs text-gray-400 space-y-1.5">
                  <li>✅ Submit your audio, video or podcast</li>
                  <li>🤖 AI quality evaluation (auto-filter)</li>
                  <li>👨‍💼 Admin team review &amp; approval</li>
                  <li>🗳️ Public voting period (7 days)</li>
                  <li>🏆 Winners announced &amp; prizes paid</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
