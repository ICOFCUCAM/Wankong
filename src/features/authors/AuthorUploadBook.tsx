import React, { useRef, useState } from 'react';
import {
  BookOpen, Upload, FileText, ImagePlus, Globe, Tag, DollarSign,
  AlignLeft, Hash, Loader2, ExternalLink, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Constants ──────────────────────────────────────────────────────────────

const GENRES = [
  'Gospel', 'Fiction', 'Non-Fiction', 'Biography', 'Prayer',
  'Theology', 'Children', 'Poetry',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'sw', label: 'Swahili' },
  { code: 'de', label: 'German' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ha', label: 'Hausa' },
  { code: 'pt', label: 'Portuguese' },
];

type Source = 'wankong' | 'amazon' | 'external';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthorUploadBookProps {
  authorId: string;
  onSuccess: (bookId: string) => void;
}

interface FormState {
  title:        string;
  description:  string;
  price:        string;
  genre:        string;
  language:     string;
  pages:        string;
  // Format flags
  has_ebook:     boolean;
  has_audiobook: boolean;
  has_softcover: boolean;
  has_hardcover: boolean;
  // Per-format prices
  ebook_price:     string;
  audiobook_price: string;
  softcover_price: string;
  hardcover_price: string;
  // Sources
  softcover_source: Source;
  hardcover_source: Source;
  // Amazon URLs
  amazon_softcover_url: string;
  amazon_hardcover_url: string;
  // External URLs
  softcover_external_url: string;
  hardcover_external_url: string;
  // Visibility
  softcover_visible: boolean;
  hardcover_visible: boolean;
}

const INITIAL_FORM: FormState = {
  title: '', description: '', price: '0', genre: 'Gospel', language: 'en', pages: '',
  has_ebook: true, has_audiobook: false, has_softcover: false, has_hardcover: false,
  ebook_price: '0', audiobook_price: '0', softcover_price: '0', hardcover_price: '0',
  softcover_source: 'wankong', hardcover_source: 'wankong',
  amazon_softcover_url: '', amazon_hardcover_url: '',
  softcover_external_url: '', hardcover_external_url: '',
  softcover_visible: true, hardcover_visible: true,
};

// ── Helper ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden bg-white/8">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, percent)}%`, background: color }} />
    </div>
  );
}

