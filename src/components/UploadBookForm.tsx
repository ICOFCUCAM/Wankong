import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, BookOpen, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface UploadBookFormProps {
  authorId: string;
  onSuccess: (bookId: string) => void;
}

const GENRES = [
  'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 'Science Fiction',
  'Fantasy', 'Horror', 'Biography', 'Self-Help', 'Business', 'History',
  'Poetry', 'Children', 'Young Adult', 'Religion & Spirituality', 'Health', 'Travel',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'sw', name: 'Swahili' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
];

interface FormState {
  title: string;
  description: string;
  price: number;
  genre: string;
  language: string;
  pages: number | '';
}

const UploadBookForm: React.FC<UploadBookFormProps> = ({ authorId, onSuccess }) => {
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    price: 0,
    genre: '',
    language: 'en',
    pages: '',
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPdfFile(file);
  };

  const uploadWithProgress = (
    bucket: string,
    path: string,
    file: File,
    onProgress: (pct: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('', file);

      const xhr = new XMLHttpRequest();

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      // Use supabase storage upload directly for progress tracking
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(publicUrl);
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload network error')));

      const { supabaseUrl, supabaseKey } = (() => {
        // Extract from supabase client headers indirectly via storage URL pattern
        const storageUrl = `${(supabase as any).supabaseUrl}/storage/v1/object/${bucket}/${path}`;
        return {
          storageUrl,
          supabaseUrl: (supabase as any).supabaseUrl as string,
          supabaseKey: (supabase as any).supabaseKey as string,
        };
      })();

      xhr.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${path}`);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError('Title is required.');
    if (!form.genre) return setError('Please select a genre.');
    if (!coverFile) return setError('Cover image is required.');
    if (!pdfFile) return setError('PDF file is required.');

    setUploading(true);
    setCoverProgress(0);
    setPdfProgress(0);

    try {
      const bookId = uuidv4();
      const coverExt = coverFile.name.split('.').pop();
      const coverPath = `books/${authorId}/${bookId}/cover.${coverExt}`;
      const pdfPath = `books/${authorId}/${bookId}/book.pdf`;

      // Upload cover
      const { error: coverErr } = await supabase.storage
        .from('book-covers')
        .upload(coverPath, coverFile, { upsert: true });
      if (coverErr) throw coverErr;
      setCoverProgress(100);

      const { data: coverData } = supabase.storage.from('book-covers').getPublicUrl(coverPath);

      // Upload PDF
      const { error: pdfErr } = await supabase.storage
        .from('book-pdfs')
        .upload(pdfPath, pdfFile, { upsert: true });
      if (pdfErr) throw pdfErr;
      setPdfProgress(100);

      const { data: pdfData } = supabase.storage.from('book-pdfs').getPublicUrl(pdfPath);

      // Insert into ecom_products
      const { data: product, error: insertErr } = await supabase
        .from('ecom_products')
        .insert({
          id: bookId,
          author_id: authorId,
          title: form.title.trim(),
          description: form.description.trim(),
          price: form.price,
          genre: form.genre,
          language: form.language,
          pages: form.pages === '' ? null : form.pages,
          cover_url: coverData.publicUrl,
          file_url: pdfData.publicUrl,
          product_type: 'book',
          status: 'active',
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      setSuccess(true);
      onSuccess(product.id);
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10 bg-[#120C22] rounded-2xl">
        <CheckCircle className="w-12 h-12 text-[#00F5A0]" />
        <h3 className="text-white text-xl font-bold">Book Published!</h3>
        <p className="text-gray-400 text-sm text-center">Your book has been uploaded successfully.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#120C22] rounded-2xl p-6 flex flex-col gap-5 w-full max-w-2xl"
    >
      <div className="flex items-center gap-3 mb-1">
        <BookOpen className="w-6 h-6 text-[#00D9FF]" />
        <h2 className="text-white text-xl font-bold">Upload a Book</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Title *</label>
        <input
          name="title"
          value={form.title}
          onChange={handleFormChange}
          placeholder="Book title"
          required
          className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors text-sm"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleFormChange}
          placeholder="Brief description of your book..."
          rows={4}
          className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors text-sm resize-none"
        />
      </div>

      {/* Genre + Language row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Genre *</label>
          <select
            name="genre"
            value={form.genre}
            onChange={handleFormChange}
            required
            className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#00D9FF] transition-colors text-sm appearance-none cursor-pointer"
          >
            <option value="">Select genre...</option>
            {GENRES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Language</label>
          <select
            name="language"
            value={form.language}
            onChange={handleFormChange}
            className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#00D9FF] transition-colors text-sm appearance-none cursor-pointer"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Price + Pages row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Price (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              name="price"
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={handleFormChange}
              placeholder="0.00"
              className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors text-sm w-full"
            />
          </div>
          <span className="text-[11px] text-gray-500">Set 0 for free</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Pages</label>
          <input
            name="pages"
            type="number"
            min={1}
            value={form.pages}
            onChange={handleFormChange}
            placeholder="e.g. 320"
            className="bg-[#0B0814] border border-[#2d3a5a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors text-sm"
          />
        </div>
      </div>

      {/* Cover Image */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Cover Image *</label>
        <div
          onClick={() => coverInputRef.current?.click()}
          className="relative border-2 border-dashed border-[#2d3a5a] hover:border-[#00D9FF] rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-4"
        >
          {coverPreview ? (
            <>
              <img src={coverPreview} alt="Cover preview" className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-white text-sm font-medium">{coverFile?.name}</span>
                <span className="text-gray-400 text-xs">{((coverFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
                <span className="text-[#00D9FF] text-xs mt-1">Click to change</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center w-full gap-2 py-4">
              <Upload className="w-8 h-8 text-gray-500" />
              <span className="text-gray-400 text-sm">Click to upload cover image</span>
              <span className="text-gray-600 text-xs">PNG, JPG, WEBP up to 10MB</span>
            </div>
          )}
          {uploading && coverProgress > 0 && coverProgress < 100 && (
            <div className="absolute bottom-2 left-4 right-4 h-1 bg-[#2d3a5a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00D9FF] transition-all duration-200"
                style={{ width: `${coverProgress}%` }}
              />
            </div>
          )}
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverChange}
          className="hidden"
        />
      </div>

      {/* PDF File */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">PDF File *</label>
        <div
          onClick={() => pdfInputRef.current?.click()}
          className="relative border-2 border-dashed border-[#2d3a5a] hover:border-[#00D9FF] rounded-xl p-4 cursor-pointer transition-colors"
        >
          {pdfFile ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 text-xs font-bold">PDF</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-white text-sm font-medium truncate max-w-xs">{pdfFile.name}</span>
                <span className="text-gray-400 text-xs">{((pdfFile.size) / 1024 / 1024).toFixed(2)} MB</span>
                <span className="text-[#00D9FF] text-xs mt-0.5">Click to change</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full gap-2 py-4">
              <Upload className="w-8 h-8 text-gray-500" />
              <span className="text-gray-400 text-sm">Click to upload PDF</span>
              <span className="text-gray-600 text-xs">PDF files only</span>
            </div>
          )}
          {uploading && pdfProgress > 0 && pdfProgress < 100 && (
            <div className="absolute bottom-2 left-4 right-4 h-1 bg-[#2d3a5a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00D9FF] transition-all duration-200"
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
          )}
        </div>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfChange}
          className="hidden"
        />
      </div>

      {/* Upload progress summary */}
      {uploading && (
        <div className="flex flex-col gap-2 bg-[#0B0814] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Cover image</span>
            <span>{coverProgress}%</span>
          </div>
          <div className="h-1.5 bg-[#2d3a5a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00D9FF] transition-all duration-200 rounded-full"
              style={{ width: `${coverProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
            <span>PDF file</span>
            <span>{pdfProgress}%</span>
          </div>
          <div className="h-1.5 bg-[#2d3a5a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#9D4EDD] transition-all duration-200 rounded-full"
              style={{ width: `${pdfProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] hover:bg-[#00b8d9] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0814] font-bold py-3 rounded-xl transition-colors text-sm mt-1"
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Publish Book
          </>
        )}
      </button>
    </form>
  );
};

export default UploadBookForm;
