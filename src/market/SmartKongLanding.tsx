import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import { MarketHeader, MarketFooter } from './MarketLayout';
import { useMarketTheme, themeTokens } from './theme';
import { useCompare } from './useCompare';
import { useWishlist } from './useWishlist';
import { confettiBurst } from './confetti';
import {
  Search, Sparkles, Mic, Camera, Star, ArrowRight, ShieldCheck, Zap,
  Laptop, Car, Home as HomeIcon, Shirt, BookOpen, HeartPulse,
  Brain, Wrench, Store, Globe, Lock, RefreshCw, CheckCircle2,
  TrendingUp, MessageSquare, GitCompare, Heart, Truck,
  Package, Users, Scale, Tag, Play,
} from 'lucide-react';
import { ProductArt, VendorMark, type ArtKind } from './HeroProductArt';
import { toast } from 'sonner';

// ── SmartKong landing ───────────────────────────────────────────────────────────
// Light by default (trust-first shopping), with Dark and Aurora as premium
// options. Uses an alternating dark-band / white / gray section rhythm so the
// page stays easy to scan instead of one long dark scroll.

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

const VENDORS = [
  'Amazon', 'eBay', 'Temu', 'Alibaba', 'AliExpress', 'Best Buy', 'Walmart',
  'Newegg', 'B&H', 'Etsy', 'StockX', 'Nike', 'Adidas', 'Apple', 'Microsoft',
  'Dell', 'Lenovo', 'ASUS', 'Shopify', 'Target', 'Jumia', 'Rakuten', 'CJ',
];

// Stats shown in the hero card (matches the SmartKong hero spec).
const HERO_STATS = [
  { Icon: Package,     value: 20,    suffix: 'M+', label: 'Products' },
  { Icon: Store,       value: 18500, suffix: '+',  label: 'Stores' },
  { Icon: Globe,       value: 230,   suffix: '+',  label: 'Countries' },
  { Icon: Users,       value: 1.8,   suffix: 'M+', label: 'Happy Customers' },
  { Icon: ShieldCheck, value: 100,   suffix: '%',  label: 'Secure & Safe' },
];

// Brand wordmarks for the "Trusted by millions" strip.
const BRANDS = ['amazon', 'ebay', 'Walmart', 'BEST BUY', 'AliExpress', 'TEMU', 'Apple', 'Costco', 'Etsy', 'newegg', 'SAMSUNG'];

// Six value props under the hero.
const FEATURES = [
  { Icon: Sparkles,    title: 'AI-Powered Search',  body: 'Natural language search that understands you',        tint: 'from-blue-500 to-cyan-400' },
  { Icon: Scale,       title: 'Compare Everywhere', body: 'Compare prices across thousands of stores',            tint: 'from-violet-500 to-purple-400' },
  { Icon: Tag,         title: 'Best Deals First',   body: 'AI finds the best deals and exclusive discounts',      tint: 'from-rose-500 to-pink-400' },
  { Icon: TrendingUp,  title: 'Price Prediction',   body: 'Know when to buy with AI price predictions',           tint: 'from-amber-500 to-orange-400' },
  { Icon: ShieldCheck, title: 'Trusted & Secure',   body: 'Verified sellers, secure payments, buyer protection',  tint: 'from-emerald-500 to-green-400' },
  { Icon: Globe,       title: 'Global Shopping',    body: 'Shop from anywhere, we deliver everywhere',            tint: 'from-sky-500 to-blue-400' },
];

