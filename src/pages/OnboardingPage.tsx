import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Music, BookOpen, Headphones, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Data ───────────────────────────────────────────────────────────��───────────

const GENRES = [
  { id: 'gospel',     label: 'Gospel',     emoji: '✝️' },
  { id: 'afrobeats',  label: 'Afrobeats',  emoji: '🥁' },
  { id: 'worship',    label: 'Worship',    emoji: '🙏' },
  { id: 'hiphop',     label: 'Hip-Hop',    emoji: '🎤' },
  { id: 'rnb',        label: 'R&B',        emoji: '🎸' },
  { id: 'highlife',   label: 'Highlife',   emoji: '🎺' },
  { id: 'jazz',       label: 'Jazz',       emoji: '🎷' },
  { id: 'classical',  label: 'Classical',  emoji: '🎻' },
  { id: 'reggae',     label: 'Reggae',     emoji: '🌿' },
  { id: 'pop',        label: 'Pop',        emoji: '⭐' },
  { id: 'podcasts',   label: 'Podcasts',   emoji: '🎙️' },
  { id: 'audiobooks', label: 'Audiobooks', emoji: '📚' },
];

const LANGUAGES = [
  { code: 'en',  label: 'English',    flag: '🇬🇧' },
  { code: 'fr',  label: 'Français',   flag: '🇫🇷' },
  { code: 'yo',  label: 'Yoruba',     flag: '🇳🇬' },
  { code: 'ig',  label: 'Igbo',       flag: '🇳🇬' },
  { code: 'ha',  label: 'Hausa',      flag: '🇳🇬' },
  { code: 'sw',  label: 'Kiswahili',  flag: '🇰🇪' },
  { code: 'zu',  label: 'Zulu',       flag: '🇿🇦' },
  { code: 'tw',  label: 'Twi',        flag: '🇬🇭' },
  { code: 'pcm', label: 'Pidgin',     flag: '🌍' },
  { code: 'ar',  label: 'العربية',    flag: '🇸🇦' },
  { code: 'pt',  label: 'Português',  flag: '🇧🇷' },
  { code: 'es',  label: 'Español',    flag: '🇪🇸' },
  { code: 'de',  label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh',  label: '中文',        flag: '🇨🇳' },
];

const CONTENT_TYPES = [
  { id: 'music',      label: 'Music',      icon: <Music      className="w-5 h-5" /> },
  { id: 'audiobooks', label: 'Audiobooks', icon: <Headphones className="w-5 h-5" /> },
  { id: 'books',      label: 'Books',      icon: <BookOpen   className="w-5 h-5" /> },
  { id: 'podcasts',   label: 'Podcasts',   icon: <Globe      className="w-5 h-5" /> },
];

type Step = 'content' | 'genres' | 'languages' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'content',   label: 'Content'   },
  { id: 'genres',    label: 'Genres'    },
  { id: 'languages', label: 'Languages' },
];

// ── Component ───────────────────────────���──────────────────────────────────���───

export default function OnboardingPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [step,      setStep]     = useState<Step>('content');
  const [content,   setContent]  = useState<string[]>(['music']);
  const [genres,    setGenres]   = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [saving,    setSaving]   = useState(false);

  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const stepIdx = STEPS.findIndex(s => s.id === step);

  const canAdvance = () => {
    if (step === 'content')   return content.length > 0;
    if (step === 'genres')    return genres.length > 0;
    if (step === 'languages') return languages.length > 0;
    return true;
  };

  const next = async () => {
    if (step === 'content')   { setStep('genres');    return; }
    if (step === 'genres')    { setStep('languages'); return; }
    if (step === 'languages') {
      setSaving(true);
      if (user) {
        await supabase.from('user_preferences').upsert([{
          user_id:        user.id,
          genres:         genres,
          languages:      languages,
          content_types:  content,
          onboarded:      true,
          updated_at:     new Date().toISOString(),
        }], { onConflict: 'user_id' });
      }
      setSaving(false);
      setStep('done');
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/30">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">You're all set!</h1>
        <p className="text-white/50 mb-8 max-w-sm">
          Your homepage is now personalised. Discover music and content tailored to you.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 rounded-2xl font-bold text-white text-base hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}
        >
          Explore WANKONG →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-black text-lg">W</span>
          </div>
          <h1 className="text-2xl font-black text-white">Personalise your experience</h1>
          <p className="text-white/40 text-sm mt-1">Takes 30 seconds</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                i <= stepIdx ? 'text-[#00D9FF]' : 'text-white/25'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  i < stepIdx ? 'bg-[#00D9FF] text-[#0B0814]' : i === stepIdx ? 'border-2 border-[#00D9FF] text-[#00D9FF]' : 'border border-white/15 text-white/25'
                }`}>
                  {i < stepIdx ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i < stepIdx ? 'bg-[#00D9FF]/40' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step: content types */}
        {step === 'content' && (
          <div>
            <h2 className="text-white font-bold text-lg mb-1">What do you love?</h2>
            <p className="text-white/40 text-sm mb-5">Select everything that interests you.</p>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map(c => {
                const sel = content.includes(c.id);
                return (
                  <button key={c.id} onClick={() => setContent(toggle(content, c.id))}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                      sel ? 'border-[#00D9FF] bg-[#00D9FF]/10 text-white' : 'border-white/10 bg-white/3 text-white/60 hover:border-white/25'
                    }`}>
                    <span style={{ color: sel ? '#00D9FF' : undefined }}>{c.icon}</span>
                    <span className="font-semibold text-sm">{c.label}</span>
                    {sel && <Check className="w-4 h-4 ml-auto text-[#00D9FF]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: genres */}
        {step === 'genres' && (
          <div>
            <h2 className="text-white font-bold text-lg mb-1">Pick your genres</h2>
            <p className="text-white/40 text-sm mb-5">Choose at least one.</p>
            <div className="grid grid-cols-3 gap-2">
              {GENRES.map(g => {
                const sel = genres.includes(g.id);
                return (
                  <button key={g.id} onClick={() => setGenres(toggle(genres, g.id))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all ${
                      sel ? 'border-[#9D4EDD] bg-[#9D4EDD]/10 text-white' : 'border-white/10 bg-white/3 text-white/50 hover:border-white/25'
                    }`}>
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-[11px] font-semibold leading-tight">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: languages */}
        {step === 'languages' && (
          <div>
            <h2 className="text-white font-bold text-lg mb-1">Your languages</h2>
            <p className="text-white/40 text-sm mb-5">We'll prioritise content in these languages.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {LANGUAGES.map(l => {
                const sel = languages.includes(l.code);
                return (
                  <button key={l.code} onClick={() => setLanguages(toggle(languages, l.code))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      sel ? 'border-[#00D9FF] bg-[#00D9FF]/10 text-white' : 'border-white/10 bg-white/3 text-white/50 hover:border-white/25'
                    }`}>
                    <span className="text-xl">{l.flag}</span>
                    <span className="text-[10px] font-semibold text-center leading-tight">{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button onClick={() => navigate('/')}
            className="text-sm text-white/30 hover:text-white transition-colors">
            Skip for now
          </button>
          <button
            onClick={next}
            disabled={!canAdvance() || saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {step === 'languages' ? 'Finish' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
