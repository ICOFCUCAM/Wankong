import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import { Magnetic } from './motion';
import { Sparkles, Search, ArrowRight, Compass } from 'lucide-react';

const SUGGESTIONS = [
  { label: 'Browse the catalog', to: '/shop' },
  { label: 'Ask the AI', to: '/ai-solver' },
  { label: 'AI Collections', to: '/#collections' },
  { label: 'Compare products', to: '/compare' },
];

// A dead end that still feels like SmartKong — the meridian never breaks.
export default function MarketNotFoundPage() {
  const navigate = useNavigate();
  return (
    <MarketLayout>
      <Seo title="Off the map" description="This page wandered off the shopping layer." noIndex />
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full opacity-15 blur-3xl" style={{ background: 'var(--sk-aurora)' }} />
        <div className="relative max-w-2xl mx-auto px-4 py-24 md:py-32 text-center">
          <span className="sk-eyebrow justify-center mb-6"><Compass className="w-3.5 h-3.5" /> Off the map</span>

          {/* Giant outlined 404 with the signature serif accent */}
          <p className="sk-outline-text font-black tracking-[-0.04em] leading-none text-[26vw] md:text-[13rem] select-none" aria-hidden>404</p>

          <h1 className="mt-2 text-3xl md:text-5xl font-black tracking-[-0.03em] text-[var(--sk-ink)]">
            This page went <span className="sk-serif sk-aurora-text pr-1">shopping.</span>
          </h1>
          <p className="mt-4 text-gray-500 leading-relaxed max-w-md mx-auto">
            We couldn't find what you were looking for — but SmartKong indexes the
            whole world's commerce, so whatever you need is one search away.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Magnetic>
              <button
                onClick={() => navigate('/ai-solver')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold shadow-lg shadow-violet-500/25"
                style={{ background: 'var(--sk-aurora)' }}
              >
                <Sparkles className="w-4 h-4" /> Ask the AI to find it
              </button>
            </Magnetic>
            <Link to="/shop" className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 font-bold transition-colors">
              <Search className="w-4 h-4" /> Browse everything
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map(s => (
              <Link key={s.label} to={s.to} className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200 hover:border-blue-300 bg-white text-sm text-gray-600 hover:text-blue-700 transition-colors">
                {s.label} <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketLayout>
  );
}
