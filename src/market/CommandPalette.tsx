import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { MARKET_CATEGORIES } from './categories';
import {
  Search, Sparkles, Store, Heart, GitCompare, Package, ArrowRight,
  CornerDownLeft, Command as CommandIcon, Loader2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SmartKong command bar — press ⌘K / Ctrl-K anywhere to search the world's
// catalog, jump to any section, or hand a problem to the AI. The single
// keystroke that makes SmartKong feel like an operating system, not a store.
// ─────────────────────────────────────────────────────────────────────────────

interface Hit { id: string; title: string; handle: string | null; cover_url: string | null; price: number }

const ACTIONS = [
  { label: 'Ask the AI to find it', hint: 'Describe a problem', icon: Sparkles, to: (q: string) => q ? `/ai-solver?q=${encodeURIComponent(q)}` : '/ai-solver' },
  { label: 'Browse everything',     hint: 'The full catalog',   icon: Package,   to: () => '/shop' },
  { label: 'Compare products',      hint: 'Side by side',       icon: GitCompare,to: () => '/compare' },
  { label: 'Your wishlist',         hint: 'Saved items',        icon: Heart,     to: () => '/wishlist' },
  { label: 'Sell on SmartKong',     hint: 'Become a vendor',    icon: Store,     to: () => '/vendor/register' },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQ(''); setHits([]); setActive(0); setTimeout(() => inputRef.current?.focus(), 40); }
  }, [open]);

  // Live product search (debounced)
  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('ecom_products')
        .select('id, title, handle, cover_url, price')
        .eq('status', 'active')
        .ilike('title', `%${q.replace(/[%_]/g, '')}%`)
        .order('trending_score', { ascending: false })
        .limit(6);
      setHits((data ?? []) as Hit[]);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const catHits = q.trim().length >= 1
    ? MARKET_CATEGORIES.filter(c => c.label.toLowerCase().includes(q.toLowerCase())).slice(0, 3)
    : [];

  // Flatten to a navigable list for arrow keys
  type Row = { key: string; run: () => void; };
  const rows: Row[] = [
    ...ACTIONS.map(a => ({ key: 'a:' + a.label, run: () => go(a.to(q.trim())) })),
    ...catHits.map(c => ({ key: 'c:' + c.slug, run: () => go(`/category/${c.slug}`) })),
    ...hits.map(h => ({ key: 'p:' + h.id, run: () => go(`/products/${h.handle ?? h.id}`) })),
  ];

  const go = useCallback((to: string) => { setOpen(false); navigate(to); }, [navigate]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); rows[active]?.run() ?? go(ACTIONS[0].to(q.trim())); }
  };

  if (!open) return null;

  let idx = -1;
  const rowClass = (i: number) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${i === active ? 'bg-[var(--sk-mist)]' : 'hover:bg-gray-50'}`;

  return (
    <div
      className="sk-market fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4 bg-[#070A14]/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search the world's catalog, or describe what you need…"
            className="flex-1 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
          />
          {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
          <kbd className="hidden sm:inline text-[10px] font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {/* Quick actions */}
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Jump to</p>
          {ACTIONS.map(a => {
            idx++; const i = idx; const Icon = a.icon;
            return (
              <div key={a.label} className={rowClass(i)} onMouseEnter={() => setActive(i)} onClick={() => go(a.to(q.trim()))}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: 'var(--sk-aurora)' }}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.label}</p>
                  <p className="text-xs text-gray-400">{a.hint}</p>
                </div>
                {i === active && <CornerDownLeft className="w-4 h-4 text-gray-300" />}
              </div>
            );
          })}

          {/* Category matches */}
          {catHits.length > 0 && (
            <>
              <p className="px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Categories</p>
              {catHits.map(c => {
                idx++; const i = idx;
                return (
                  <div key={c.slug} className={rowClass(i)} onMouseEnter={() => setActive(i)} onClick={() => go(`/category/${c.slug}`)}>
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"><Store className="w-4 h-4" /></span>
                    <p className="flex-1 text-sm font-medium text-gray-900">{c.label}</p>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                );
              })}
            </>
          )}

          {/* Product matches */}
          {hits.length > 0 && (
            <>
              <p className="px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Products</p>
              {hits.map(h => {
                idx++; const i = idx;
                return (
                  <div key={h.id} className={rowClass(i)} onMouseEnter={() => setActive(i)} onClick={() => go(`/products/${h.handle ?? h.id}`)}>
                    <img src={h.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${h.id}`} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <p className="flex-1 text-sm font-medium text-gray-900 truncate">{h.title}</p>
                    <span className="text-xs font-semibold text-gray-500">{h.price > 0 ? `$${(h.price / 100).toFixed(2)}` : 'Free'}</span>
                  </div>
                );
              })}
            </>
          )}

          {q.trim().length >= 2 && !loading && hits.length === 0 && catHits.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              No direct match — press <b className="text-gray-600">Enter</b> to ask the AI to find it.
            </p>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5"><CommandIcon className="w-3 h-3" /> SmartKong command bar</span>
          <span className="flex items-center gap-2">
            <span>↑↓ navigate</span><span>↵ open</span>
          </span>
        </div>
      </div>
    </div>
  );
}
