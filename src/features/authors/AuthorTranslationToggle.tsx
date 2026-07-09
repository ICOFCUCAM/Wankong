import React, { useEffect, useState } from 'react';
import { Languages, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthorTranslationToggleProps {
  userId: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ── Component ──────────────────────────────────────────────────────────────

export function AuthorTranslationToggle({ userId }: AuthorTranslationToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch current auto_translate value
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    supabase
      .from('author_profiles')
      .select('auto_translate')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setEnabled(Boolean(data.auto_translate));
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setEnabled(newValue);
    setSaveState('saving');
    setErrorMsg('');

    try {
      const { error: updateErr } = await supabase
        .from('author_profiles')
        .update({ auto_translate: newValue, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateErr) throw updateErr;
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err: unknown) {
      // Revert optimistic update
      setEnabled(!newValue);
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to update setting.',
      );
      setSaveState('error');
    }
  };

  return (
    <div className="bg-[#0B0814] rounded-2xl border border-white/10 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/20 flex items-center justify-center">
          <Languages size={20} className="text-[#9D4EDD]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Translation Settings</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Control how WANKONG handles multilingual distribution of your books.
          </p>
        </div>
      </div>

      {/* Toggle card */}
      <div className="bg-white/4 border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-white">
            Auto-translate new books
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            When enabled, every new book you publish will automatically be
            queued for AI-powered translation into all supported languages
            (English, French, Spanish, Arabic, Swahili, German, Russian,
            Chinese, Yoruba, Hausa, and Portuguese).
          </p>
        </div>

        {/* Switch */}
        <div className="shrink-0 flex items-center">
          {loading ? (
            <Loader2 size={20} className="animate-spin text-[#00D9FF]" />
          ) : (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={handleToggle}
                disabled={saveState === 'saving'}
                className="sr-only peer"
              />
              {/* Track */}
              <div
                className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                  enabled ? 'bg-[#00D9FF]' : 'bg-white/10'
                } ${saveState === 'saving' ? 'opacity-60' : ''}`}
              >
                {/* Knob */}
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Status feedback */}
      {saveState === 'saving' && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 size={13} className="animate-spin" />
          Saving preference…
        </div>
      )}

      {saveState === 'saved' && (
        <div className="flex items-center gap-2 text-xs text-[#00F5A0]">
          <CheckCircle size={13} />
          {enabled
            ? 'Auto-translate is now enabled for new books.'
            : 'Auto-translate has been disabled.'}
        </div>
      )}

      {saveState === 'error' && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-xs text-red-400">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{errorMsg || 'Something went wrong. Please try again.'}</span>
        </div>
      )}

      {/* Info box */}
      <div className="bg-[#9D4EDD]/8 border border-[#9D4EDD]/20 rounded-xl px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-[#9D4EDD] uppercase tracking-wider">
          How it works
        </p>
        <ul className="text-xs text-gray-400 space-y-1 list-none">
          {[
            'Each new book upload triggers the translation pipeline automatically.',
            'Translations are generated using AI (DeepL / Google Translate) and saved as separate PDF files.',
            'Readers can purchase translated versions; you earn 60% of each translation sale.',
            'You can manually trigger translations for existing books from the Translations tab.',
          ].map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#9D4EDD] mt-0.5 shrink-0">→</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AuthorTranslationToggle;