async function xhrUpload(bucket: string, path: string, file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? '';
    const uploadUrl = `${(supabase as any).supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    const form = new FormData();
    form.append('', file, file.name);
    xhr.send(form);
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export function AuthorUploadBook({ authorId, onSuccess }: AuthorUploadBookProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef   = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [pdfFile,      setPdfFile]      = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [coverProgress, setCoverProgress] = useState(0);
  const [pdfProgress,   setPdfProgress]   = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  const set = (key: keyof FormState, val: FormState[keyof FormState]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Cover must be an image file.'); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverProgress(0);
    setError('');
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setPdfProgress(0);
    setError('');
  };

  const validate = (): string => {
    if (!form.title.trim()) return 'Book title is required.';
    if (!form.description.trim()) return 'Description is required.';
    if (isNaN(Number(form.price)) || Number(form.price) < 0) return 'Enter a valid price.';
    if (!form.has_ebook && !form.has_audiobook && !form.has_softcover && !form.has_hardcover) return 'Select at least one format.';
    if (form.has_ebook && !pdfFile) return 'Please upload the book PDF for the eBook format.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError('');

    try {
      const bookId = crypto.randomUUID();
      const ts = Date.now();
      const handle = `${slugify(form.title)}-${bookId.slice(0, 6)}`;

      let coverUrl: string | null = null;
      let pdfUrl:   string | null = null;

      if (coverFile) {
        const path = `authors/${authorId}/${ts}_cover.jpg`;
        coverUrl = await xhrUpload('cover-images', path, coverFile, setCoverProgress);
      }

      if (pdfFile) {
        const path = `authors/${authorId}/${ts}.pdf`;
        pdfUrl = await xhrUpload('book-pdfs', path, pdfFile, setPdfProgress);
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('ecom_products')
        .insert([{
          id:          bookId,
          handle,
          title:       form.title.trim(),
          description: form.description.trim(),
          price:       parseFloat(Number(form.price).toFixed(2)),
          genre:       form.genre,
          language:    form.language,
          pages:       form.pages ? parseInt(form.pages, 10) : null,
          product_type: 'Book',
          author_id:   authorId,
          image_url:   coverUrl,
          file_url:    pdfUrl,
          cover_url:   coverUrl,
          // Format flags
          has_ebook:     form.has_ebook,
          has_audiobook: form.has_audiobook,
          has_softcover: form.has_softcover,
          has_hardcover: form.has_hardcover,
          // Per-format prices
          ebook_price:     form.has_ebook     ? parseFloat(form.ebook_price)     : null,
          audiobook_price: form.has_audiobook ? parseFloat(form.audiobook_price) : null,
          softcover_price: form.has_softcover ? parseFloat(form.softcover_price) : null,
          hardcover_price: form.has_hardcover ? parseFloat(form.hardcover_price) : null,
          // Sources
          softcover_source: form.has_softcover ? form.softcover_source : null,
          hardcover_source: form.has_hardcover ? form.hardcover_source : null,
          // Amazon URLs
          amazon_softcover_url: (form.has_softcover && form.softcover_source === 'amazon') ? form.amazon_softcover_url : null,
          amazon_hardcover_url: (form.has_hardcover && form.hardcover_source === 'amazon') ? form.amazon_hardcover_url : null,
          // External URLs
          softcover_external_url: (form.has_softcover && form.softcover_source === 'external') ? form.softcover_external_url : null,
          hardcover_external_url: (form.has_hardcover && form.hardcover_source === 'external') ? form.hardcover_external_url : null,
          // Visibility
          softcover_visible: form.has_softcover ? form.softcover_visible : null,
          hardcover_visible: form.has_hardcover ? form.hardcover_visible : null,
        }])
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      setSuccess(true);
      setForm(INITIAL_FORM);
      setCoverFile(null);
      setCoverPreview('');
      setPdfFile(null);
      setCoverProgress(0);
      setPdfProgress(0);
      setTimeout(() => onSuccess(inserted?.id ?? bookId), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-14 bg-[#0B0814] rounded-2xl border border-[#00F5A0]/30">
        <div className="w-14 h-14 rounded-full bg-[#00F5A0]/10 flex items-center justify-center">
          <BookOpen size={28} className="text-[#00F5A0]" />
        </div>
        <p className="text-[#00F5A0] font-semibold text-lg">Book published!</p>
        <p className="text-gray-400 text-sm">Your book is now live on WANKONG.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0B0814] rounded-2xl border border-white/10 p-6 space-y-6 text-white">
      <div>
        <h2 className="text-lg font-bold text-white">Upload a New Book</h2>
        <p className="text-sm text-gray-400 mt-0.5">Fill in the details, choose formats, and upload your files.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="grid md:grid-cols-[auto,1fr] gap-6">
        {/* Cover image picker */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">Cover Image</label>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={submitting}
            className={`relative w-32 h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden ${coverPreview ? 'border-[#00D9FF]/50' : 'border-white/10 hover:border-[#00D9FF]/40'}`}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <><ImagePlus size={24} className="text-gray-500" /><span className="text-xs text-gray-600">Add cover</span></>
            )}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} disabled={submitting} />
          {coverFile && submitting && (
            <div className="space-y-1"><ProgressBar percent={coverProgress} color="#00D9FF" /><p className="text-xs text-gray-500 text-right">{coverProgress}%</p></div>
          )}
        </div>

        {/* Right column fields */}
        <div className="space-y-4">
          <Field label="Book Title" icon={<BookOpen size={15} />}>
            <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Enter book title" disabled={submitting} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Genre" icon={<Tag size={14} />}>
              <select name="genre" value={form.genre} onChange={handleChange} disabled={submitting} className={selectCls}>
                {GENRES.map(g => <option key={g} value={g} className="bg-[#0B0814]">{g}</option>)}
              </select>
            </Field>
            <Field label="Language" icon={<Globe size={14} />}>
              <select name="language" value={form.language} onChange={handleChange} disabled={submitting} className={selectCls}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code} className="bg-[#0B0814]">{l.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Base Price (USD)" icon={<DollarSign size={14} />}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" placeholder="0.00" disabled={submitting} className={`${inputCls} pl-7`} />
              </div>
            </Field>
            <Field label="Pages" icon={<Hash size={14} />}>
              <input type="number" name="pages" value={form.pages} onChange={handleChange} min="1" placeholder="e.g. 256" disabled={submitting} className={inputCls} />
            </Field>
          </div>
        </div>
      </div>

      {/* Description */}
      <Field label="Description" icon={<AlignLeft size={14} />}>
        <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Write a compelling description for your book..." disabled={submitting}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors resize-none disabled:opacity-50"
        />
      </Field>

      {/* ── FORMAT SECTION ── */}
      <div className="space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">Available Formats</label>

        {/* eBook */}
        <FormatBlock
          id="ebook"
          label="eBook (PDF)"
          color="#00D9FF"
          checked={form.has_ebook}
          onToggle={v => set('has_ebook', v)}
          disabled={submitting}
        >
          <Field label="eBook Price (USD)" icon={<DollarSign size={13} />}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input type="number" value={form.ebook_price} onChange={e => set('ebook_price', e.target.value)} min="0" step="0.01" placeholder="0.00" disabled={submitting} className={`${inputCls} pl-7 text-xs py-2`} />
            </div>
          </Field>
        </FormatBlock>

        {/* Audiobook */}
        <FormatBlock
          id="audiobook"
          label="Audiobook"
          color="#9D4EDD"
          checked={form.has_audiobook}
          onToggle={v => set('has_audiobook', v)}
          disabled={submitting}
        >
          <Field label="Audiobook Price (USD)" icon={<DollarSign size={13} />}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input type="number" value={form.audiobook_price} onChange={e => set('audiobook_price', e.target.value)} min="0" step="0.01" placeholder="0.00" disabled={submitting} className={`${inputCls} pl-7 text-xs py-2`} />
            </div>
          </Field>
        </FormatBlock>

        {/* Softcover */}
        <FormatBlock
          id="softcover"
          label="Softcover (Physical)"
          color="#00F5A0"
          checked={form.has_softcover}
          onToggle={v => set('has_softcover', v)}
          disabled={submitting}
          extra={
            form.has_softcover ? (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-500">Visible on store</label>
                <button
                  type="button"
                  onClick={() => set('softcover_visible', !form.softcover_visible)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${form.softcover_visible ? 'bg-[#00F5A0]/15 text-[#00F5A0]' : 'bg-white/5 text-gray-500'}`}
                >
                  {form.softcover_visible ? <><Eye size={10} /> Visible</> : <><EyeOff size={10} /> Hidden</>}
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Softcover Price (USD)" icon={<DollarSign size={13} />}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input type="number" value={form.softcover_price} onChange={e => set('softcover_price', e.target.value)} min="0" step="0.01" placeholder="0.00" disabled={submitting} className={`${inputCls} pl-7 text-xs py-2`} />
              </div>
            </Field>
            <Field label="Source" icon={<ExternalLink size={13} />}>
              <select value={form.softcover_source} onChange={e => set('softcover_source', e.target.value as Source)} disabled={submitting} className={`${selectCls} text-xs py-2`}>
                <option value="wankong" className="bg-[#0B0814]">WANKONG Checkout</option>
                <option value="amazon" className="bg-[#0B0814]">Amazon</option>
                <option value="external" className="bg-[#0B0814]">External URL</option>
              </select>
            </Field>
          </div>
          {form.softcover_source === 'amazon' && (
            <Field label="Amazon Softcover URL" icon={<ExternalLink size={13} />}>
              <input type="url" value={form.amazon_softcover_url} onChange={e => set('amazon_softcover_url', e.target.value)} placeholder="https://amazon.com/dp/..." disabled={submitting} className={`${inputCls} text-xs py-2`} />
            </Field>
          )}
          {form.softcover_source === 'external' && (
            <Field label="External Softcover URL" icon={<ExternalLink size={13} />}>
              <input type="url" value={form.softcover_external_url} onChange={e => set('softcover_external_url', e.target.value)} placeholder="https://..." disabled={submitting} className={`${inputCls} text-xs py-2`} />
            </Field>
          )}
        </FormatBlock>

        {/* Hardcover */}
        <FormatBlock
          id="hardcover"
          label="Hardcover (Physical)"
          color="#FFB800"
          checked={form.has_hardcover}
          onToggle={v => set('has_hardcover', v)}
          disabled={submitting}
          extra={
            form.has_hardcover ? (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-500">Visible on store</label>
                <button
                  type="button"
                  onClick={() => set('hardcover_visible', !form.hardcover_visible)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${form.hardcover_visible ? 'bg-[#FFB800]/15 text-[#FFB800]' : 'bg-white/5 text-gray-500'}`}
                >
                  {form.hardcover_visible ? <><Eye size={10} /> Visible</> : <><EyeOff size={10} /> Hidden</>}
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hardcover Price (USD)" icon={<DollarSign size={13} />}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input type="number" value={form.hardcover_price} onChange={e => set('hardcover_price', e.target.value)} min="0" step="0.01" placeholder="0.00" disabled={submitting} className={`${inputCls} pl-7 text-xs py-2`} />
              </div>
            </Field>
            <Field label="Source" icon={<ExternalLink size={13} />}>
              <select value={form.hardcover_source} onChange={e => set('hardcover_source', e.target.value as Source)} disabled={submitting} className={`${selectCls} text-xs py-2`}>
                <option value="wankong" className="bg-[#0B0814]">WANKONG Checkout</option>
                <option value="amazon" className="bg-[#0B0814]">Amazon</option>
                <option value="external" className="bg-[#0B0814]">External URL</option>
              </select>
            </Field>
          </div>
          {form.hardcover_source === 'amazon' && (
            <Field label="Amazon Hardcover URL" icon={<ExternalLink size={13} />}>
              <input type="url" value={form.amazon_hardcover_url} onChange={e => set('amazon_hardcover_url', e.target.value)} placeholder="https://amazon.com/dp/..." disabled={submitting} className={`${inputCls} text-xs py-2`} />
            </Field>
          )}
          {form.hardcover_source === 'external' && (
            <Field label="External Hardcover URL" icon={<ExternalLink size={13} />}>
              <input type="url" value={form.hardcover_external_url} onChange={e => set('hardcover_external_url', e.target.value)} placeholder="https://..." disabled={submitting} className={`${inputCls} text-xs py-2`} />
            </Field>
          )}
        </FormatBlock>
      </div>

      {/* PDF upload (shown when eBook is selected) */}
      {form.has_ebook && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
            Book PDF <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            disabled={submitting}
            className={`w-full flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 transition-colors ${pdfFile ? 'border-[#00D9FF]/40 bg-[#00D9FF]/5' : 'border-white/10 hover:border-[#00D9FF]/30'} disabled:opacity-50`}
          >
            {pdfFile ? (
              <><FileText size={20} className="text-[#00D9FF] shrink-0" /><div className="text-left min-w-0"><p className="text-sm font-medium text-[#00D9FF] truncate">{pdfFile.name}</p><p className="text-xs text-gray-500">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p></div></>
            ) : (
              <><Upload size={20} className="text-gray-500 shrink-0" /><div className="text-left"><p className="text-sm text-gray-400">Click to select PDF</p><p className="text-xs text-gray-600">Maximum file size: 100 MB</p></div></>
            )}
          </button>
          <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handlePdfChange} disabled={submitting} />
          {pdfFile && submitting && (
            <div className="space-y-1 pt-1"><ProgressBar percent={pdfProgress} color="#9D4EDD" /><p className="text-xs text-gray-500 text-right">{pdfProgress}%</p></div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] hover:bg-[#00D9FF]/85 disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0814] font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
      >
        {submitting ? <><Loader2 size={16} className="animate-spin" />Publishing…</> : <><Upload size={16} />Publish Book</>}
      </button>
    </form>
  );
}

// ── FormatBlock ────────────────────────────────────────────────────────────

function FormatBlock({
  id, label, color, checked, onToggle, children, extra, disabled,
}: {
  id: string; label: string; color: string;
  checked: boolean; onToggle: (v: boolean) => void;
  children: React.ReactNode; extra?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <div className={`rounded-xl border transition-all ${checked ? 'border-white/20 bg-white/3' : 'border-white/8 bg-white/[0.015]'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggle(!checked)}
            disabled={disabled}
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'border-transparent' : 'border-gray-600 bg-transparent'}`}
            style={checked ? { background: color } : {}}
          >
            {checked && <span className="text-[#0B0814] text-xs font-black">✓</span>}
          </button>
          <span className="text-sm font-semibold text-white">{label}</span>
          {checked && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${color}20`, color }}>{id.toUpperCase()}</span>}
        </div>
        {extra}
      </div>
      {checked && <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">{children}</div>}
    </div>
  );
}

// ── Reusable field wrapper ─────────────────────────────────────────────────

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">{icon}{label}</label>
      {children}
    </div>
  );
}

const inputCls  = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors disabled:opacity-50';
const selectCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D9FF]/60 transition-colors appearance-none disabled:opacity-50';

export default AuthorUploadBook;
