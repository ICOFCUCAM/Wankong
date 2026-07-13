import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import { Sparkles, Search, Star, ExternalLink } from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  handle: string | null;
  description: string | null;
  product_type: string | null;
  cover_url: string | null;
  price: number;
  is_affiliate: boolean;
  vendor: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  score: number;
  reason: string | null;
}

const EXAMPLES = [
  'I want to learn how to grow my music career',
  'I need calm background music to focus while studying',
  'Help me start a small online business in Africa',
  'I struggle to sleep at night',
  'I want to improve my English speaking skills',
];

export default function AiSolverPage() {
  const { user } = useAuth();

  const [problem,  setProblem]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [results,  setResults]  = useState<Recommendation[] | null>(null);
  const [category, setCategory] = useState<string | null>(null);

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
      setResults(data.recommendations ?? []);
      setCategory(data.analysis?.category ?? null);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Seo
        title="AI Problem Solver"
        description="Describe your problem and Wankong's AI finds the music, books, courses and products that solve it."
      />
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">What problem can we solve?</h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Tell us what you're struggling with, and our AI matches you with the music, books,
            courses and products on Wankong that can help.
          </p>
        </div>

        {/* Input */}
        <form
          onSubmit={e => { e.preventDefault(); solve(); }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 mb-6"
        >
          <textarea
            rows={3}
            maxLength={500}
            value={problem}
            onChange={e => setProblem(e.target.value)}
            placeholder="e.g. I keep procrastinating and can't stay focused when I work from home…"
            className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none resize-none text-base"
          />
          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-white/25 text-xs">{problem.length}/500</span>
            <button
              type="submit"
              disabled={loading || problem.trim().length < 8}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl transition-opacity"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Thinking…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find Solutions
                </>
              )}
            </button>
          </div>
        </form>

        {/* Example prompts */}
        {!results && !loading && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => solve(ex)}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/55 hover:text-white transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center mb-8">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          results.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-white/50">
                Nothing in the catalog matches that problem yet — try describing it differently,
                or <Link to="/collections/marketplace" className="text-[#B794F4] hover:underline">browse the marketplace</Link>.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                <h2 className="text-white font-semibold">
                  {results.length} solution{results.length > 1 ? 's' : ''} found
                  {category && category !== 'other' && <span className="text-white/40 font-normal"> · {category}</span>}
                </h2>
              </div>

              <div className="space-y-3">
                {results.map((r, i) => (
                  <Link
                    key={r.id}
                    to={`/products/${r.handle ?? r.id}`}
                    className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-[#9D4EDD]/40 transition-all group"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={r.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${r.id}`}
                        alt=""
                        className="w-20 h-20 rounded-xl object-cover"
                      />
                      <span className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold group-hover:text-[#B794F4] transition-colors truncate">
                          {r.title}
                        </h3>
                        {r.is_affiliate && (
                          <span className="px-2 py-0.5 bg-[#00D9FF]/15 text-[#00D9FF] rounded-full text-[10px] font-semibold flex items-center gap-1">
                            Partner <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-white/35 text-xs mt-0.5">
                        {r.product_type ?? 'Product'}{r.vendor ? ` · ${r.vendor}` : ''}
                        {(r.rating_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 ml-2 text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" />{Number(r.rating_avg).toFixed(1)}
                          </span>
                        )}
                      </p>
                      {r.reason && (
                        <p className="text-white/60 text-sm mt-1.5 line-clamp-2">
                          <Sparkles className="w-3 h-3 text-[#00D9FF] inline mr-1" />
                          {r.reason}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-white font-bold">
                        {r.price > 0 ? `$${(r.price / 100).toFixed(2)}` : 'Free'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        )}
      </div>
      <Footer />
    </div>
  );
}
