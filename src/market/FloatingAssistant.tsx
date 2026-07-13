import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, X, Send, Loader2, ArrowRight } from 'lucide-react';

// Floating AI shopping assistant — a bottom-right bubble that opens a mini
// chat wired to /api/ai-solver. Mounted once (via MarketFooter) so it rides
// along on every SmartKong page.

interface Rec {
  id: string; title: string; handle: string | null; price: number;
  cover_url: string | null; vendor: string | null; reason: string | null;
}
interface Msg { role: 'user' | 'ai'; text: string; recs?: Rec[] }

const SUGGESTIONS = [
  'A laptop under $1,200 for video editing',
  'Best noise-cancelling headphones',
  'A gift for a coffee lover under $50',
];

export default function FloatingAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: "Hi! I'm your SmartKong shopping AI. Describe what you need and I'll find the best matches across every store." },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  const ask = async (text: string) => {
    const problem = text.trim();
    if (problem.length < 8 || busy) {
      if (problem.length > 0 && problem.length < 8) {
        setMsgs(m => [...m, { role: 'user', text: problem }, { role: 'ai', text: 'Tell me a little more — a few more words helps me search.' }]);
        setInput('');
      }
      return;
    }
    setMsgs(m => [...m, { role: 'user', text: problem }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai-solver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, userId: user?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      const recs: Rec[] = Array.isArray(data.recommendations) ? data.recommendations.slice(0, 3) : [];
      const text = recs.length
        ? `Here are my top ${recs.length === 1 ? 'pick' : `${recs.length} picks`}:`
        : "I couldn't find a great match in the catalog yet — try describing it a different way.";
      setMsgs(m => [...m, { role: 'ai', text, recs }]);
    } catch (err: any) {
      setMsgs(m => [...m, { role: 'ai', text: err.message ?? 'Could not reach the AI right now. Please try again.' }]);
    }
    setBusy(false);
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full [background:var(--sk-aurora)] text-white font-semibold shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 transition-transform"
          title="Ask the SmartKong AI"
        >
          <span className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
            <span className="absolute -inset-1 rounded-full bg-white/30 animate-ping" />
          </span>
          <span className="hidden sm:inline text-sm">Ask AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[70vh] sm:h-[560px] max-h-[640px] flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 [background:var(--sk-aurora)] text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
              <div className="leading-tight">
                <p className="text-sm font-bold">SmartKong AI</p>
                <p className="text-[11px] text-white/70">Finds the best deals for you</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-white/15 transition-colors" title="Close"><X className="w-4 h-4" /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'w-full'}`}>
                  <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md'
                  }`}>
                    {m.text}
                  </div>
                  {m.recs && m.recs.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.recs.map(r => {
                        const priceUsd = (r.price ?? 0) / 100;
                        const img = r.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${r.id}`;
                        return (
                          <Link
                            key={r.id}
                            to={`/products/${r.handle ?? r.id}`}
                            onClick={() => setOpen(false)}
                            className="group flex gap-3 p-2 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                          >
                            <img src={img} alt={r.title} className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-100" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600">{r.title}</p>
                              {r.reason && <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{r.reason}</p>}
                              <p className="text-sm font-bold text-gray-900 mt-0.5">{priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : 'Free'}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 self-center group-hover:text-blue-600 transition-colors shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl rounded-bl-md text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Searching the catalog…
                </div>
              </div>
            )}

            {msgs.length <= 1 && !busy && (
              <div className="pt-1 space-y-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); ask(input); }}
            className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white shrink-0"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Describe what you need…"
              className="flex-1 min-w-0 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
