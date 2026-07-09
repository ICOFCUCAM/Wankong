import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  BookOpen, Upload, ImageIcon, CheckCircle, Loader2,
  AlertCircle, ChevronLeft, X, Plus, Trash2,
} from 'lucide-react';

const GENRES    = ['Self-Help', 'Biography', 'Fiction', 'Non-Fiction', 'Business', 'Spirituality', 'History', 'Science', 'Romance', 'Thriller'];
const LANGUAGES = ['English', 'French', 'Spanish', 'Arabic', 'Swahili', 'Yoruba', 'Igbo', 'Hausa', 'Zulu', 'Portuguese'];

const inputCls =
  'w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-3 text-white text-sm ' +
  'placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]/40 ' +
  'focus:border-[#9D4EDD]/40 transition-colors';
const selectCls = inputCls + ' cursor-pointer';

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtBytes(b: number) { return b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1024/1024).toFixed(1)} MB`; }

interface Chapter {
  id:        string;
  title:     string;
  audioFile: File | null;
  duration:  string;
}

export default function UploadAudiobookPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const artRef    = useRef<HTMLInputElement>(null);

  const [artFile,    setArtFile]    = useState<File | null>(null);
  const [artPreview, setArtPreview] = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');
  const [progress,   setProgress]   = useState(0);
  const [dragOverArt, setDragOverArt] = useState(false);

  const [form, setForm] = useState({
    title:        '',
    author:       '',
    narrator:     '',
    genre:        '',
    language:     'English',
    release_date: '',
    description:  '',
    price:        '9.99',
    isbn:         '',
  });

  const [chapters, setChapters] = useState<Chapter[]>([
    { id: uid(), title: 'Chapter 1', audioFile: null, duration: '' },
  ]);

  const handleArtDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverArt(false);
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith('image/')) return;
    setArtFile(f);
    setArtPreview(URL.createObjectURL(f));
  };

  const addChapter = () => {
    setChapters(c => [...c, { id: uid(), title: `Chapter ${c.length + 1}`, audioFile: null, duration: '' }]);
  };

  const updateChapter = (id: string, patch: Partial<Chapter>) =>
    setChapters(c => c.map(x => x.id === id ? { ...x, ...patch } : x));

  const removeChapter = (id: string) => setChapters(c => c.filter(x => x.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.author) { setError('Title and author are required.'); return; }
    const withAudio = chapters.filter(c => c.audioFile);
    if (withAudio.length === 0) { setError('Upload at least one chapter audio file.'); return; }

    setUploading(true);
    setError('');
    setProgress(5);

    try {
      // 1. Upload cover art
      let coverUrl = '';
      if (artFile) {
        const path = `${user.id}/audiobooks/${Date.now()}_cover_${artFile.name}`;
        const { error: artErr } = await supabase.storage.from('images').upload(path, artFile, { upsert: true });
        if (!artErr) {
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
          coverUrl = publicUrl;
        }
      }
      setProgress(15);

      const priceInCents = Math.round(parseFloat(form.price || '0') * 100);

      // 2. Insert product record
      const { data: product, error: prodErr } = await supabase
        .from('ecom_products')
        .insert([{
          vendor_id:    user.id,
          title:        form.title,
          product_type: 'Audiobook',
          cover_url:    coverUrl || null,
          price:        priceInCents,
          genre:        form.genre || null,
          language:     form.language,
          description:  form.description || null,
          isbn:         form.isbn || null,
          release_date: form.release_date || null,
          created_at:   new Date().toISOString(),
          metadata: {
            author:   form.author,
            narrator: form.narrator || null,
            chapters: withAudio.length,
          },
        }])
        .select('id')
        .single();
      if (prodErr) throw prodErr;

      // 3. Create audiobooks record (required for chapter FK: audiobook_chapters.audiobook_id → audiobooks.id)
      const { data: audiobookRow, error: abErr } = await supabase
        .from('audiobooks')
        .insert([{
          author_id:   user.id,
          title:       form.title,
          description: form.description || null,
          cover_url:   coverUrl || null,
          language:    form.language,
          genre:       form.genre || null,
          status:      'live',
        }])
        .select('id')
        .single();
      if (abErr) throw abErr;
      setProgress(25);

      // 4. Upload each chapter
      for (let i = 0; i < withAudio.length; i++) {
        const ch = withAudio[i];
        if (!ch.audioFile) continue;
        const path = `${user.id}/audiobooks/${product.id}/ch${String(i + 1).padStart(2, '0')}_${Date.now()}_${ch.audioFile.name}`;
        const { error: audioErr } = await supabase.storage.from('audio').upload(path, ch.audioFile, { upsert: true });
        if (audioErr) throw audioErr;

        const { data: { publicUrl: audioUrl } } = supabase.storage.from('audio').getPublicUrl(path);

        await supabase.from('audiobook_chapters').insert([{
          audiobook_id: audiobookRow.id,
          chapter_num:  i + 1,
          title:        ch.title || `Chapter ${i + 1}`,
          audio_url:    audioUrl,
          duration_s:   ch.duration || null,
        }]);

        setProgress(25 + Math.round(((i + 1) / withAudio.length) * 70));
      }

      setProgress(100);
      setDone(true);
    } catch (err: any) {
      console.error('[UploadAudiobookPage]', err);
      setError(err?.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Audiobook Submitted!</h1>
            <p className="text-gray-400 mb-6">
              <span className="text-white font-semibold">"{form.title}"</span> has been submitted
              for review. It will be published within 24–48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setDone(false); setForm({ title:'',author:'',narrator:'',genre:'',language:'English',release_date:'',description:'',price:'9.99',isbn:'' }); setChapters([{id:uid(),title:'Chapter 1',audioFile:null,duration:''}]); setArtFile(null); setArtPreview(''); setProgress(0); }}
                className="px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Upload Another
              </button>
              <Link to="/dashboard/author" className="px-6 py-3 border border-white/20 text-white font-bold rounded-xl hover:border-white/40 transition-colors text-center">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 lg:px-8 py-10">

        <Link to="/dashboard/author" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Author Dashboard
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Upload Audiobook</h1>
            <p className="text-gray-500 text-sm">Publish a narrated book to the marketplace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Cover art */}
          <section>
            <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#9D4EDD]" /> Cover Image
            </h2>
            <input ref={artRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if(f){setArtFile(f);setArtPreview(URL.createObjectURL(f));} }} />
            <div
              onDragOver={e => { e.preventDefault(); setDragOverArt(true); }}
              onDragLeave={() => setDragOverArt(false)}
              onDrop={handleArtDrop}
              onClick={() => artRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                dragOverArt ? 'border-[#9D4EDD] bg-[#9D4EDD]/10' :
                artFile ? 'border-[#9D4EDD]/60 bg-[#9D4EDD]/5' :
                'border-white/15 bg-white/3 hover:border-[#9D4EDD]/40'
              }`}
            >
              {artPreview ? (
                <div className="flex items-center gap-4 p-4">
                  <img src={artPreview} alt="Cover" className="w-24 h-24 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#9D4EDD] font-semibold text-sm">{artFile?.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{artFile ? fmtBytes(artFile.size) : ''}</p>
                    <p className="text-gray-600 text-xs mt-2">Click to replace</p>
                  </div>
                  <button type="button" onClick={ev => { ev.stopPropagation(); setArtFile(null); setArtPreview(''); }} className="text-gray-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <ImageIcon className="w-8 h-8 text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm font-medium">Drop cover image here or click to browse</p>
                  <p className="text-gray-600 text-xs mt-1">JPG, PNG — book cover style recommended</p>
                </div>
              )}
            </div>
          </section>

          {/* Metadata */}
          <section>
            <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#9D4EDD]" /> Book Details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Audiobook title" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Author <span className="text-red-400">*</span></label>
                <input required value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} placeholder="Author name" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Narrator</label>
                <input value={form.narrator} onChange={e => setForm(f => ({...f, narrator: e.target.value}))} placeholder="Narrator name (if different)" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Genre</label>
                <select value={form.genre} onChange={e => setForm(f => ({...f, genre: e.target.value}))} className={selectCls}>
                  <option value="">Select genre</option>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Language</label>
                <select value={form.language} onChange={e => setForm(f => ({...f, language: e.target.value}))} className={selectCls}>
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="9.99" className={inputCls + ' pl-7'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Release Date</label>
                <input type="date" value={form.release_date} onChange={e => setForm(f => ({...f, release_date: e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">ISBN (optional)</label>
                <input value={form.isbn} onChange={e => setForm(f => ({...f, isbn: e.target.value}))} placeholder="978-x-xxxxx-xxx-x" className={inputCls} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Tell listeners what this audiobook is about…" rows={3} className={inputCls} />
            </div>
          </section>

          {/* Chapters */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#9D4EDD]" /> Chapters ({chapters.length})
              </h2>
              <button type="button" onClick={addChapter} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#9D4EDD]/40 text-[#9D4EDD] text-xs font-medium hover:bg-[#9D4EDD]/10 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Chapter
              </button>
            </div>
            <div className="space-y-2">
              {chapters.map((ch, idx) => {
                const fileRef = React.createRef<HTMLInputElement>();
                return (
                  <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3">
                    <span className="text-gray-600 text-xs font-mono w-5 shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={ch.title}
                      onChange={e => updateChapter(ch.id, { title: e.target.value })}
                      placeholder={`Chapter ${idx + 1} title`}
                      className="flex-1 bg-[#0B0814] border border-white/8 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40 transition-colors"
                    />
                    <input
                      type="text"
                      value={ch.duration}
                      onChange={e => updateChapter(ch.id, { duration: e.target.value })}
                      placeholder="HH:MM:SS"
                      className="w-24 bg-[#0B0814] border border-white/8 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40 transition-colors"
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".mp3,.wav,.m4a,.flac"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if(f) updateChapter(ch.id, { audioFile: f }); }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
                        ch.audioFile
                          ? 'border-[#00F5A0]/40 text-[#00F5A0] bg-[#00F5A0]/10'
                          : 'border-white/15 text-gray-400 hover:border-[#9D4EDD]/40 hover:text-[#9D4EDD]'
                      }`}
                    >
                      {ch.audioFile ? <><CheckCircle className="w-3.5 h-3.5" /><span className="max-w-[60px] truncate">{ch.audioFile.name.split('.')[0]}</span></> : <><Upload className="w-3.5 h-3.5" />Audio</>}
                    </button>
                    <button type="button" onClick={() => removeChapter(ch.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-gray-600 text-xs mt-3">Accepted formats: MP3, WAV, M4A, FLAC</p>
          </section>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Uploading audiobook…</span><span>{progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pb-8">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Upload Audiobook</>}
            </button>
            <Link to="/dashboard/author" className="px-6 py-3.5 border border-white/15 text-gray-400 font-medium rounded-xl hover:border-white/30 hover:text-white transition-all text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
