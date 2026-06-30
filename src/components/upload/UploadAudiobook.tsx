import React, { useState, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

const GENRES = ['Self-Help','Business','Memoir','Fiction','Non-Fiction','Biography','Science','History','Spiritual','Education','Children','Mystery','Romance'];
const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'sw', name: 'Swahili' },
  { code: 'yo', name: 'Yoruba' }, { code: 'ha', name: 'Hausa' }, { code: 'ig', name: 'Igbo' },
  { code: 'es', name: 'Spanish' }, { code: 'pt', name: 'Portuguese' }, { code: 'ar', name: 'Arabic' },
];

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const inpSm = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';

interface ChapterDraft {
  id:         string;
  title:      string;
  narrator:   string;
  audioFile:  File | null;
}

const newChapter = (): ChapterDraft => ({
  id:        crypto.randomUUID(),
  title:     '',
  narrator:  '',
  audioFile: null,
});

interface Props { onSuccess: () => void; }

export default function UploadAudiobook({ onSuccess }: Props) {
  const { user } = useApp();

  const [title,        setTitle]        = useState('');
  const [author,       setAuthor]       = useState('');
  const [narrator,     setNarrator]     = useState('');
  const [genre,        setGenre]        = useState('');
  const [language,     setLanguage]     = useState('en');
  const [description,  setDescription]  = useState('');
  const [price,        setPrice]        = useState('');
  const [isbn,         setIsbn]         = useState('');
  const [publisher,    setPublisher]    = useState('');
  const [amazonUrl,    setAmazonUrl]    = useState('');
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [chapters, setChapters] = useState<ChapterDraft[]>([newChapter()]);
  const audioRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [submitting, setSubmitting] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState('');

  const handleCover = async (file: File) => {
    const err = await validateArtwork(file);
    if (err) { setError(err); return; }
    setCoverFile(file);
    setError('');
  };

  const updateChapter = (id: string, field: keyof ChapterDraft, value: ChapterDraft[keyof ChapterDraft]) =>
    setChapters(cs => cs.map(c => c.id === id ? { ...c, [field]: value } : c));

  const addChapter = () => setChapters(cs => [...cs, newChapter()]);
  const removeChapter = (id: string) => {
    if (chapters.length <= 1) return;
    setChapters(cs => cs.filter(c => c.id !== id));
  };

  const handleChapterAudio = (chapId: string, file: File) => {
    updateChapter(chapId, 'audioFile', file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) { setError('Title and author are required.'); return; }
    if (chapters.some(c => !c.title)) { setError('All chapters must have a title.'); return; }

    setSubmitting(true); setError('');
    const ticker = setInterval(() => setProgress(p => p < 85 ? p + Math.random() * 10 : p), 400);

    try {
      // 1. Release
      const { data: release, error: relErr } = await supabase
        .from('releases')
        .insert([{
          creator_id:    user?.id ?? null,
          release_title: title,
          release_type:  'audiobook',
          primary_artist: author,
          genre, language,
          description,
          status:        'processing',
        }])
        .select().single();
      if (relErr) throw relErr;

      const releaseId = release.id;

      // 2. Audiobook chapters
      const { error: chapErr } = await supabase.from('audiobook_chapters').insert(
        chapters.map((c, i) => ({
          release_id:     releaseId,
          chapter_number: i + 1,
          title:          c.title,
          narrator:       c.narrator || narrator || null,
        }))
      );
      if (chapErr) throw chapErr;

      // 3. Book record
      const { error: bookErr } = await supabase.from('books').insert([{
        release_id:      releaseId,
        creator_id:      user?.id ?? null,
        title,
        author,
        isbn:            isbn || null,
        ebook_source:    'wankong',
        ebook_price:     price ? parseFloat(price) : null,
        ebook_visible:   true,
        admin_show_ebook: true,
        synopsis:        description,
        language,
      }]);
      if (bookErr) throw bookErr;

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
        <h2 className="text-xl font-bold text-white">Audiobook Upload</h2>
        <p className="text-sm text-gray-400 mt-1">Chapter-by-chapter audiobook distribution.</p>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Book info */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Book Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={lbl}>Title *</label><input className={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Audiobook title" required /></div>
          <div><label className={lbl}>Author *</label><input className={inp} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" required /></div>
          <div><label className={lbl}>Narrator (default for all chapters)</label><input className={inp} value={narrator} onChange={e => setNarrator(e.target.value)} placeholder="Narrator name" /></div>
          <div><label className={lbl}>Publisher</label><input className={inp} value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="Publisher name" /></div>
          <div><label className={lbl}>ISBN</label><input className={inp} value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-..." /></div>
          <div><label className={lbl}>Price (USD)</label><input type="number" className={inp} value={price} onChange={e => setPrice(e.target.value)} placeholder="9.99" step="0.01" min="0" /></div>
          <div><label className={lbl}>Genre</label>
            <select className={inp} value={genre} onChange={e => setGenre(e.target.value)}>
              <option value="">Select genre</option>{GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Language</label>
            <select className={inp} value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>Amazon Audible Link</label>
            <input className={inp} value={amazonUrl} onChange={e => setAmazonUrl(e.target.value)} placeholder="https://www.audible.com/pd/..." type="url" />
          </div>
        </div>
        <div>
          <label className={lbl}>Synopsis / Description</label>
          <textarea className={inp + ' resize-none'} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this audiobook..." />
        </div>
      </section>

      {/* Cover */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Cover Image</h3>
        <p className="text-xs text-gray-400">Minimum 3000×3000 px · Square · JPG or PNG</p>
        <div onClick={() => coverRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${coverFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-[#9D4EDD]'}`}>
          <input ref={coverRef} type="file" className="hidden" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) handleCover(f); }} />
          {coverFile
            ? <div className="flex items-center justify-center gap-3"><svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><p className="text-white text-sm">{coverFile.name}</p><button type="button" onClick={e => { e.stopPropagation(); setCoverFile(null); }} className="text-xs text-red-400 ml-2">Remove</button></div>
            : <div><svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p className="text-gray-300 text-sm">Click to upload cover image</p></div>
          }
        </div>
      </section>

      {/* Chapter builder */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Chapters ({chapters.length})</h3>
          <button type="button" onClick={addChapter} className="flex items-center gap-1.5 text-xs text-[#B794F4] hover:text-[#C9B3F5]">
            <Plus className="w-3.5 h-3.5" /> Add Chapter
          </button>
        </div>

        {chapters.map((chapter, idx) => (
          <div key={chapter.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase">Chapter {idx + 1}</span>
              {chapters.length > 1 && (
                <button type="button" onClick={() => removeChapter(chapter.id)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-400 mb-1">Chapter Title *</label><input className={inpSm} value={chapter.title} onChange={e => updateChapter(chapter.id, 'title', e.target.value)} placeholder={`Chapter ${idx + 1}: ...`} required /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Narrator (override)</label><input className={inpSm} value={chapter.narrator} onChange={e => updateChapter(chapter.id, 'narrator', e.target.value)} placeholder={narrator || 'Chapter narrator'} /></div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Chapter Audio (WAV or MP3)</label>
              <div
                onClick={() => audioRefs.current.get(chapter.id)?.click()}
                className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all text-xs ${chapter.audioFile ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : 'border-gray-600 hover:border-[#9D4EDD] text-gray-400'}`}
              >
                <input
                  type="file" className="hidden" accept=".wav,.mp3,audio/wav,audio/mpeg"
                  ref={el => { if (el) audioRefs.current.set(chapter.id, el); }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleChapterAudio(chapter.id, f); }}
                />
                {chapter.audioFile ? `${chapter.audioFile.name} (${(chapter.audioFile.size / 1024 / 1024).toFixed(1)} MB)` : 'Click to upload chapter audio'}
              </div>
            </div>
          </div>
        ))}
      </section>

      {submitting && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex justify-between mb-2"><span className="text-sm text-white">Uploading audiobook...</span><span className="text-sm text-[#B794F4]">{Math.round(progress)}%</span></div>
          <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-[#9D4EDD] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <button type="submit" disabled={submitting || !title || !author}
        className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base">
        {submitting ? 'Uploading Audiobook...' : `Publish Audiobook (${chapters.length} chapter${chapters.length !== 1 ? 's' : ''})`}
      </button>
    </form>
  );
}
