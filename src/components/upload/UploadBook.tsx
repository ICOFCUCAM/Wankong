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

const GENRES = ['Fiction','Non-Fiction','Self-Help','Business','Memoir','Biography','Science','History','Philosophy','Spiritual','Education','Children','Mystery','Romance','Thriller','Poetry','Art','Technology'];
const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'sw', name: 'Swahili' },
  { code: 'yo', name: 'Yoruba' }, { code: 'ha', name: 'Hausa' }, { code: 'ig', name: 'Igbo' },
  { code: 'es', name: 'Spanish' }, { code: 'pt', name: 'Portuguese' }, { code: 'ar', name: 'Arabic' },
];

type SourceType = 'wankong' | 'amazon' | 'external' | 'none';

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const inpSm = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';

function Toggle({ on, onToggle, label, sublabel }: { on: boolean; onToggle: () => void; label: string; sublabel?: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-3">
      <div><p className="text-sm font-medium text-white">{label}</p>{sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}</div>
      <button type="button" onClick={onToggle} className={`w-12 h-6 rounded-full relative transition-colors ${on ? 'bg-[#9D4EDD]' : 'bg-gray-700'}`}>
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function FormatSection({
  formatLabel, source, setSource, price, setPrice, url, setUrl, visible, setVisible, adminShow, setAdminShow,
}: {
  formatLabel: string;
  source: SourceType; setSource: (s: SourceType) => void;
  price: string;      setPrice: (p: string) => void;
  url: string;        setUrl: (u: string) => void;
  visible: boolean;   setVisible: (v: boolean) => void;
  adminShow: boolean; setAdminShow: (v: boolean) => void;
}) {
  const sources: { value: SourceType; label: string }[] = [
    { value: 'wankong',  label: 'WANKONG Store' },
    { value: 'amazon',   label: 'Amazon' },
    { value: 'external', label: 'External URL' },
    { value: 'none',     label: 'Not Available' },
  ];

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{formatLabel}</h4>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Public</span>
          <button type="button" onClick={() => setVisible(!visible)} className={`w-10 h-5 rounded-full relative transition-colors ${visible ? 'bg-[#9D4EDD]' : 'bg-gray-700'}`}>
            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-gray-400">Admin visible</span>
          <button type="button" onClick={() => setAdminShow(!adminShow)} className={`w-10 h-5 rounded-full relative transition-colors ${adminShow ? 'bg-purple-600' : 'bg-gray-700'}`}>
            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${adminShow ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {sources.map(s => (
          <button key={s.value} type="button" onClick={() => setSource(s.value)}
            className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${source === s.value ? 'bg-[#9D4EDD]/20 border-[#9D4EDD]/50 text-[#C9B3F5]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {source !== 'none' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Price (USD)</label>
            <input type="number" className={inpSm} value={price} onChange={e => setPrice(e.target.value)} placeholder="14.99" step="0.01" min="0" />
          </div>
          {(source === 'amazon' || source === 'external') && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">{source === 'amazon' ? 'Amazon URL' : 'External URL'}</label>
              <input type="url" className={inpSm} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props { onSuccess: () => void; }

export default function UploadBook({ onSuccess }: Props) {
  const { user } = useApp();

  // Book metadata
  const [title,       setTitle]       = useState('');
  const [author,      setAuthor]      = useState('');
  const [isbn,        setIsbn]        = useState('');
  const [genre,       setGenre]       = useState('');
  const [language,    setLanguage]    = useState('en');
  const [synopsis,    setSynopsis]    = useState('');
  const [publisher,   setPublisher]   = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [pageCount,   setPageCount]   = useState('');

  const [coverFile,   setCoverFile]   = useState<File | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // eBook format
  const [ebookSource,   setEbookSource]   = useState<SourceType>('wankong');
  const [ebookPrice,    setEbookPrice]    = useState('');
  const [ebookUrl,      setEbookUrl]      = useState('');
  const [ebookVisible,  setEbookVisible]  = useState(true);
  const [adminShowEbook,setAdminShowEbook]= useState(true);

  // Softcover format
  const [softSource,    setSoftSource]    = useState<SourceType>('none');
  const [softPrice,     setSoftPrice]     = useState('');
  const [softUrl,       setSoftUrl]       = useState('');
  const [softVisible,   setSoftVisible]   = useState(true);
  const [adminShowSoft, setAdminShowSoft] = useState(true);

  // Hardcover format
  const [hardSource,    setHardSource]    = useState<SourceType>('none');
  const [hardPrice,     setHardPrice]     = useState('');
  const [hardUrl,       setHardUrl]       = useState('');
  const [hardVisible,   setHardVisible]   = useState(true);
  const [adminShowHard, setAdminShowHard] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState('');

  const handleCover = async (file: File) => {
    const err = await validateArtwork(file);
    if (err) { setError(err); return; }
    setCoverFile(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) { setError('Title and author are required.'); return; }
    setSubmitting(true); setError('');
    const ticker = setInterval(() => setProgress(p => p < 85 ? p + Math.random() * 12 : p), 400);

    try {
      // 1. Release record
      const { data: release, error: relErr } = await supabase
        .from('releases')
        .insert([{
          creator_id:    user?.id ?? null,
          release_title: title,
          release_type:  'book',
          primary_artist: author,
          genre,
          language,
          description:   synopsis,
          status:        'processing',
        }])
        .select().single();
      if (relErr) throw relErr;

      const releaseId = release.id;

      // 2. Book record
      const { error: bookErr } = await supabase.from('books').insert([{
        release_id:          releaseId,
        creator_id:          user?.id ?? null,
        title,
        author,
        isbn:                isbn || null,
        synopsis,
        language,
        // eBook
        ebook_source:        ebookSource,
        ebook_url:           ebookUrl || null,
        ebook_price:         ebookPrice ? parseFloat(ebookPrice) : null,
        ebook_visible:       ebookVisible,
        admin_show_ebook:    adminShowEbook,
        // Softcover
        softcover_source:    softSource,
        softcover_url:       softUrl || null,
        softcover_price:     softPrice ? parseFloat(softPrice) : null,
        softcover_visible:   softVisible,
        admin_show_softcover: adminShowSoft,
        // Hardcover
        hardcover_source:    hardSource,
        hardcover_url:       hardUrl || null,
        hardcover_price:     hardPrice ? parseFloat(hardPrice) : null,
        hardcover_visible:   hardVisible,
        admin_show_hardcover: adminShowHard,
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
        <h2 className="text-xl font-bold text-white">Book Upload</h2>
        <p className="text-sm text-gray-400 mt-1">Publish your book in eBook, softcover and hardcover formats.</p>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Book info */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Book Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={lbl}>Title *</label><input className={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title" required /></div>
          <div><label className={lbl}>Author *</label><input className={inp} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" required /></div>
          <div><label className={lbl}>Publisher</label><input className={inp} value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="Publisher" /></div>
          <div><label className={lbl}>ISBN</label><input className={inp} value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-..." /></div>
          <div><label className={lbl}>Publish Date</label><input type="date" className={inp} value={publishDate} onChange={e => setPublishDate(e.target.value)} /></div>
          <div><label className={lbl}>Page Count</label><input type="number" className={inp} value={pageCount} onChange={e => setPageCount(e.target.value)} placeholder="320" min="1" /></div>
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
        </div>
        <div><label className={lbl}>Synopsis</label><textarea className={inp + ' resize-none'} rows={4} value={synopsis} onChange={e => setSynopsis(e.target.value)} placeholder="Describe this book..." /></div>
      </section>

      {/* Cover */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Book Cover</h3>
        <p className="text-xs text-gray-400">Minimum 3000×3000 px · Square · JPG or PNG</p>
        <div onClick={() => coverRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${coverFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-[#9D4EDD]'}`}>
          <input ref={coverRef} type="file" className="hidden" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) handleCover(f); }} />
          {coverFile
            ? <div className="flex items-center justify-center gap-3"><svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><p className="text-white text-sm">{coverFile.name}</p><button type="button" onClick={e => { e.stopPropagation(); setCoverFile(null); }} className="text-xs text-red-400 ml-2">Remove</button></div>
            : <div><svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg><p className="text-gray-300 text-sm">Click to upload book cover</p></div>
          }
        </div>
      </section>

      {/* Format sections */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Formats & Availability</h3>
            <p className="text-xs text-gray-400 mt-1">Configure sources, pricing and visibility for each format. Admin visibility controls what appears in the admin panel.</p>
          </div>
        </div>

        <FormatSection
          formatLabel="eBook"
          source={ebookSource} setSource={setEbookSource}
          price={ebookPrice}   setPrice={setEbookPrice}
          url={ebookUrl}       setUrl={setEbookUrl}
          visible={ebookVisible}    setVisible={setEbookVisible}
          adminShow={adminShowEbook} setAdminShow={setAdminShowEbook}
        />

        <FormatSection
          formatLabel="Softcover (Paperback)"
          source={softSource} setSource={setSoftSource}
          price={softPrice}   setPrice={setSoftPrice}
          url={softUrl}       setUrl={setSoftUrl}
          visible={softVisible}    setVisible={setSoftVisible}
          adminShow={adminShowSoft} setAdminShow={setAdminShowSoft}
        />

        <FormatSection
          formatLabel="Hardcover"
          source={hardSource} setSource={setHardSource}
          price={hardPrice}   setPrice={setHardPrice}
          url={hardUrl}       setUrl={setHardUrl}
          visible={hardVisible}    setVisible={setHardVisible}
          adminShow={adminShowHard} setAdminShow={setAdminShowHard}
        />
      </section>

      {submitting && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex justify-between mb-2"><span className="text-sm text-white">Publishing book...</span><span className="text-sm text-[#B794F4]">{Math.round(progress)}%</span></div>
          <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-[#9D4EDD] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <button type="submit" disabled={submitting || !title || !author}
        className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base">
        {submitting ? 'Publishing Book...' : 'Publish Book'}
      </button>
    </form>
  );
}
