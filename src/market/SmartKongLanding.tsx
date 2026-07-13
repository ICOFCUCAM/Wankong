import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import { MarketHeader, MarketFooter } from './MarketLayout';
import {
  Search, Sparkles, Mic, Camera, Star, ArrowRight, ShieldCheck, Zap,
  Laptop, Car, Home as HomeIcon, Shirt, BookOpen, HeartPulse,
  Brain, Wrench, Store, Globe, Lock, RefreshCw, CheckCircle2,
  TrendingUp, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

// ── SmartKong landing — the premium front door ──────────────────────────────────
// Animated constellation hero, AI search, live stats, category tiles, live
// trending products, AI-shopping showcase, global-vendor wall, trust section.
// Deep-black premium aesthetic (Apple / Linear / Stripe / Vercel references).

const CATEGORY_TILES = [
  { label: 'Electronics', Icon: Laptop,     to: '/category/electronics', from: '#3B82F6', to2: '#06B6D4' },
  { label: 'Vehicles',    Icon: Car,        to: '/category/automotive',  from: '#8B5CF6', to2: '#6366F1' },
  { label: 'Home',        Icon: HomeIcon,   to: '/category/home',        from: '#10B981', to2: '#059669' },
  { label: 'Fashion',     Icon: Shirt,      to: '/category/fashion',     from: '#EC4899', to2: '#F43F5E' },
  { label: 'Machinery',   Icon: Wrench,     to: '/category/machinery',   from: '#F59E0B', to2: '#EA580C' },
  { label: 'Health',      Icon: HeartPulse, to: '/category/health',      from: '#EF4444', to2: '#EC4899' },
  { label: 'Digital',     Icon: BookOpen,   to: '/category/digital',     from: '#14B8A6', to2: '#0EA5E9' },
  { label: 'AI Services', Icon: Brain,      to: '/ai-solver',            from: '#6366F1', to2: '#A855F7' },
];

const STATS = [
  { value: 20,   suffix: 'M+', label: 'Products indexed' },
  { value: 18500, suffix: '',  label: 'Trusted vendors' },
  { value: 230,  suffix: '',   label: 'Countries served' },
  { value: 1.8,  suffix: 'M+', label: 'Happy customers' },
];

const VENDORS = [
  'Amazon', 'eBay', 'Temu', 'Alibaba', 'AliExpress', 'Best Buy', 'Walmart',
  'Newegg', 'B&H', 'Etsy', 'StockX', 'Nike', 'Adidas', 'Apple', 'Microsoft',
  'Dell', 'Lenovo', 'ASUS', 'Shopify', 'Target', 'Jumia', 'Rakuten', 'CJ',
];

const WHY = [
  { Icon: Sparkles, title: 'AI finds better deals', body: 'Search thousands of vendors at once and surface the best price, instantly.' },
  { Icon: TrendingUp, title: 'Price intelligence', body: 'Know whether to buy now or wait, with AI-driven price and demand signals.' },
  { Icon: ShieldCheck, title: 'Only trusted vendors', body: 'Verified sellers, buyer protection and AI fraud detection on every order.' },
];

const TRUST = [
  { Icon: Lock, label: 'SSL secured' },
  { Icon: CheckCircle2, label: 'Verified vendors' },
  { Icon: ShieldCheck, label: 'Buyer protection' },
  { Icon: Brain, label: 'AI fraud detection' },
  { Icon: Zap, label: 'Secure payments' },
  { Icon: RefreshCw, label: 'Instant refunds' },
];

// ── Constellation canvas (AI particles + connecting lines) ──────────────────────
function Constellation() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COUNT = window.innerWidth < 768 ? 34 : 64;
    const pts: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    for (let i = 0; i < COUNT; i++) {
      pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(96,165,250,${0.14 * (1 - dist / 130)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = 'rgba(147,197,253,0.7)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />;
}

// ── Count-up number ─────────────────────────────────────────────────────────────
function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now();
        const dur = 1600;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(value * eased);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  const fmt = (n: number) => {
    if (value >= 1000 && value < 1_000_000) return Math.round(n).toLocaleString();
    if (value % 1 !== 0) return n.toFixed(1);
    return Math.round(n).toString();
  };

  return <span ref={ref}>{fmt(display)}{suffix}</span>;
}

// ── Premium product card ────────────────────────────────────────────────────────
interface Prod {
  id: string; title: string; handle: string | null; price: number;
  compare_at_price: number | null; cover_url: string | null; vendor: string | null;
  product_type: string | null; is_affiliate: boolean; rating_avg: number | null; rating_count: number | null;
}

function PremiumCard({ p }: { p: Prod }) {
  const priceUsd = (p.price ?? 0) / 100;
  const compareUsd = p.compare_at_price ? p.compare_at_price / 100 : null;
  const img = p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`;
  return (
    <Link
      to={`/products/${p.handle ?? p.id}`}
      className="group relative rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-blue-400/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(37,99,235,0.4)]"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-white/[0.06] to-transparent">
        <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-semibold uppercase tracking-wide text-white/80">
          {p.is_affiliate ? (p.vendor ?? 'Partner') : (p.product_type ?? 'Product')}
        </span>
        {compareUsd && compareUsd > priceUsd && (
          <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-[10px] font-bold">
            -{Math.round((1 - priceUsd / compareUsd) * 100)}%
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white line-clamp-1">{p.title}</h3>
        <div className="flex items-center gap-1 mt-1.5 text-amber-400 text-xs">
          {(p.rating_count ?? 0) > 0 ? (
            <>
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="text-white/70">{Number(p.rating_avg).toFixed(1)}</span>
              <span className="text-white/30">({p.rating_count})</span>
            </>
          ) : <span className="text-white/30">New arrival</span>}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">{priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : 'Free'}</span>
            {compareUsd && compareUsd > priceUsd && <span className="text-xs text-white/30 line-through">${compareUsd.toFixed(2)}</span>}
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Compare <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function SmartKongLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [trending, setTrending] = useState<Prod[]>([]);
  const firstName = (user?.user_metadata?.display_name || user?.email?.split('@')[0] || '').split(' ')[0];

  useEffect(() => {
    supabase
      .from('ecom_products')
      .select('id, title, handle, price, compare_at_price, cover_url, vendor, product_type, is_affiliate, rating_avg, rating_count')
      .eq('status', 'active')
      .order('trending_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => { if (Array.isArray(data)) setTrending(data as unknown as Prod[]); });
  }, []);

  const runSearch = useCallback((text?: string) => {
    const q = (text ?? query).trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  }, [query, navigate]);

  const runAi = useCallback(() => {
    const q = query.trim();
    navigate(q ? `/ai-solver?q=${encodeURIComponent(q)}` : '/ai-solver');
  }, [query, navigate]);

  const voiceSearch = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { toast.info('Voice search isn’t supported in this browser.'); return; }
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false;
    toast.info('Listening… speak now');
    r.onresult = (e: any) => { const t = e.results[0][0].transcript; setQuery(t); runSearch(t); };
    r.onerror = () => toast.error('Could not hear you — try again.');
    r.start();
  };

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <style>{`
        @keyframes sk-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes sk-drift { 0%,100%{transform:translate(0,0)} 33%{transform:translate(40px,-30px)} 66%{transform:translate(-30px,20px)} }
        @keyframes sk-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes sk-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes sk-rise { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .sk-rise{animation:sk-rise .8s cubic-bezier(.2,.7,.2,1) both}
        .sk-float{animation:sk-float 7s ease-in-out infinite}
        .sk-marquee{animation:sk-marquee 38s linear infinite}
        .sk-cursor::after{content:'▍';animation:sk-blink 1s step-end infinite;color:#60A5FA}
      `}</style>

      <Seo
        title="The World's AI Marketplace"
        description="Discover anything, buy from anywhere. Search millions of products across thousands of trusted stores, compare prices instantly, and shop with AI."
      />
      <MarketHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Mesh gradient */}
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute top-[-20%] left-[10%] w-[46rem] h-[46rem] rounded-full opacity-40 blur-[120px]" style={{ background: 'radial-gradient(circle,#2563EB,transparent 60%)', animation: 'sk-drift 20s ease-in-out infinite' }} />
          <div className="absolute bottom-[-30%] right-[5%] w-[42rem] h-[42rem] rounded-full opacity-30 blur-[120px]" style={{ background: 'radial-gradient(circle,#7C3AED,transparent 60%)', animation: 'sk-drift 26s ease-in-out infinite reverse' }} />
        </div>
        <Constellation />

        {/* Floating glass product chips */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
          {[
            { t: '14%', l: '6%', d: '0s', label: 'MacBook Pro M4', price: '$1,599' },
            { t: '58%', l: '3%', d: '1.4s', label: 'Sony WH-1000XM6', price: '$348' },
            { t: '20%', r: '5%', d: '.7s', label: 'iPhone 18 Pro', price: '$1,199' },
            { t: '64%', r: '8%', d: '2s', label: 'RTX 5090 Rig', price: '$2,899' },
          ].map((c, i) => (
            <div key={i} className="sk-float absolute w-44 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md p-3 shadow-2xl"
              style={{ top: c.t, left: (c as any).l, right: (c as any).r, animationDelay: c.d }}>
              <div className="h-16 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-400/10 mb-2" />
              <p className="text-xs font-semibold text-white/90 truncate">{c.label}</p>
              <p className="text-xs text-blue-300">{c.price} · best price</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto px-4 lg:px-8 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          <div className="sk-rise inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-sm text-white/80 mb-8">
            <Sparkles className="w-4 h-4 text-blue-400" /> The world’s AI marketplace
          </div>

          <h1 className="sk-rise text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6" style={{ animationDelay: '.05s' }}>
            Discover Anything.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400">Buy From Anywhere.</span>
          </h1>

          <p className="sk-rise text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-10" style={{ animationDelay: '.1s' }}>
            Search millions of products across thousands of trusted stores, compare
            prices instantly, chat with AI experts, and buy from the best source —
            all in one place.
          </p>

          {/* AI search box */}
          <div className="sk-rise max-w-2xl mx-auto" style={{ animationDelay: '.15s' }}>
            <div className="rounded-2xl bg-white/[0.06] border border-white/12 backdrop-blur-xl p-2 shadow-2xl">
              <div className="flex items-center gap-2 px-3">
                <Search className="w-5 h-5 text-white/40 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runSearch()}
                  placeholder="What are you looking for today?"
                  className="flex-1 bg-transparent py-3.5 text-white placeholder-white/35 focus:outline-none text-base"
                />
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <button onClick={voiceSearch} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] text-sm transition-colors">
                  <Mic className="w-4 h-4" /> Voice
                </button>
                <button onClick={() => toast.info('Image search is rolling out soon.')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] text-sm transition-colors">
                  <Camera className="w-4 h-4" /> Image
                </button>
                <button onClick={runAi} className="ml-auto flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-4 h-4" /> AI Search
                </button>
              </div>
            </div>

            {/* quick pills */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {['headphones', 'gaming laptop', 'running shoes', 'home office'].map(t => (
                <button key={t} onClick={() => { setQuery(t); runSearch(t); }} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white/55 hover:text-white hover:border-white/25 text-xs transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live stats */}
        <div className="relative border-t border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="text-xs md:text-sm text-white/40 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 md:py-20">
        <SectionHead eyebrow="Browse" title="Shop every category" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {CATEGORY_TILES.map(c => (
            <Link key={c.label} to={c.to}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at 30% 0%, ${c.from}22, transparent 60%)` }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to2})` }}>
                  <c.Icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-white">{c.label}</p>
                <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1 group-hover:text-blue-300 transition-colors">
                  Explore <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TRENDING ─────────────────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 lg:px-8 pb-16 md:pb-20">
          <div className="flex items-end justify-between">
            <SectionHead eyebrow="Right now" title="Trending on SmartKong" />
            <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8">
            {trending.map(p => <PremiumCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── WHY SMARTKONG ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 md:py-20">
        <SectionHead center eyebrow="Why SmartKong" title="Shopping, upgraded by AI" />
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {WHY.map(w => (
            <div key={w.title} className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-7">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center mb-5">
                <w.Icon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{w.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI SHOPPING SHOWCASE ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16 md:py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden grid lg:grid-cols-2">
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 text-blue-400 text-sm font-semibold mb-4">
              <MessageSquare className="w-4 h-4" /> AI Shopping Assistant
            </span>
            <h3 className="text-3xl md:text-4xl font-black leading-tight mb-4">
              Describe what you need.<br />We find the best match.
            </h3>
            <p className="text-white/50 mb-6">
              Skip the endless tabs. Tell SmartKong your problem, budget and use-case —
              our AI reads across the whole catalog and returns ranked picks with reasons.
            </p>
            <button onClick={() => navigate('/ai-solver')} className="w-fit flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25">
              <Sparkles className="w-4 h-4" /> Try the AI Solver
            </button>
          </div>
          <div className="bg-[#0A0C12] p-6 md:p-8 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-center gap-4">
            <div className="self-end max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm">
              I need a laptop under $1,200 for machine learning.
            </div>
            <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-white/80">
              <span className="flex items-center gap-1.5 text-blue-300 font-semibold mb-1.5">
                <Sparkles className="w-3.5 h-3.5" /> SmartKong AI
              </span>
              <span className="sk-cursor">Great pick for ML on a budget. Top 3: a 32GB RAM ultrabook with a discrete GPU, a refurbished workstation with CUDA support, and a cloud-GPU bundle. Comparing prices across 6 vendors now</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── GLOBAL VENDORS ───────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-y border-white/[0.06] bg-white/[0.015]">
        <p className="text-center text-sm text-white/40 mb-8">Aggregating the world’s best stores &amp; networks</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="sk-marquee flex gap-4 w-max">
            {[...VENDORS, ...VENDORS].map((v, i) => (
              <span key={i} className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 font-semibold whitespace-nowrap">
                {v}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 md:py-20">
        <SectionHead center eyebrow="Peace of mind" title="Built for trust" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-10">
          {TRUST.map(t => (
            <div key={t.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center hover:border-emerald-400/30 transition-colors">
              <t.Icon className="w-7 h-7 text-emerald-400 mx-auto mb-3" />
              <p className="text-xs font-medium text-white/70">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pb-20">
        <div className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-center" style={{ background: 'linear-gradient(120deg,#1D4ED8,#0EA5E9 55%,#7C3AED)' }}>
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 80% 20%, #fff4, transparent 40%)' }} aria-hidden />
          <div className="relative">
            <h3 className="text-3xl md:text-5xl font-black mb-4">
              {firstName ? `Ready when you are, ${firstName}.` : 'Sell to the world with SmartKong.'}
            </h3>
            <p className="text-white/80 max-w-xl mx-auto mb-8">
              List your products once and reach millions of AI-guided shoppers across 230 countries.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/vendor/register" className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-gray-900 font-bold hover:bg-white/90 transition-colors">
                <Store className="w-4 h-4" /> Become a Vendor
              </Link>
              <Link to="/shop" className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/15 border border-white/25 backdrop-blur-md text-white font-bold hover:bg-white/25 transition-colors">
                <Globe className="w-4 h-4" /> Start Shopping
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketFooter />
    </div>
  );
}

function SectionHead({ eyebrow, title, center }: { eyebrow: string; title: string; center?: boolean }) {
  return (
    <div className={center ? 'text-center' : ''}>
      <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest">{eyebrow}</p>
      <h2 className="text-3xl md:text-4xl font-black text-white mt-2">{title}</h2>
    </div>
  );
}
