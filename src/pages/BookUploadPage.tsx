import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { awardXP, XP_REWARDS } from '@/pipelines/levels/LevelUpgradeWorker';
import { translateBook } from '@/pipelines/translation/TranslateBookWorker';
import Header from '@/components/Header';
import { BookOpen, Upload, DollarSign, TrendingUp, ChevronRight } from 'lucide-react';

const ROYALTY_RATE = 0.70; // 70% to author

const GENRES = [
  'Fiction', 'Non-Fiction', 'Poetry', 'Biography', 'Business',
  'Self-Help', 'Romance', 'Mystery', 'Sci-Fi', 'Fantasy',
  'History', 'Philosophy', 'Education', 'Theology', 'Children',
];

const LANGUAGES = [
  { code: 'en', name: 'English'    },
  { code: 'fr', name: 'French'     },
  { code: 'sw', name: 'Swahili'    },
  { code: 'yo', name: 'Yoruba'     },
  { code: 'ig', name: 'Igbo'       },
  { code: 'ha', name: 'Hausa'      },
  { code: 'zu', name: 'Zulu'       },
  { code: 'ar', name: 'Arabic'     },
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish'    },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {hint && <span className="text-xs text-gray-500 font-normal ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#0D1B3E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FFB800]/40 focus:border-[#FFB800]/40 transition-colors";
const selectCls = inputCls + " cursor-pointer";

export default function BookUploadPage() {
  const navigate   = useNavigate();
  const coverRef   = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const [userId,       setUserId]       = useState<string | null>(null);
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [bookFile,     setBookFile]     = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState('');

  const [form, setForm] = useState({
    title:           '',
    author:          '',
    language:        'en',
    description:     '',
    genre:           '',
    price:           '',
    isFree:          false,
    isbn:            '',
    publisher:       '',
    publicationYear: new Date().getFullYear().toString(),
    pages:           '',
  });

  // ── Fetch current user ID at mount ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // ── Live royalty calc ────────────────────────────────────────────────────
  const royaltyInfo = useMemo(() => {
    if (form.isFree) return null;
    const price = parseFloat(form.price);
    if (!price || price <= 0) return null;
    const earn  = price * ROYALTY_RATE;
    const platform = price - earn;
    return { price, earn, platform };
  }, [form.price, form.isFree]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setBookFile(f);
  };

  const resetForm = () => {
    setSuccess(false);
    setForm({
      title: '', author: '', language: 'en', description: '',
      genre: '', price: '', isFree: false, isbn: '', publisher: '',
      publicationYear: new Date().getFullYear().toString(), pages: '',
    });
    setCoverPreview('');
    setCoverFile(null);
    setBookFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) return;
    setSubmitting(true);
    setError('');

    try {
      // Upload book file to storage (if provided) so translation pipeline has a real URL
      let bookFileUrl: string | null = null;
      if (bookFile && userId) {
        const ext  = bookFile.name.split('.').pop()?.toLowerCase() ?? 'pdf';
        const path = `books/${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('book-files')
          .upload(path, bookFile, { contentType: bookFile.type, upsert: false });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('book-files').getPublicUrl(path);
          bookFileUrl = urlData.publicUrl;
        }
      }

      const productData = {
        title:            form.title,
        body_html:        form.description,
        vendor:           form.author,
        product_type:     'Book',
        status:           'active',
        handle:           form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
        language:         form.language,
        genre:            form.genre,
        author:           form.author,
        isbn:             form.isbn,
        publisher:        form.publisher,
        publication_year: form.publicationYear,
        pages:            form.pages ? parseInt(form.pages) : null,
        price:            form.isFree ? 0 : Math.round(parseFloat(form.price || '0') * 100),
        tags:             ['book', form.genre, form.language].filter(Boolean).join(','),
        created_at:       new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('ecom_products')
        .insert([productData])
        .select('id')
        .single();
      if (insertError) throw insertError;

      // Award XP for uploading a book (fire-and-forget)
      if (userId) {
        awardXP(userId, XP_REWARDS.upload_book, 'upload_book').catch(console.error);

        // Trigger multilingual translation pipeline if a PDF was uploaded
        if (bookFileUrl && bookFile?.name.toLowerCase().endsWith('.pdf') && inserted?.id) {
          translateBook(String(inserted.id), bookFileUrl, userId).catch(console.error);
        }
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to publish book. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#FFB800]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-[#FFB800]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Book Published!</h2>
          <p className="text-gray-400 mb-2">
            "<span className="text-white">{form.title}</span>" is now live in the eBook Marketplace.
          </p>
          {royaltyInfo && (
            <p className="text-sm text-[#00F5A0] mb-6">
              You'll earn <strong>${royaltyInfo.earn.toFixed(2)}</strong> per sale (70% royalty).
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Link
              to="/ebook-marketplace"
              className="px-5 py-2.5 bg-[#FFB800] hover:bg-[#e6a600] text-black font-semibold rounded-xl transition-colors"
            >
              View Marketplace
            </Link>
            <button
              onClick={resetForm}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── File format label ─────────────────────────────────────────────────────
  const fileExt = bookFile?.name.split('.').pop()?.toUpperCase() ?? null;
  const fileColor: Record<string, string> = { PDF: '#FF6B00', EPUB: '#00D9FF', MOBI: '#9D4EDD' };

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">Publish a Book</span>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#FFB800]/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#FFB800]" />
            </div>
            <h1 className="text-3xl font-black text-white">Publish a Book</h1>
          </div>
          <p className="text-gray-400 ml-12">Share your writing with readers worldwide — earn 70% royalty on every sale.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-8">

          {/* ── Left column: uploads ──────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Cover art */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Cover Image</p>
              <div
                onClick={() => coverRef.current?.click()}
                className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 hover:border-[#FFB800]/40 cursor-pointer flex items-center justify-center overflow-hidden bg-[#0D1B3E] transition-colors group"
              >
                <input ref={coverRef} type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2 group-hover:text-[#FFB800]/60 transition-colors" />
                    <p className="text-sm text-gray-500">Upload cover</p>
                    <p className="text-xs text-gray-600 mt-0.5">3:4 ratio — JPG / PNG</p>
                  </div>
                )}
              </div>
            </div>

            {/* Book file upload */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Book File</p>
              <div
                onClick={() => fileRef.current?.click()}
                className={`p-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors group ${
                  bookFile
                    ? 'border-[#00D9FF]/40 bg-[#00D9FF]/5'
                    : 'border-white/10 hover:border-white/20 bg-[#0D1B3E]'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.epub,.mobi"
                  onChange={handleFileChange}
                />
                <div className="text-center">
                  <BookOpen className={`w-7 h-7 mx-auto mb-2 ${bookFile ? 'text-[#00D9FF]' : 'text-gray-600 group-hover:text-gray-400'} transition-colors`} />
                  {bookFile ? (
                    <>
                      <p className="text-sm text-white font-medium truncate">{bookFile.name}</p>
                      {fileExt && (
                        <span
                          className="inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded"
                          style={{ background: `${fileColor[fileExt] ?? '#9D4EDD'}22`, color: fileColor[fileExt] ?? '#9D4EDD' }}
                        >
                          {fileExt}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400">Upload your book file</p>
                      <div className="flex justify-center gap-1.5 mt-2">
                        {['PDF', 'EPUB', 'MOBI'].map(fmt => (
                          <span key={fmt} className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/5 text-gray-500">{fmt}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Royalty preview card */}
            <div className="rounded-xl border border-white/10 bg-[#0D1B3E] p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#00F5A0]" />
                <p className="text-xs font-semibold text-[#00F5A0] uppercase tracking-wide">Royalty Model</p>
              </div>
              {royaltyInfo ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Sale price</span>
                    <span className="font-semibold text-white">${royaltyInfo.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Platform fee (30%)</span>
                    <span className="text-gray-500">−${royaltyInfo.platform.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Your earnings (70%)</span>
                    <span className="font-bold text-[#00F5A0]">${royaltyInfo.earn.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">Per copy sold. Paid monthly.</p>
                </div>
              ) : (
                <div className="text-center py-3">
                  <DollarSign className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">
                    {form.isFree ? 'Free book — no earnings per sale.' : 'Enter a price above to see your earnings.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right columns: form fields ────────────────────────────────── */}
          <div className="md:col-span-2 space-y-5">

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Book Title" hint="required">
                <input
                  type="text" required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className={inputCls}
                  placeholder="Enter book title"
                />
              </Field>
              <Field label="Author Name" hint="required">
                <input
                  type="text" required
                  value={form.author}
                  onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                  className={inputCls}
                  placeholder="Author name"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={4}
                className={inputCls + ' resize-none'}
                placeholder="Book synopsis and description…"
              />
            </Field>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Genre">
                <select
                  value={form.genre}
                  onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">Genre</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>

              <Field label="Language">
                <select
                  value={form.language}
                  onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  className={selectCls}
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </Field>

              <Field label="Year Published">
                <input
                  type="number"
                  value={form.publicationYear}
                  onChange={e => setForm(p => ({ ...p, publicationYear: e.target.value }))}
                  className={inputCls}
                  min="1900" max="2030"
                />
              </Field>

              <Field label="Number of Pages">
                <input
                  type="number"
                  value={form.pages}
                  onChange={e => setForm(p => ({ ...p, pages: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. 240"
                  min="1"
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="ISBN" hint="optional">
                <input
                  type="text"
                  value={form.isbn}
                  onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))}
                  className={inputCls}
                  placeholder="978-X-XXX-XXXXX-X"
                />
              </Field>
              <Field label="Publisher" hint="optional">
                <input
                  type="text"
                  value={form.publisher}
                  onChange={e => setForm(p => ({ ...p, publisher: e.target.value }))}
                  className={inputCls}
                  placeholder="Publisher name"
                />
              </Field>
            </div>

            {/* Pricing section */}
            <div className="bg-[#0D1B3E] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Free Book</p>
                  <p className="text-xs text-gray-500 mt-0.5">Make this book available for free</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, isFree: !p.isFree, price: '' }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${form.isFree ? 'bg-[#FFB800]' : 'bg-gray-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${form.isFree ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {!form.isFree && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Price (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                      className={inputCls + ' pl-9'}
                      placeholder="14.99"
                      step="0.01"
                      min="0.99"
                    />
                  </div>

                  {/* Inline royalty preview (live) */}
                  {royaltyInfo && (
                    <div className="mt-3 flex items-center gap-4 px-3 py-2 rounded-xl bg-[#00F5A0]/5 border border-[#00F5A0]/15">
                      <TrendingUp className="w-4 h-4 text-[#00F5A0] shrink-0" />
                      <p className="text-xs text-gray-300">
                        You earn{' '}
                        <span className="font-bold text-[#00F5A0]">${royaltyInfo.earn.toFixed(2)}</span>
                        {' '}per sale — that's 70% of ${royaltyInfo.price.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.title || !form.author}
              className="w-full bg-[#FFB800] hover:bg-[#e6a600] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Publishing…
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  Publish Book
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-600">
              By publishing you agree to our{' '}
              <Link to="/terms-of-service" className="text-gray-400 hover:text-white underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy-policy" className="text-gray-400 hover:text-white underline">Privacy Policy</Link>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
