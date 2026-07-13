import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import { useCompare } from './useCompare';
import { Stars } from './MarketProductCard';
import {
  Sparkles, Check, X, Trophy, Loader2, Search, Plus, ArrowLeft, ShoppingCart,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface Product {
  id: string; title: string; handle: string | null; price: number;
  compare_at_price: number | null; cover_url: string | null; vendor: string | null;
  product_type: string | null; genre: string | null;
  rating_avg: number | null; rating_count: number | null;
}
interface CompareItem { id: string; pros: string[]; cons: string[]; bestFor: string }
interface CompareResult { aiPowered: boolean; summary: string; winnerId: string | null; items: CompareItem[] }

const SELECT = 'id, title, handle, price, compare_at_price, cover_url, vendor, product_type, genre, rating_avg, rating_count';

export default function MarketComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { ids, remove, clear, toggle, isFull } = useCompare();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [result, setResult]     = useState<CompareResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAdd, setShowAdd]   = useState(false);

  // Seed the tray from ?ids= (shareable comparison links)
  useEffect(() => {
    const urlIds = (params.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
    urlIds.forEach(id => { if (!ids.includes(id)) toggle(id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the tray's products
  useEffect(() => {
    if (ids.length === 0) { setProducts([]); setResult(null); return; }
    setLoading(true);
    supabase.from('ecom_products').select(SELECT).in('id', ids).then(({ data }) => {
      const ordered = ids.map(id => (data ?? []).find((p: any) => p.id === id)).filter(Boolean) as Product[];
      setProducts(ordered);
      setLoading(false);
    });
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const runComparison = useCallback(async () => {
    if (ids.length < 2) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Comparison failed');
      setResult(data as CompareResult);
    } catch (err: any) {
      toast.error(err.message);
    }
    setAnalyzing(false);
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemFor = (id: string) => result?.items.find(i => i.id === id);

  return (
    <MarketLayout>
      <Seo title="Compare Products" description="AI-generated side-by-side product comparison — pros, cons and the best-value pick." />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Compare products</h1>
            <p className="text-gray-500 text-sm mt-1">Add up to 4 items and let AI break down the trade-offs.</p>
          </div>
          <div className="flex items-center gap-2">
            {ids.length > 0 && (
              <button onClick={clear} className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
                Clear
              </button>
            )}
            <button
              onClick={runComparison}
              disabled={ids.length < 2 || analyzing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Analyzing…' : 'Compare with AI'}
            </button>
          </div>
        </div>

        {ids.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-300 rounded-2xl">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Your comparison is empty. Add products from the catalog with the “Compare” button.</p>
            <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Add products
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : (
          <>
            {result?.summary && (
              <div className="mb-8 rounded-2xl bg-blue-50 border border-blue-100 p-5">
                <p className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-1.5">
                  <Sparkles className="w-4 h-4" /> AI verdict
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">{result.summary}</p>
              </div>
            )}

            <div className="overflow-x-auto">
              <div className="grid gap-5 min-w-[640px]" style={{ gridTemplateColumns: `repeat(${products.length + (products.length < 4 ? 1 : 0)}, minmax(0, 1fr))` }}>
                {products.map(p => {
                  const item = itemFor(p.id);
                  const isWinner = result?.winnerId === p.id;
                  return (
                    <div key={p.id} className={`relative rounded-2xl border bg-white overflow-hidden ${isWinner ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-200'}`}>
                      {isWinner && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold uppercase">
                          <Trophy className="w-3 h-3" /> Best value
                        </div>
                      )}
                      <button onClick={() => remove(p.id)} className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                      <Link to={`/products/${p.handle ?? p.id}`}>
                        <img src={p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`} alt={p.title} className="w-full aspect-square object-cover" />
                      </Link>
                      <div className="p-4">
                        <Link to={`/products/${p.handle ?? p.id}`} className="font-semibold text-gray-900 line-clamp-2 hover:text-blue-600">{p.title}</Link>
                        <div className="mt-1.5">
                          {(p.rating_count ?? 0) > 0 ? <Stars value={Number(p.rating_avg)} count={p.rating_count ?? 0} /> : <span className="text-xs text-gray-300">No reviews</span>}
                        </div>
                        <p className="text-2xl font-extrabold text-gray-900 mt-2">{p.price > 0 ? `$${(p.price / 100).toFixed(2)}` : 'Free'}</p>
                        <p className="text-xs text-gray-400 mb-3">{p.product_type ?? 'Product'}{p.vendor ? ` · ${p.vendor}` : ''}</p>

                        {item ? (
                          <div className="space-y-3">
                            {item.bestFor && (
                              <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5 font-medium">Best for: {item.bestFor}</p>
                            )}
                            <div>
                              {item.pros.map((pro, i) => (
                                <p key={i} className="flex items-start gap-1.5 text-xs text-gray-600 mb-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {pro}
                                </p>
                              ))}
                              {item.cons.map((con, i) => (
                                <p key={i} className="flex items-start gap-1.5 text-xs text-gray-500 mb-1">
                                  <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" /> {con}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">Hit “Compare with AI” for pros &amp; cons.</p>
                        )}

                        <button
                          onClick={() => { addToCart({ id: p.id, title: p.title, price: p.price / 100, image: p.cover_url ?? '' }); toast.success('Added to cart'); }}
                          className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}

                {products.length < 4 && (
                  <button onClick={() => setShowAdd(true)} className="rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 transition-colors min-h-[200px]">
                    <Plus className="w-8 h-8" />
                    <span className="text-sm font-medium">Add product</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onPick={id => { if (!isFull) toggle(id); }} selected={ids} />}
    </MarketLayout>
  );
}

// ── Add-to-comparison search modal ───────────────────────────────────────────────
function AddModal({ onClose, onPick, selected }: { onClose: () => void; onPick: (id: string) => void; selected: string[] }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      let query = supabase.from('ecom_products').select(SELECT).eq('status', 'active');
      if (q.trim()) query = query.ilike('title', `%${q.replace(/[%_]/g, '')}%`);
      const { data } = await query.order('trending_score', { ascending: false }).limit(24);
      setRows((data ?? []) as Product[]);
      setLoading(false);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search products to compare…" className="flex-1 text-sm text-gray-900 focus:outline-none" />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No products found.</p>
          ) : rows.map(p => {
            const picked = selected.includes(p.id);
            return (
              <button key={p.id} onClick={() => { if (!picked) onPick(p.id); }} disabled={picked}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${picked ? 'bg-blue-50 opacity-60' : 'hover:bg-gray-50'}`}>
                <img src={p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`} alt="" className="w-11 h-11 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.price > 0 ? `$${(p.price / 100).toFixed(2)}` : 'Free'}</p>
                </div>
                {picked ? <Check className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-gray-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
