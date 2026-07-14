import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard from './MarketProductCard';
import { Reveal } from './motion';
import type { MarketProduct } from './useMarketCatalog';
import { Sparkles, Search, Loader2, Gauge } from 'lucide-react';

const EXAMPLES = [
  'My car battery keeps dying in cold weather',
  'I need noise-cancelling headphones for a home office',
  'Help me learn digital marketing from scratch',
  'I struggle to sleep at night',
  'I want durable equipment for a small farm',
];

interface Routing {
  stores: number;
  pick: { productId: string; merchant: string; priceCents: number };
  saveCents: number;
}

interface Result extends MarketProduct {
  score: number;
  reason: string | null;
  routing: Routing | null;
}

// SmartKong AI Problem Solver — light-theme port of the original
// SmartKongMarket AI discovery flow, backed by /api/ai-solver.
export default function MarketAiSolverPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get('q') ?? '';

  const [problem, setProblem] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [constraints, setConstraints] = useState<any>(null);

  const solve = async (text?: string) => {
    const query = (text ?? problem).trim();
    if (query.length < 8) { setError('Describe your problem in a few words.'); return; }
    if (text) setProblem(text);

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/ai-solver', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ problem: query, userId: user?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      const recs = (Array.isArray(data.recommendations) ? data.recommendations : []) as Result[];
      setResults(recs);
      setConstraints(data.constraints ?? null);
      setReasons(Object.fromEntries(recs.map(r => [r.id, r.reason ?? ''])));
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Auto-run when arriving with ?q= from the header search's AI button
  useEffect(() => {
    if (prefill && prefill.trim().length >= 8) solve(prefill);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MarketLayout>
      <Seo
        title="AI Problem Solver"
        description="Describe your problem and SmartKong's AI finds the products that solve it — across creators, brands and affiliate networks."
      />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">
        <Reveal className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-500/25" style={{ background: 'var(--sk-aurora)' }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <span className="sk-eyebrow justify-center mb-4">Describe it — we'll find it</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[0.98] text-[var(--sk-ink)] mb-4">
            What are you trying <span className="sk-serif sk-aurora-text pr-1">to solve?</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
            Tell us what you're struggling with, and our AI searches the world's
            shelves — courses, books, gear and partner-store products — for what
            actually solves it.
          </p>
        </Reveal>

        <form
          onSubmit={e => { e.preventDefault(); solve(); }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6"
        >
          <textarea
            rows={3}
            maxLength={500}
            value={problem}
            onChange={e => setProblem(e.target.value)}
            placeholder="e.g. My car battery keeps dying in cold weather…"
            className="w-full text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-gray-300 text-xs">{problem.length}/500</span>
            <button
              type="submit"
              disabled={loading || problem.trim().length < 8}
              className="flex items-center gap-2 px-6 py-2.5 disabled:opacity-40 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity"
              style={{ background: 'var(--sk-aurora)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Thinking…' : 'Find Solutions'}
            </button>
          </div>
        </form>

        {!results && !loading && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => solve(ex)}
                className="px-3.5 py-1.5 bg-[var(--sk-mist)] hover:bg-white border border-gray-200 hover:border-blue-300 rounded-full text-xs text-gray-500 hover:text-blue-700 hover:-translate-y-0.5 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center mb-8">
            {error}
          </div>
        )}

        {results && (
          results.length === 0 ? (
            <p className="text-center text-gray-500 py-14">
              Nothing matches that problem yet — try describing it differently.
            </p>
          ) : (
            <Reveal>
              <h2 className="flex items-center gap-2 text-gray-900 font-bold mb-3">
                <Sparkles className="w-4 h-4 text-blue-600" />
                {results.length} solution{results.length > 1 ? 's' : ''} found
              </h2>
              {constraints && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {constraints.maxPriceUsd && (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                      Budget ≤ ${constraints.maxPriceUsd}{constraints.currency && constraints.currency !== 'USD' ? ` (${constraints.currency})` : ''}
                    </span>
                  )}
                  {(constraints.productTypes ?? []).map((t: string) => (
                    <span key={t} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{t}</span>
                  ))}
                  {(constraints.attributes ?? []).map((a: string) => (
                    <span key={a} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{a}</span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {results.map((r, i) => (
                  <Reveal key={r.id} delay={i * 55}>
                    <MarketProductCard product={r} />
                    {r.routing && r.routing.stores > 1 && (
                      <p className="mt-2 px-1 text-[11px] font-medium text-emerald-700 flex items-center gap-1 leading-snug">
                        <Gauge className="w-3 h-3 shrink-0" />
                        <span>
                          Found at {r.routing.stores} stores — routed to{' '}
                          <span className="capitalize font-semibold">{r.routing.pick.merchant}</span>
                          {r.routing.saveCents > 0 && <> · save up to ${(r.routing.saveCents / 100).toFixed(2)}</>}
                        </span>
                      </p>
                    )}
                    {reasons[r.id] && (
                      <p className="mt-2 px-1 text-xs text-gray-500 leading-relaxed">
                        <Sparkles className="w-3 h-3 text-blue-500 inline mr-1" />
                        {reasons[r.id]}
                      </p>
                    )}
                  </Reveal>
                ))}
              </div>
            </Reveal>
          )
        )}
      </div>
    </MarketLayout>
  );
}