// Floating product cards orbiting the hero globe. Each card tries a real
// product photo (royalty-free Unsplash CDN) and falls back to coded SVG art
// if the photo can't load, so the hero never renders broken.
const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=300&h=240&q=80`;

const HERO_CARDS: {
  title: string; rating: number; count: string; price: string; vendor: string;
  art: ArtKind; photo: string; pos: string; delay: string; big?: boolean; titleMark?: boolean;
}[] = [
  { title: 'Sony WH-1000XM5',    rating: 4.8, count: '8,842', price: '348',   vendor: 'Amazon',   art: 'headphones', photo: UNSPLASH('1505740420928-5e560c06d30e'), pos: 'top-[3%] left-[20%]',    delay: '0s'   },
  { title: 'iPhone 15 Pro',      rating: 4.9, count: '6,421', price: '999',   vendor: 'Apple',    art: 'phone',      photo: UNSPLASH('1592750475338-74b7b21085ab'), pos: 'top-[17%] right-[-2%]',  delay: '.6s'  },
  { title: 'MacBook Pro M4',     rating: 4.9, count: '2,843', price: '1,599', vendor: 'Best Buy', art: 'laptop',     photo: UNSPLASH('1517336714731-489689fd1ca8'), pos: 'top-[39%] left-[-4%]',   delay: '.3s', big: true, titleMark: true },
  { title: 'DJI Air 3S Drone',   rating: 4.7, count: '1,235', price: '1,099', vendor: 'Amazon',   art: 'drone',      photo: UNSPLASH('1473968512647-3e447244af8f'), pos: 'top-[56%] right-[-4%]',  delay: '1s'   },
  { title: 'Samsung 65" OLED TV',rating: 4.8, count: '952',   price: '1,299', vendor: 'Walmart',  art: 'tv',         photo: UNSPLASH('1593784991095-a205069470b6'), pos: 'bottom-[1%] left-[13%]', delay: '1.3s', big: true },
];

const TRUST = [
  { Icon: Lock, label: 'SSL secured' },
  { Icon: CheckCircle2, label: 'Verified vendors' },
  { Icon: ShieldCheck, label: 'Buyer protection' },
  { Icon: Brain, label: 'AI fraud detection' },
  { Icon: Zap, label: 'Secure payments' },
  { Icon: RefreshCw, label: 'Instant refunds' },
];

// ── Count-up ────────────────────────────────────────────────────────────────────
function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now(), dur = 1600;
        const tick = (now: number) => { const t = Math.min(1, (now - start) / dur); setDisplay(value * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  const fmt = (n: number) => value >= 1000 && value < 1_000_000 ? Math.round(n).toLocaleString() : value % 1 !== 0 ? n.toFixed(1) : Math.round(n).toString();
  return <span ref={ref}>{fmt(display)}{suffix}</span>;
}

// ── Product card (theme-aware, large image, hover lift + zoom) ───────────────────
interface Prod {
  id: string; title: string; handle: string | null; price: number;
  compare_at_price: number | null; cover_url: string | null; vendor: string | null;
  product_type: string | null; is_affiliate: boolean; rating_avg: number | null; rating_count: number | null;
}

// A blended "AI match" score — how confident SmartKong is in the pick.
function aiScore(p: Prod): number {
  const rating = p.rating_avg ?? 4.2;
  const discount = p.compare_at_price && p.compare_at_price > p.price ? 1 - p.price / p.compare_at_price : 0;
  let s = 70 + (rating / 5) * 20 + discount * 12 + ((p.rating_count ?? 0) > 500 ? 3 : 0);
  return Math.max(72, Math.min(99, Math.round(s)));
}

function shippingLabel(p: Prod): string {
  const usd = (p.price ?? 0) / 100;
  if (usd === 0) return 'Instant';
  return usd >= 50 ? 'Free shipping' : 'Ships in 2 days';
}

function SaveButton({ p, className }: { p: Prod; className?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(p.id);
  return (
    <button
      onClick={e => {
        e.preventDefault();
        const nowSaved = toggle(p.id);
        if (nowSaved) {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
          toast.success('Saved to your wishlist');
        }
      }}
      title={saved ? 'Saved' : 'Save to wishlist'}
      className={`flex items-center justify-center rounded-full transition-all active:scale-90 ${
        saved ? 'bg-rose-500 text-white' : 'bg-white/90 text-gray-600 hover:text-rose-500 border border-gray-200'
      } ${className ?? 'w-8 h-8'}`}
    >
      <Heart className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
    </button>
  );
}

function ProductCard({ p }: { p: Prod }) {
  const { theme } = useMarketTheme();
  const T = themeTokens(theme);
  const { has, toggle, isFull } = useCompare();
  const inCompare = has(p.id);

  const priceUsd = (p.price ?? 0) / 100;
  const compareUsd = p.compare_at_price ? p.compare_at_price / 100 : null;
  const discountPct = compareUsd && compareUsd > priceUsd ? Math.round((1 - priceUsd / compareUsd) * 100) : 0;
  const img = p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`;
  const score = aiScore(p);
  const ship = shippingLabel(p);

  return (
    <Link
      to={`/products/${p.handle ?? p.id}`}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 flex flex-col ${T.card}`}
    >
      {/* Dominant image (≈65% of the card) */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-white/[0.04]">
        <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.12] transition-transform duration-[700ms] ease-out" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70" />

        {discountPct > 0 && (
          <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-rose-500 text-white text-[11px] font-bold shadow-lg">-{discountPct}%</span>
        )}
        {/* AI match score */}
        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold shadow-lg">
          <Sparkles className="w-3 h-3" /> AI {score}
        </span>

        {/* Save (top-right, drops in on hover) */}
        <div className="absolute top-12 right-3 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          <SaveButton p={p} className="w-9 h-9 shadow-lg" />
        </div>

        {/* Vendor + shipping over the gradient */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 rounded-md bg-white/90 text-gray-700 text-[10px] font-semibold truncate max-w-[55%]">
            {p.is_affiliate ? (p.vendor ?? 'Partner') : (p.vendor ?? p.product_type ?? 'SmartKong')}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-semibold">
            {ship === 'Free shipping' ? <Truck className="w-3 h-3" /> : <Zap className="w-3 h-3" />} {ship}
          </span>
        </div>

        {/* Quick compare (hover) */}
        <button
          onClick={e => { e.preventDefault(); if (!inCompare && isFull) { toast.info('Compare holds up to 4 products.'); return; } toggle(p.id); }}
          className={`absolute bottom-12 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all ${
            inCompare ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-600 hover:text-blue-600 border border-gray-200'
          }`}
        >
          <GitCompare className="w-3 h-3" /> {inCompare ? 'Added' : 'Compare'}
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className={`text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors ${T.cardTitle}`}>{p.title}</h3>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          {(p.rating_count ?? 0) > 0 ? (
            <>
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(Number(p.rating_avg)) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />)}
              </span>
              <span className={T.cardMeta}>{Number(p.rating_avg).toFixed(1)} ({p.rating_count})</span>
            </>
          ) : <span className={T.cardMeta}>New arrival</span>}
        </div>
        <div className="mt-auto pt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold tracking-tight ${T.cardTitle}`}>{priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : 'Free'}</span>
            {compareUsd && compareUsd > priceUsd && <span className={`text-xs line-through ${T.cardMeta}`}>${compareUsd.toFixed(2)}</span>}
          </div>
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all">
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SectionHead({ eyebrow, title, tokens, center, sub }: { eyebrow: string; title: string; tokens: ReturnType<typeof themeTokens>; center?: boolean; sub?: string }) {
  return (
    <div className={center ? 'text-center' : ''}>
      <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest">{eyebrow}</p>
      <h2 className={`text-3xl md:text-4xl font-black mt-2 ${tokens.heading}`}>{title}</h2>
      {sub && <p className={`mt-3 text-base ${tokens.body} ${center ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}>{sub}</p>}
    </div>
  );
}

// ── Featured "Deal of the Week" (breaks the grid rhythm) ────────────────────────
function FeaturedDeal({ p, tokens }: { p: Prod; tokens: ReturnType<typeof themeTokens> }) {
  const priceUsd = (p.price ?? 0) / 100;
  const compareUsd = p.compare_at_price ? p.compare_at_price / 100 : null;
  const save = compareUsd && compareUsd > priceUsd ? compareUsd - priceUsd : 0;
  const img = p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`;
  return (
    <Link to={`/products/${p.handle ?? p.id}`} className={`group grid md:grid-cols-2 rounded-3xl overflow-hidden mb-8 ${tokens.card}`}>
      <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden bg-gray-100 dark:bg-white/[0.04]">
        <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[800ms]" />
        <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg">Deal of the Week</span>
      </div>
      <div className="p-8 md:p-10 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold"><Sparkles className="w-3 h-3" /> AI {aiScore(p)} match</span>
          {(p.rating_count ?? 0) > 0 && <span className="flex items-center gap-1 text-amber-500 text-xs"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{Number(p.rating_avg).toFixed(1)} ({p.rating_count})</span>}
        </div>
        <h3 className={`text-2xl md:text-3xl font-black leading-tight mb-3 ${tokens.cardTitle}`}>{p.title}</h3>
        <p className={`text-sm mb-6 ${tokens.body}`}>{p.vendor ? `Sold by ${p.vendor} · ` : ''}{shippingLabel(p)} · buyer protected</p>
        <div className="flex items-end gap-3 mb-6">
          <span className={`text-4xl font-black tracking-tight ${tokens.cardTitle}`}>${priceUsd.toFixed(2)}</span>
          {compareUsd && compareUsd > priceUsd && <span className={`text-lg line-through mb-1 ${tokens.cardMeta}`}>${compareUsd.toFixed(2)}</span>}
          {save > 0 && <span className="mb-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 text-sm font-bold">Save ${save.toFixed(2)}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold group-hover:bg-blue-700 transition-colors">View deal <ArrowRight className="w-4 h-4" /></span>
          <SaveButton p={p} className="w-11 h-11" />
        </div>
      </div>
    </Link>
  );
}

// ── AI-Found Deals band (savings-first, horizontal scroll) ──────────────────────
function DealCard({ p }: { p: Prod }) {
  const priceUsd = (p.price ?? 0) / 100;
  const compareUsd = p.compare_at_price ? p.compare_at_price / 100 : priceUsd;
  const save = compareUsd - priceUsd;
  const pct = compareUsd > 0 ? Math.round((save / compareUsd) * 100) : 0;
  const img = p.cover_url ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`;
  return (
    <Link
      to={`/products/${p.handle ?? p.id}`}
      className="group relative shrink-0 w-60 rounded-2xl overflow-hidden bg-white/[0.06] border border-white/10 backdrop-blur-md hover:border-white/25 transition-all hover:-translate-y-1.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.04]">
        <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[700ms]" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-black shadow-lg">-{pct}%</span>
        <div className="absolute top-3 right-3">
          <SaveButton p={p} className="w-8 h-8 shadow-lg" />
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-white line-clamp-2 leading-snug mb-2 group-hover:text-blue-300 transition-colors">{p.title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-white">${priceUsd.toFixed(2)}</span>
          <span className="text-xs text-white/40 line-through">${compareUsd.toFixed(2)}</span>
        </div>
        <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold">
          <Zap className="w-3 h-3" /> Save ${save.toFixed(2)}
        </span>
      </div>
    </Link>
  );
}

function DealBand({ deals }: { deals: Prod[] }) {
  const totalSave = deals.reduce((s, p) => s + ((p.compare_at_price ?? 0) - p.price), 0) / 100;
  return (
    <section className="relative overflow-hidden bg-[#070810] py-16 md:py-20">
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute top-[-30%] right-[10%] w-[36rem] h-[36rem] rounded-full opacity-25 blur-[120px]" style={{ background: 'radial-gradient(circle,#10B981,transparent 60%)' }} />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" /> AI-Found Deals
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Biggest markdowns right now</h2>
            <p className="mt-2 text-white/50 max-w-xl">
              Our AI scans price drops across the catalog. These picks save you a combined{' '}
              <span className="font-bold text-emerald-300">${totalSave.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>.
            </p>
          </div>
          <Link to="/shop?sort=price_low" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 shrink-0">
            All deals <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0 snap-x">
          {deals.map(p => <div key={p.id} className="snap-start"><DealCard p={p} /></div>)}
        </div>
      </div>
    </section>
  );
}

// ── Customer stories (social proof) ─────────────────────────────────────────────
const STORIES = [
  { name: 'Amara O.', role: 'Small-business owner · Lagos', quote: 'The AI found a supplier 30% cheaper than what I was paying. SmartKong basically paid for my month.', initials: 'AO' },
  { name: 'Daniel K.', role: 'Music producer · Nairobi', quote: 'I described the exact monitors I needed and it compared six vendors in seconds. Bought in one click.', initials: 'DK' },
  { name: 'Priya S.', role: 'Student · Mumbai', quote: 'Price alerts told me exactly when to buy my laptop. Saved ₹18,000 waiting for the drop.', initials: 'PS' },
];

function Testimonials({ tokens }: { tokens: ReturnType<typeof themeTokens> }) {
  return (
    <div className="grid md:grid-cols-3 gap-6 mt-10">
      {STORIES.map(s => (
        <div key={s.name} className={`rounded-2xl p-7 ${tokens.card}`}>
          <div className="flex items-center gap-1 text-amber-400 mb-4">{[1, 2, 3, 4, 5].map(n => <Star key={n} className="w-4 h-4 fill-amber-400" />)}</div>
          <p className={`text-[15px] leading-relaxed mb-6 ${tokens.cardTitle}`}>“{s.quote}”</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">{s.initials}</div>
            <div>
              <p className={`text-sm font-semibold ${tokens.cardTitle}`}>{s.name}</p>
              <p className={`text-xs ${tokens.cardMeta}`}>{s.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Floating hero product card (image left, details right — like the mock) ─────
function HeroCard({ c }: { c: (typeof HERO_CARDS)[number] }) {
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <div
      className={`sk-float absolute z-10 rounded-2xl bg-white shadow-[0_22px_55px_-18px_rgba(30,58,138,0.4)] ring-1 ring-black/[0.05] p-2.5 ${c.pos} ${c.big ? 'w-72' : 'w-56'}`}
      style={{ animationDelay: c.delay }}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-xl overflow-hidden shrink-0 bg-gray-100 ${c.big ? 'w-24 h-[4.75rem]' : 'w-[4.5rem] h-[4.5rem]'}`}>
          {photoOk
            ? <img src={c.photo} alt={c.title} loading="eager" className="w-full h-full object-cover" onError={() => setPhotoOk(false)} />
            : <ProductArt kind={c.art} />}
        </div>
        <div className="min-w-0 py-0.5">
          <p className={`flex items-center gap-1 font-bold text-gray-900 truncate ${c.big ? 'text-sm' : 'text-xs'}`}>
            <span className="truncate">{c.title}</span>
            {c.titleMark && <VendorMark vendor="Apple" />}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4].map(n => <Star key={n} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
            <Star className="w-2.5 h-2.5 fill-amber-400/50 text-amber-400" />
            <span className="text-[10px] text-gray-400 ml-0.5">({c.count})</span>
          </div>
          <p className={`font-extrabold text-blue-600 mt-1 ${c.big ? 'text-base' : 'text-sm'}`}>From ${c.price}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <VendorMark vendor={c.vendor} />
            <span className="text-[10px] font-medium text-gray-400">{c.vendor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function SmartKongLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useMarketTheme();
  const T = themeTokens(theme);

  const [query, setQuery] = useState('');
  const [trending, setTrending] = useState<Prod[]>([]);
  const [deals, setDeals] = useState<Prod[]>([]);
  const [forYou, setForYou] = useState<Prod[]>([]);
  const firstName = (user?.user_metadata?.display_name || user?.email?.split('@')[0] || '').split(' ')[0];

  useEffect(() => {
    supabase.from('ecom_products')
      .select('id, title, handle, price, compare_at_price, cover_url, vendor, product_type, is_affiliate, rating_avg, rating_count')
      .eq('status', 'active').order('trending_score', { ascending: false }).order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => { if (Array.isArray(data)) setTrending(data as unknown as Prod[]); });
  }, []);

  // AI-Found Deals — biggest markdowns, ranked by absolute savings.
  useEffect(() => {
    supabase.from('ecom_products')
      .select('id, title, handle, price, compare_at_price, cover_url, vendor, product_type, is_affiliate, rating_avg, rating_count')
      .eq('status', 'active').not('compare_at_price', 'is', null)
      .order('compare_at_price', { ascending: false }).limit(40)
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        const ranked = (data as unknown as Prod[])
          .filter(p => p.compare_at_price && p.compare_at_price > p.price)
          .sort((a, b) => ((b.compare_at_price! - b.price) - (a.compare_at_price! - a.price)))
          .slice(0, 8);
        setDeals(ranked);
      });
  }, []);

  useEffect(() => {
    if (!user?.id) { setForYou([]); return; }
    supabase.rpc('recommend_for_user', { p_user_id: user.id, p_limit: 8 })
      .then(({ data }) => { if (Array.isArray(data)) setForYou(data as unknown as Prod[]); });
  }, [user?.id]);

  const runSearch = useCallback((text?: string) => { const q = (text ?? query).trim(); navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop'); }, [query, navigate]);
  const runAi = useCallback(() => { const q = query.trim(); navigate(q ? `/ai-solver?q=${encodeURIComponent(q)}` : '/ai-solver'); }, [query, navigate]);

  const voiceSearch = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { toast.info('Voice search isn’t supported in this browser.'); return; }
    const r = new SR(); r.lang = 'en-US'; r.interimResults = false;
    toast.info('Listening… speak now');
    r.onresult = (e: any) => { const t = e.results[0][0].transcript; setQuery(t); runSearch(t); };
    r.onerror = () => toast.error('Could not hear you — try again.');
    r.start();
  };

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const onImage = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { toast.error('Image must be under 6 MB.'); return; }
    setImgBusy(true);
    const toastId = toast.loading('Scanning your image…');
    try {
      const dataUrl: string = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); });
      const res = await fetch('/api/image-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageDataUrl: dataUrl }) });
      const data = await res.json();
      toast.dismiss(toastId);
      if (!res.ok) throw new Error(data.error ?? 'Image search failed');
      toast.success(`Found: ${data.label || 'a match'}`);
      navigate(`/shop?q=${encodeURIComponent(data.query)}`);
    } catch (err: any) { toast.dismiss(toastId); toast.error(err.message); }
    setImgBusy(false);
  };

  return (
    <div className={`min-h-screen ${T.page}`}>
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

      <Seo title="The World's AI Marketplace" description="Discover anything, buy from anywhere. Search millions of products across thousands of trusted stores, compare prices instantly, and shop with AI." />
      <MarketHeader />

      {/* ── HERO (light AI shopping engine) ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Global network globe background */}
        <img src="/Smartkonghero.png" alt="" aria-hidden className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-right" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent md:via-white/20" aria-hidden />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-12 md:pt-16 pb-4 grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: copy + search */}
          <div>
            <div className="sk-rise inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-sm font-semibold text-blue-700 mb-6">
              <Sparkles className="w-4 h-4" /> The World’s AI Shopping Engine
            </div>
            <h1 className="sk-rise text-5xl md:text-7xl font-black tracking-tight leading-[1.02] mb-5" style={{ animationDelay: '.05s' }}>
              <span className="text-gray-900">Search once.</span><br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600">Buy smarter.</span>
            </h1>
            <p className="sk-rise text-lg text-gray-500 max-w-lg mb-8 leading-relaxed" style={{ animationDelay: '.1s' }}>
              Compare millions of products across 18,500+ stores worldwide. AI finds the best price, quality and deals for you.
            </p>

            {/* Search card */}
            <div className="sk-rise max-w-xl bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(30,58,138,0.35)] ring-1 ring-black/[0.04] p-2.5" style={{ animationDelay: '.15s' }}>
              <div className="flex items-center gap-2 px-3">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="What are you looking for?" className="flex-1 bg-transparent py-3 text-gray-900 placeholder-gray-400 focus:outline-none text-base" />
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onImage(e.target.files?.[0])} />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <button onClick={runAi} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors"><Sparkles className="w-4 h-4" /> AI Search</button>
                <button onClick={voiceSearch} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors"><Mic className="w-4 h-4" /> Voice Search</button>
                <button onClick={() => fileRef.current?.click()} disabled={imgBusy} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors disabled:opacity-50"><Camera className="w-4 h-4" /> {imgBusy ? 'Scanning…' : 'Image Search'}</button>
                <button onClick={() => navigate('/compare')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors"><GitCompare className="w-4 h-4" /> Compare</button>
              </div>
            </div>

            {/* CTAs */}
            <div className="sk-rise flex flex-wrap items-center gap-3 mt-6" style={{ animationDelay: '.2s' }}>
              <button onClick={() => navigate('/shop')} className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 transition-colors">
                Start Shopping <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' })} className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                <Play className="w-4 h-4 text-blue-600" /> How it works
              </button>
            </div>
          </div>

          {/* Right: floating product cards over the globe */}
          <div className="relative h-[440px] md:h-[520px] hidden md:block">
            {HERO_CARDS.map(c => <HeroCard key={c.title} c={c} />)}
          </div>
        </div>

        {/* Stats card */}
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pb-16 md:pb-20">
          <div className="rounded-2xl bg-white shadow-[0_20px_50px_-24px_rgba(30,58,138,0.35)] ring-1 ring-black/[0.04] grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-100">
            {HERO_STATS.map(s => (
              <div key={s.label} className="flex items-center justify-center gap-3 px-4 py-6">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><s.Icon className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-xl md:text-2xl font-black text-gray-900 leading-none"><CountUp value={s.value} suffix={s.suffix} /></p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY (brand strip) ─────────────────────────────────────── */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <p className="text-center text-sm text-gray-400 mb-7">Trusted by millions. Powered by thousands of stores.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {BRANDS.map(b => (
              <span key={b} className="text-lg md:text-xl font-extrabold text-gray-400 hover:text-gray-700 transition-colors tracking-tight">{b}</span>
            ))}
            <Link to="/shop" className="text-gray-300 hover:text-blue-600 transition-colors"><ArrowRight className="w-5 h-5" /></Link>
          </div>
        </div>
      </section>

      {/* ── FEATURE STRIP (6 value props) ────────────────────────────────── */}
      <section className={`${T.sectionA} py-14`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.tint} flex items-center justify-center shrink-0 shadow-md`}><f.Icon className="w-5 h-5 text-white" /></div>
                <div>
                  <h3 className={`text-base font-bold ${T.cardTitle}`}>{f.title}</h3>
                  <p className={`text-sm mt-0.5 leading-relaxed ${T.cardMeta}`}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI-FOUND DEALS (savings band) ────────────────────────────────── */}
      {deals.length >= 4 && <DealBand deals={deals} />}

      {/* ── FOR YOU (personalized) ───────────────────────────────────────── */}
      {forYou.length >= 4 && (
        <section className={`${T.sectionA} py-20 md:py-28`}>
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex items-end justify-between">
              <SectionHead eyebrow="Picked for you" title={firstName ? `For you, ${firstName}` : 'For you'} tokens={T} />
              <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-500">View all <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
              {forYou.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING (featured deal breaks the grid) ─────────────────────── */}
      {trending.length > 0 && (
        <section className={`${T.sectionB} py-20 md:py-28`}>
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <SectionHead eyebrow="Right now" title="Trending this week" tokens={T} sub="The products SmartKong shoppers are buying and comparing most." />
              <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-500">View all <ArrowRight className="w-4 h-4" /></Link>
            </div>
            {trending[0] && <FeaturedDeal p={trending[0]} tokens={T} />}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {trending.slice(1).map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className={`${T.sectionA} py-20 md:py-28`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <SectionHead eyebrow="Browse" title="Shop every category" tokens={T} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
            {CATEGORY_TILES.map(c => (
              <Link key={c.label} to={c.to} className={`group relative rounded-2xl p-6 overflow-hidden transition-all hover:-translate-y-1 ${T.tile}`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at 30% 0%, ${c.from}18, transparent 60%)` }} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to2})` }}><c.Icon className="w-6 h-6 text-white" /></div>
                  <p className={`font-semibold ${T.cardTitle}`}>{c.label}</p>
                  <p className={`text-xs mt-0.5 flex items-center gap-1 group-hover:text-blue-600 transition-colors ${T.cardMeta}`}>Explore <ArrowRight className="w-3 h-3" /></p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI SHOWCASE (dark band) ──────────────────────────────────────── */}
      <section className="bg-[#070810] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden grid lg:grid-cols-2">
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 text-blue-400 text-sm font-semibold mb-4"><MessageSquare className="w-4 h-4" /> AI Shopping Assistant</span>
              <h3 className="text-3xl md:text-4xl font-black leading-tight mb-4 text-white">Describe what you need.<br />We find the best match.</h3>
              <p className="text-white/50 mb-6">Skip the endless tabs. Tell SmartKong your problem, budget and use-case — our AI reads across the whole catalog and returns ranked picks with reasons.</p>
              <button onClick={() => navigate('/ai-solver')} className="w-fit flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"><Sparkles className="w-4 h-4" /> Try the AI Solver</button>
            </div>
            <div className="bg-[#0A0C12] p-6 md:p-8 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-center gap-4">
              <div className="self-end max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm text-white">I need a laptop under $1,200 for machine learning.</div>
              <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-white/80">
                <span className="flex items-center gap-1.5 text-blue-300 font-semibold mb-1.5"><Sparkles className="w-3.5 h-3.5" /> SmartKong AI</span>
                <span className="sk-cursor">Great pick for ML on a budget. Top 3: a 32GB RAM ultrabook with a discrete GPU, a refurbished workstation with CUDA support, and a cloud-GPU bundle. Comparing prices across 6 vendors now</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GLOBAL VENDORS ───────────────────────────────────────────────── */}
      <section className={`${T.sectionA} py-20 md:py-28 border-y ${theme === 'light' ? 'border-gray-100' : 'border-white/[0.06]'}`}>
        <p className={`text-center text-sm mb-8 ${T.body}`}>Aggregating the world’s best stores &amp; networks</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="sk-marquee flex gap-4 w-max">
            {[...VENDORS, ...VENDORS].map((v, i) => (
              <span key={i} className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap ${T.chip}`}>{v}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUSTOMER STORIES (social proof) ──────────────────────────────── */}
      <section className={`${T.sectionB} py-20 md:py-28`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <SectionHead center eyebrow="Loved by shoppers" title="People love buying here" tokens={T} sub="Over 1.8 million shoppers use SmartKong before they buy." />
          <Testimonials tokens={T} />
        </div>
      </section>

      {/* ── TRUST ────────────────────────────────────────────────────────── */}
      <section className={`${T.sectionA} py-20 md:py-28`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <SectionHead center eyebrow="Peace of mind" title="Built for trust" tokens={T} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-10">
            {TRUST.map(t => (
              <div key={t.label} className={`rounded-2xl p-5 text-center transition-colors hover:border-emerald-400/40 ${T.card}`}>
                <t.Icon className="w-7 h-7 text-emerald-500 mx-auto mb-3" />
                <p className={`text-xs font-medium ${T.body}`}>{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className={`${T.sectionB} pb-24 pt-4`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-center" style={{ background: 'linear-gradient(120deg,#1D4ED8,#0EA5E9 55%,#7C3AED)' }}>
            <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 80% 20%, #fff4, transparent 40%)' }} aria-hidden />
            <div className="relative">
              <h3 className="text-3xl md:text-5xl font-black mb-4 text-white">{firstName ? `Ready when you are, ${firstName}.` : 'Sell to the world with SmartKong.'}</h3>
              <p className="text-white/80 max-w-xl mx-auto mb-8">List your products once and reach millions of AI-guided shoppers across 230 countries.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/vendor/register" className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-gray-900 font-bold hover:bg-white/90 transition-colors"><Store className="w-4 h-4" /> Become a Vendor</Link>
                <Link to="/shop" className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/15 border border-white/25 backdrop-blur-md text-white font-bold hover:bg-white/25 transition-colors"><Globe className="w-4 h-4" /> Start Shopping</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketFooter />
    </div>
  );
}
