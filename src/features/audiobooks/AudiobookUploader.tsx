import React, { useState } from 'react';
import { Mic, Globe, BookOpen, Headphones, Package } from 'lucide-react';
import { createAudiobook } from './AudiobookService';

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

interface AudiobookUploaderProps {
  bookId: string;
  authorId: string;
  onSuccess: () => void;
}

interface FormState {
  title: string;
  narrator: string;
  language: string;
  ebook_price: string;
  audio_price: string;
  bundle_price: string;
  description: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  narrator: '',
  language: 'en',
  ebook_price: '',
  audio_price: '',
  bundle_price: '',
  description: '',
};

export function AudiobookUploader({ bookId, authorId, onSuccess }: AudiobookUploaderProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = (): string => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.narrator.trim()) return 'Narrator name is required.';
    if (!form.ebook_price || isNaN(Number(form.ebook_price)) || Number(form.ebook_price) < 0)
      return 'Enter a valid ebook price.';
    if (!form.audio_price || isNaN(Number(form.audio_price)) || Number(form.audio_price) < 0)
      return 'Enter a valid audio price.';
    if (!form.bundle_price || isNaN(Number(form.bundle_price)) || Number(form.bundle_price) < 0)
      return 'Enter a valid bundle price.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError('');

    try {
      await createAudiobook({
        book_id: bookId,
        author_id: authorId,
        title: form.title.trim(),
        narrator: form.narrator.trim(),
        language: form.language,
        ebook_price: Number(form.ebook_price),
        audio_price: Number(form.audio_price),
        bundle_price: Number(form.bundle_price),
        description: form.description.trim() || undefined,
      });
      setSuccess(true);
      setForm(INITIAL_FORM);
      setTimeout(onSuccess, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create audiobook record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 bg-[#0B0814] rounded-2xl border border-[#00F5A0]/30">
        <div className="w-14 h-14 rounded-full bg-[#00F5A0]/10 flex items-center justify-center">
          <BookOpen size={28} className="text-[#00F5A0]" />
        </div>
        <p className="text-[#00F5A0] font-semibold text-lg">Audiobook record created!</p>
        <p className="text-gray-400 text-sm">You can now upload chapters.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0B0814] rounded-2xl border border-white/10 p-6 space-y-5"
    >
      <div>
        <h2 className="text-lg font-bold text-white">Create Audiobook Record</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Register this book as an audiobook before uploading chapters.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
          Audiobook Title
        </label>
        <div className="relative">
          <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Enter audiobook title"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 focus:bg-white/8 transition-colors"
          />
        </div>
      </div>

      {/* Narrator */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
          Narrator Name
        </label>
        <div className="relative">
          <Mic size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            name="narrator"
            value={form.narrator}
            onChange={handleChange}
            placeholder="Full name of the narrator"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors"
          />
        </div>
      </div>

      {/* Language */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
          Language
        </label>
        <div className="relative">
          <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            name="language"
            value={form.language}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D9FF]/60 transition-colors appearance-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#0B0814]">
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pricing row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { name: 'ebook_price', label: 'eBook Price', icon: <BookOpen size={14} /> },
          { name: 'audio_price', label: 'Audio Price', icon: <Headphones size={14} /> },
          { name: 'bundle_price', label: 'Bundle Price', icon: <Package size={14} /> },
        ].map(({ name, label, icon }) => (
          <div key={name} className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
              {icon}
              {label}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                name={name}
                value={form[name as keyof FormState]}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
          Description <span className="text-gray-600 normal-case">(optional)</span>
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Brief description of the audiobook..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] hover:bg-[#00D9FF]/85 disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0814] font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-[#0B0814] border-t-transparent rounded-full animate-spin" />
            Creating…
          </>
        ) : (
          'Create Audiobook'
        )}
      </button>
    </form>
  );
}

export default AudiobookUploader;
