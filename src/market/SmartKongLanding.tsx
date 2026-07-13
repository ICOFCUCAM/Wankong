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
  Package, Users, Scale, Tag, Play, ArrowUpRight, Loader2, ShoppingCart, Lock,
} from 'lucide-react';
import { ProductArt, VendorMark, type ArtKind } from './HeroProductArt';
import { BrandLogo, BRAND_LIST } from './BrandLogos';
import { COLLECTIONS } from './collectionsData';
import { Reveal, Magnetic, Tilt, ArcSeam } from './motion';
import { toast } from 'sonner';

// Rotating natural-language search prompts (typewriter in the hero search box).
const TYPED_SUGGESTIONS = [
  'the best gaming laptop under €1500',
  'the cheapest iPhone 15 Pro',
  'a quiet washing machine',
  'an RTX 5090 in stock',
  'an ergonomic office chair',
  'noise-cancelling headphones',
];

function useTypewriter(words: string[]) {
  const [text, setText] = useState('');
  const wi = useRef(0), ci = useRef(0), deleting = useRef(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = words[wi.current % words.length];
      if (!deleting.current) {
        ci.current++;
        setText(word.slice(0, ci.current));
        if (ci.current >= word.length) { deleting.current = true; t = setTimeout(tick, 1800); return; }
        t = setTimeout(tick, 52);
      } else {
        ci.current--;
        setText(word.slice(0, Math.max(0, ci.current)));
        if (ci.current <= 0) { deleting.current = false; wi.current++; t = setTimeout(tick, 320); return; }
        t = setTimeout(tick, 26);
      }
    };
    t = setTimeout(tick, 700);
    return () => clearTimeout(t);
  }, [words]);
  return text;
}

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

// Cross-store cart demo — one cart, many stores, one checkout.
const CART_DEMO = [
  { store: 'Amazon',   title: 'Sony WH-1000XM5 Headphones', price: '348' },
  { store: 'Apple',    title: 'MacBook Pro M4',             price: '1,599' },
  { store: 'Best Buy', title: 'LG UltraGear Monitor',       price: '499' },
  { store: 'Walmart',  title: 'Ergonomic Office Chair',     price: '199' },
];

// Living shelf — a gently moving wall of categories for discovery shoppers.
const SHELF = [
  { e: '🔥', l: 'Trending' }, { e: '📱', l: 'Phones' }, { e: '🎧', l: 'Headphones' }, { e: '💻', l: 'Laptops' },
  { e: '🖥️', l: 'Monitors' }, { e: '⌚', l: 'Smartwatches' }, { e: '📷', l: 'Cameras' }, { e: '🎮', l: 'Gaming' },
  { e: '👟', l: 'Sneakers' }, { e: '🚗', l: 'Auto' }, { e: '🏠', l: 'Home' }, { e: '✈️', l: 'Travel' },
];

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
  art: ArtKind; photo: string; pos: string; delay: string; size: 'lg' | 'md' | 'sm'; mark?: 'apple' | 'link'; href?: string;
}[] = [
  { title: 'Sony WH-1000XM5',    rating: 4.8, count: '8,842', price: '348',   vendor: 'Amazon',   art: 'headphones', photo: UNSPLASH('1505740420928-5e560c06d30e'), pos: 'top-[1%] left-[34%]',    delay: '0s',   size: 'md' },
  { title: 'iPhone 15 Pro',      rating: 4.9, count: '6,421', price: '999',   vendor: 'Apple',    art: 'phone',      photo: UNSPLASH('1592750475338-74b7b21085ab'), pos: 'top-[14%] right-[-4%]',  delay: '.6s',  size: 'sm' },
  { title: 'MacBook Pro M4',     rating: 4.9, count: '2,843', price: '1,599', vendor: 'Best Buy', art: 'laptop',     photo: UNSPLASH('1517336714731-489689fd1ca8'), pos: 'top-[29%] left-[-8%]',   delay: '.3s',  size: 'lg', mark: 'apple' },
  { title: 'DJI Air 3S Drone',   rating: 4.7, count: '1,235', price: '1,099', vendor: 'Amazon',   art: 'drone',      photo: UNSPLASH('1473968512647-3e447244af8f'), pos: 'top-[45%] right-[-5%]',  delay: '1s',   size: 'sm' },
  { title: 'Samsung 65" OLED TV',rating: 4.8, count: '952',   price: '1,299', vendor: 'Walmart',  art: 'tv',         photo: UNSPLASH('1593784991095-a205069470b6'), pos: 'top-[70%] right-[3%]',   delay: '1.3s', size: 'md', mark: 'link' },
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

// Meridian section head — arc eyebrow, display title, optional serif accent on
// the last word so every section reads on-brand.
function SectionHead({ eyebrow, title, tokens, center, sub }: { eyebrow: string; title: string; tokens: ReturnType<typeof themeTokens>; center?: boolean; sub?: string }) {
  const words = title.split(' ');
  const accent = words.length > 1 ? words.pop() : null;
  return (
    <div className={center ? 'text-center' : ''}>
      <span className={`sk-eyebrow ${center ? 'justify-center' : ''}`}>{eyebrow}</span>
      <h2 className={`text-4xl md:text-5xl font-black tracking-tight mt-3 ${tokens.heading}`}>
        {words.join(' ')}{accent && <> <span className="sk-serif sk-aurora-text">{accent}</span></>}
      </h2>
      {sub && <p className={`mt-4 text-base md:text-lg ${tokens.body} ${center ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}>{sub}</p>}
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
            <span className="sk-eyebrow !text-emerald-400 mb-2">AI-Found Deals</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Biggest markdowns <span className="sk-serif sk-aurora-text">right now</span></h2>
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
    <div className="grid md:grid-cols-3 gap-6 mt-12">
      {STORIES.map((s, i) => (
        <Reveal key={s.name} delay={i * 100} className={`relative rounded-3xl p-8 pt-12 ${tokens.card}`}>
          <span className="absolute -top-1 left-6 sk-serif sk-aurora-text text-[5.5rem] leading-none select-none" aria-hidden>“</span>
          <p className={`sk-serif text-xl leading-relaxed mb-8 ${tokens.cardTitle}`}>{s.quote}</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--sk-aurora)' }}>{s.initials}</div>
            <div>
              <p className={`text-sm font-bold ${tokens.cardTitle}`}>{s.name}</p>
              <p className={`text-xs ${tokens.cardMeta}`}>{s.role}</p>
            </div>
            <span className="ml-auto flex items-center gap-0.5 text-amber-400">{[1, 2, 3, 4, 5].map(n => <Star key={n} className="w-3.5 h-3.5 fill-amber-400" />)}</span>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

// ── Floating hero product card (image left, details right — like the mock) ─────
function HeroCard({ c }: { c: (typeof HERO_CARDS)[number] }) {
  const navigate = useNavigate();
  const [photoOk, setPhotoOk] = useState(true);
  const W = c.size === 'lg' ? 'w-72' : c.size === 'md' ? 'w-60' : 'w-52';
  const IMG = c.size === 'lg' ? 'w-24 h-[4.75rem]' : c.size === 'md' ? 'w-[4.5rem] h-[4.5rem]' : 'w-16 h-16';
  const TITLE = c.size === 'lg' ? 'text-sm' : 'text-[13px]';
  const PRICE = c.size === 'lg' ? 'text-base' : 'text-[15px]';
  return (
    <div className={`sk-float absolute z-10 ${c.pos}`} style={{ animationDelay: c.delay }}>
      <Tilt max={9}>
      <button
        onClick={() => navigate(c.href ?? `/shop?q=${encodeURIComponent(c.title)}`)}
        title={`Shop ${c.title}`}
        className={`group block text-left rounded-2xl bg-white shadow-[0_22px_55px_-18px_rgba(30,58,138,0.4)] ring-1 ring-black/[0.04] p-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_34px_70px_-18px_rgba(30,58,138,0.6)] hover:ring-blue-300 active:scale-[0.97] ${W}`}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-xl overflow-hidden shrink-0 bg-gray-100 ${IMG}`}>
            {photoOk
              ? <img src={c.photo} alt={c.title} loading="eager" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setPhotoOk(false)} />
              : <ProductArt kind={c.art} />}
          </div>
          <div className="min-w-0 py-0.5 flex-1">
            <p className={`flex items-center gap-1 font-bold text-gray-900 truncate ${TITLE}`}>
              <span className="truncate">{c.title}</span>
              {c.mark === 'apple' && <VendorMark vendor="Apple" />}
              {c.mark === 'link' && <ArrowUpRight className="w-3 h-3 text-blue-500 shrink-0" />}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4].map(n => <Star key={n} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
              <span className="relative w-3 h-3">
                <Star className="absolute inset-0 w-3 h-3 text-amber-400" />
                <Star className="absolute inset-0 w-3 h-3 fill-amber-400 text-amber-400 [clip-path:inset(0_50%_0_0)]" />
              </span>
              <span className="text-[11px] text-gray-400 ml-0.5">({c.count})</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className={`font-extrabold text-blue-600 ${PRICE}`}><span className="font-semibold">From</span> ${c.price}</p>
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white shadow-sm opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            {c.size === 'lg' && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Best price today
              </span>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <VendorMark vendor={c.vendor} />
              <span className="text-[11px] font-medium text-gray-400">{c.vendor}</span>
            </div>
          </div>
        </div>
      </button>
      </Tilt>
    </div>
  );
}

// ── Animated network background (nodes + connections pulsing over the globe) ────
function NetworkNodes() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, w = 0, h = 0, ti = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = window.innerWidth < 768 ? 16 : 30;
    const pts: { x: number; y: number; vx: number; vy: number; ph: number }[] = [];
    const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    for (let i = 0; i < N; i++) pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, ph: Math.random() * Math.PI * 2 });
    const draw = () => {
      ti += 0.02;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.hypot(dx, dy);
        if (d < 120) { ctx.strokeStyle = `rgba(59,130,246,${0.18 * (1 - d / 120)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
      }
      for (const p of pts) {
        const g = 1.5 + Math.sin(ti + p.ph) * 0.8;
        ctx.fillStyle = 'rgba(37,99,235,0.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, g, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(37,99,235,0.1)'; ctx.beginPath(); ctx.arc(p.x, p.y, g * 3.2, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />;
}

// ── Orbit layer: products circling the globe like satellites (ambient depth) ────
const ORBIT_1 = ['🎧', '💻', '📱', '📷', '🎮', '⌚'];
const ORBIT_2 = ['👟', '🖥️', '🔋', '🎒', '🕹️'];

function OrbitLayer() {
  return (
    <div className="sk-orbit hidden md:block absolute left-[56%] top-[46%] -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] pointer-events-none" aria-hidden>
      <div className="absolute inset-[8%] rounded-full border border-blue-300/25" />
      <div className="absolute inset-[26%] rounded-full border border-blue-300/20" />
      {/* Outer ring (clockwise) */}
      <div className="absolute inset-0" style={{ animation: 'sk-spin 64s linear infinite' }}>
        {ORBIT_1.map((e, i) => {
          const a = (360 / ORBIT_1.length) * i;
          return (
            <div key={i} className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transform: `rotate(${a}deg) translateY(-248px)` }}>
              <div style={{ animation: 'sk-spin-rev 64s linear infinite' }} className="-translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white/85 backdrop-blur-sm shadow-lg ring-1 ring-black/5 flex items-center justify-center text-xl">{e}</div>
            </div>
          );
        })}
      </div>
      {/* Inner ring (counter-clockwise) */}
      <div className="absolute inset-0" style={{ animation: 'sk-spin-rev 88s linear infinite' }}>
        {ORBIT_2.map((e, i) => {
          const a = (360 / ORBIT_2.length) * i + 30;
          return (
            <div key={i} className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transform: `rotate(${a}deg) translateY(-176px)` }}>
              <div style={{ animation: 'sk-spin 88s linear infinite' }} className="-translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 flex items-center justify-center text-lg">{e}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live AI comparison panel (searches stores, recommends the best) ─────────────
const AI_SEQ = [1500, 850, 850, 850, 2800]; // ms per step: search, reveal×3, recommend

function AiSearchPanel({ product }: { product?: { title: string; priceUsd: number } }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    let i = 0; let t: ReturnType<typeof setTimeout>;
    const run = () => { setStep(i); t = setTimeout(() => { i = (i + 1) % AI_SEQ.length; run(); }, AI_SEQ[i]); };
    run();
    return () => clearTimeout(t);
  }, []);
  const base = product && product.priceUsd > 0 ? product.priceUsd : 1299;
  const savings = Math.max(9, Math.round(base * 0.012));
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const stores = [
    { name: 'Amazon',   price: fmt(base) },
    { name: 'Best Buy', price: fmt(base - savings), best: true },
    { name: 'Walmart',  price: fmt(base + Math.round(base * 0.015)) },
  ];
  const revealed = step === 0 ? 0 : step === AI_SEQ.length - 1 ? stores.length : step;
  const short = product ? (product.title.length > 24 ? product.title.slice(0, 24) + '…' : product.title) : null;
  return (
    <div className="sk-float absolute z-20 bottom-[2%] left-[-3%] w-64" style={{ animationDelay: '.9s' }}>
      <div className="rounded-2xl bg-white/95 backdrop-blur-md shadow-[0_28px_65px_-18px_rgba(30,58,138,0.55)] ring-1 ring-blue-100 p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 leading-none">SmartKong AI</p>
            {short && <p className="text-[10px] text-gray-400 truncate mt-0.5">Best price · {short}</p>}
          </div>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> live
          </span>
        </div>
        {step === 0 ? (
          <div className="flex items-center gap-2 py-3 text-[13px] text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Searching 18,500 stores…
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {stores.slice(0, revealed).map(s => (
                <div key={s.name} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all ${s.best ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
                  <span className="flex items-center gap-1.5 font-medium text-gray-700"><VendorMark vendor={s.name} />{s.name}</span>
                  <span className={`font-bold ${s.best ? 'text-emerald-600' : 'text-gray-900'}`}>{s.price}</span>
                </div>
              ))}
            </div>
            {step === AI_SEQ.length - 1 && (
              <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-blue-600 text-white px-2.5 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="text-[11px] leading-snug">I recommend <b>Best Buy</b> — you save <b>{fmt(savings)}</b></span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Intent-first prompts, ambient stories, world-search animation ───────────────
const INTENTS: { label: string; q?: string; to?: string }[] = [
  { label: 'Buy something', q: '' },
  { label: 'Compare products', to: '/compare' },
  { label: 'Find suppliers', q: 'wholesale suppliers' },
  { label: 'Import from China', q: 'import from China' },
  { label: 'Start a business', q: 'business starter kit' },
  { label: 'Hire freelancers', q: 'freelance services' },
  { label: 'Sell something', to: '/vendor/register' },
];

const LIVE_STORIES: React.ReactNode[] = [
  <>Today, AI discovered <b className="text-blue-700">17,328</b> new deals across the web.</>,
  <>Someone in Norway just saved <b className="text-blue-700">€463</b> on a MacBook Pro.</>,
  <>Samsung TVs are <b className="text-blue-700">17%</b> cheaper today than yesterday.</>,
  <>Best country to buy an iPhone today: <b className="text-blue-700">Japan</b>.</>,
  <>AI is comparing prices across <b className="text-blue-700">18,500</b> stores right now.</>,
];

const SEARCH_VENDORS = ['Amazon', 'Apple', 'Alibaba', 'Newegg', 'Best Buy', 'AliExpress', 'Walmart', 'eBay', 'Samsung', '+ thousands more'];

// Store offers streaming toward the center — the "one checkout across every
// store" story. Positioned as % of the globe box; lowest price wins.
const STORE_OFFERS = [
  { name: 'Amazon',   price: 1399, x: 30, y: 40 },
  { name: 'Apple',    price: 1499, x: 52, y: 26 },
  { name: 'Best Buy', price: 1349, x: 71, y: 34 },
  { name: 'Newegg',   price: 1329, x: 79, y: 57 },
  { name: 'Walmart',  price: 1419, x: 35, y: 64 },
  { name: 'eBay',     price: 1379, x: 58, y: 63 },
];
const HUB = { x: 55, y: 47 };
const worldArc = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  `M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - 16} ${b.x},${b.y}`;

function useRotating(count: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % count), ms); return () => clearInterval(t); }, [count, ms]);
  return i;
}

// The signature interaction — the whole business in six seconds: stores across
// the world surface prices, they stream to the center, and SmartKong resolves
// them into a single lowest-price checkout.
function WorldSearchOverlay({ query }: { query: string }) {
  const vi = useRotating(SEARCH_VENDORS.length, 240);
  const [stage, setStage] = useState(0);
  useEffect(() => { const t = setTimeout(() => setStage(1), 1500); return () => clearTimeout(t); }, []);
  const lowest = Math.min(...STORE_OFFERS.map(s => s.price));
  const fmt = (n: number) => '$' + n.toLocaleString('en-US');
  return (
    <div className="pointer-events-none absolute right-0 top-0 h-full w-[88%] sm:w-[80%] lg:w-[74%] z-30 overflow-hidden">
      <div className="absolute inset-0" style={{ animation: 'sk-veil .5s ease both', background: 'radial-gradient(circle at 55% 47%, rgba(37,99,235,0.16), transparent 62%)' }} />
      {/* prices streaming to the center */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wroute" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2563EB" stopOpacity="0.15" /><stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        {STORE_OFFERS.map((s, i) => (
          <path key={s.name} d={worldArc({ x: s.x, y: s.y }, HUB)} className="sk-route" style={{ animationDelay: `${i * 0.1}s` }} stroke="url(#wroute)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {/* store offer chips */}
      {STORE_OFFERS.map((s, i) => {
        const best = s.price === lowest;
        return (
          <div key={s.name} className={`sk-pin absolute flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white shadow-md text-[11px] ${best ? 'ring-2 ring-emerald-400' : 'ring-1 ring-black/5'}`} style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${0.2 + i * 0.12}s` }}>
            <VendorMark vendor={s.name} />
            <span className="font-semibold text-gray-700">{s.name}</span>
            <span className={`font-bold ${best ? 'text-emerald-600' : 'text-gray-900'}`}>{fmt(s.price)}</span>
          </div>
        );
      })}
      {/* center: SmartKong resolves to one checkout */}
      <div className="absolute" style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}>
        <div className="-translate-x-1/2 -translate-y-1/2">
          {stage === 0 ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white shadow-2xl ring-1 ring-blue-100">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
              <span className="text-xs font-bold text-gray-900">SmartKong is comparing…</span>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="sk-rise flex flex-col items-center gap-1.5">
              <div className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 text-white shadow-2xl shadow-blue-600/40">
                <span className="absolute -inset-1 rounded-2xl bg-blue-500/40 blur animate-pulse" />
                <ShoppingCart className="relative w-4 h-4" />
                <span className="relative text-sm font-bold">One Checkout · {fmt(lowest)}</span>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 bg-white px-2 py-0.5 rounded-full shadow">✓ Lowest price · Newegg</span>
            </div>
          )}
        </div>
      </div>
      {/* bottom ticker */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 shadow-lg ring-1 ring-blue-100">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-gray-700">Searching <span className="font-semibold text-blue-700">{SEARCH_VENDORS[vi]}</span>…</span>
        </div>
        <span className="text-xs text-gray-600 bg-white/85 px-3 py-1 rounded-full shadow-sm">Comparing every store for “{query}” — one checkout</span>
      </div>
    </div>
  );
}

// ── Interactive globe: hover a continent, region-specific commerce surfaces ─────
const REGIONS = [
  { key: 'na', label: 'North America', x: 15, y: 49, theme: 'Best deals today',    Icon: Tag,        tint: '#2563EB', q: 'best deals usa',      items: ['MacBook Pro M4 · $1,599', 'RTX 5090 rig · $1,999', 'iPhone 15 Pro · $999'] },
  { key: 'eu', label: 'Europe',        x: 46, y: 24, theme: 'Trusted brands',       Icon: ShieldCheck, tint: '#7C3AED', q: 'europe trusted brands', items: ['Bosch appliances', 'Philips electronics', 'Adidas Originals'] },
  { key: 'af', label: 'Africa',        x: 50, y: 60, theme: 'Emerging suppliers',   Icon: Store,       tint: '#F59E0B', q: 'africa suppliers',     items: ['Wholesale textiles', 'Solar equipment', 'Agri machinery'] },
  { key: 'cn', label: 'China',         x: 67, y: 33, theme: 'Factories & wholesale', Icon: Package,    tint: '#EF4444', q: 'import from china',    items: ['Direct-from-factory', 'Bulk electronics', 'Custom manufacturing'] },
  { key: 'jp', label: 'Japan',         x: 82, y: 53, theme: 'Electronics',          Icon: Laptop,      tint: '#06B6D4', q: 'japan electronics',    items: ['Sony cameras', 'Nintendo consoles', 'Casio watches'] },
];

function RegionGlobe({ onHover, onPick }: { onHover: (a: boolean) => void; onPick: (q: string) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const show = (k: string) => { setActive(k); onHover(true); };
  const hide = () => { setActive(null); onHover(false); };
  return (
    <div className="hidden md:block pointer-events-none absolute right-0 top-0 h-full w-[80%] lg:w-[74%] z-30">
      <div className={`absolute left-1/2 -translate-x-1/2 top-3 transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`}>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur shadow-sm ring-1 ring-black/5 text-xs font-medium text-gray-600">
          <Globe className="w-3.5 h-3.5 text-blue-600" /> Hover the globe to explore regions
        </span>
      </div>
      {REGIONS.map(r => {
        const on = active === r.key;
        const flip = r.x >= 55;
        return (
          <div key={r.key} className="absolute pointer-events-auto" style={{ left: `${r.x}%`, top: `${r.y}%` }} onMouseEnter={() => show(r.key)} onMouseLeave={hide}>
            <button
              onFocus={() => show(r.key)} onBlur={hide} onClick={() => onPick(r.q)} title={r.label}
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center outline-none"
            >
              <span className="absolute w-6 h-6 rounded-full opacity-40" style={{ background: r.tint, animation: 'sk-ping 1.8s ease-out infinite' }} />
              <span className="relative w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-md transition-transform hover:scale-125" style={{ background: r.tint }} />
            </button>
            {on && (
              <div className={`absolute ${flip ? 'right-3' : 'left-3'} top-3 w-56 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-3.5 sk-rise`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${r.tint}1a` }}><r.Icon className="w-4 h-4" style={{ color: r.tint }} /></div>
                  <div><p className="text-sm font-bold text-gray-900 leading-tight">{r.label}</p><p className="text-[11px] text-gray-400">{r.theme}</p></div>
                </div>
                <ul className="space-y-1 mb-3">
                  {r.items.map(it => <li key={it} className="flex items-center gap-1.5 text-[11px] text-gray-600"><span className="w-1 h-1 rounded-full" style={{ background: r.tint }} />{it}</li>)}
                </ul>
                <button onClick={() => onPick(r.q)} className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90" style={{ background: r.tint }}>
                  Explore {r.label} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Discovery row (Netflix-style horizontal scroller of products) ───────────────
function DiscoveryRow({ eyebrow, title, products, tokens }: { eyebrow: string; title: string; products: Prod[]; tokens: ReturnType<typeof themeTokens> }) {
  if (products.length < 4) return null;
  return (
    <div className="mb-14 last:mb-0">
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="sk-eyebrow !text-[10px]">{eyebrow}</span>
          <h3 className={`text-2xl md:text-3xl font-black tracking-tight mt-1.5 ${tokens.heading}`}>
            {title.split(' ').slice(0, -1).join(' ')} <span className="sk-serif sk-aurora-text">{title.split(' ').slice(-1)}</span>
          </h3>
        </div>
        <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-500 shrink-0">View all <ArrowRight className="w-4 h-4" /></Link>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0 snap-x">
        {products.map(p => <div key={p.id} className="snap-start shrink-0 w-56 md:w-64"><ProductCard p={p} /></div>)}
      </div>
    </div>
  );
}

// ── Live Commerce Pulse — a Bloomberg-style band proving the layer is alive ─────
const PULSE_EVENTS = [
  '🇳🇴 Norway · MacBook Pro dropped €463', '🇯🇵 Japan · best country for iPhones today',
  '🇺🇸 USA · RTX 5090 back in stock at Newegg', '🇩🇪 Germany · Bosch tools −22%',
  '🇧🇷 Brazil · sneaker demand up 3.1×', '🇳🇬 Nigeria · solar kits trending',
  '🇬🇧 UK · OLED TVs at 90-day low', '🇰🇷 Korea · new Samsung drop indexed',
  '🇫🇷 France · 1,204 deals found this hour', '🇮🇳 India · earbuds price war detected',
];
const PULSE_COUNTRIES = [
  { flag: '🇺🇸', name: 'USA',     v: 92 }, { flag: '🇩🇪', name: 'Germany', v: 64 },
  { flag: '🇯🇵', name: 'Japan',   v: 78 }, { flag: '🇬🇧', name: 'UK',      v: 58 },
  { flag: '🇳🇴', name: 'Norway',  v: 41 }, { flag: '🇧🇷', name: 'Brazil',  v: 49 },
];

function CommercePulse() {
  return (
    <section className="sk-grain relative overflow-hidden" style={{ background: 'var(--sk-ink)' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[-40%] left-[15%] w-[40rem] h-[40rem] rounded-full opacity-25 blur-[130px]" style={{ background: 'radial-gradient(circle,#2563EB,transparent 60%)' }} />
        <div className="absolute bottom-[-45%] right-[8%] w-[36rem] h-[36rem] rounded-full opacity-20 blur-[130px]" style={{ background: 'radial-gradient(circle,#7C3AED,transparent 60%)' }} />
      </div>

      {/* Ticker rail */}
      <div className="relative border-b border-white/[0.07] py-3 overflow-hidden">
        <div className="sk-ticker flex items-center gap-10 w-max whitespace-nowrap">
          {[0, 1].map(i => (
            <span key={i} className="flex items-center gap-10">
              {PULSE_EVENTS.map(e => (
                <span key={e} className="flex items-center gap-2 text-[13px] text-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />{e}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-20 md:py-24 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          <span className="sk-eyebrow !text-cyan-300">Live right now</span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mt-3 leading-[1.02]">
            The pulse of<br /><span className="sk-serif sk-aurora-text">world commerce.</span>
          </h2>
          <p className="text-white/50 mt-5 max-w-md leading-relaxed">
            SmartKong never sleeps. Prices shift, stock moves, deals surface — and the layer sees all of it, everywhere, in real time.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { v: 17328, s: '', l: 'deals found today' },
              { v: 18500, s: '+', l: 'stores watched' },
              { v: 12, s: '%', l: 'avg. saving' },
            ].map(k => (
              <div key={k.l}>
                <p className="text-3xl md:text-4xl font-black text-white"><CountUp value={k.v} suffix={k.s} /></p>
                <p className="text-[11px] text-white/40 mt-1 uppercase tracking-wider">{k.l}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-sm p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-bold text-white">Global shopping activity</p>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> updating live
              </span>
            </div>
            <div className="space-y-4">
              {PULSE_COUNTRIES.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-6 text-base shrink-0" aria-hidden>{c.flag}</span>
                  <span className="w-20 text-xs text-white/60 shrink-0">{c.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="sk-bar h-full rounded-full" style={{ width: `${c.v}%`, background: 'var(--sk-aurora)', animationDelay: `${i * 0.12}s` }} />
                  </div>
                  <span className="w-9 text-right text-xs font-bold text-white/80">{c.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function SmartKongLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useMarketTheme();
  const T = themeTokens(theme);

  const [query, setQuery] = useState('');
  const typed = useTypewriter(TYPED_SUGGESTIONS);
  const [worldQuery, setWorldQuery] = useState<string | null>(null);
  const [regionHovering, setRegionHovering] = useState(false);
  const storyIdx = useRotating(LIVE_STORIES.length, 3800);
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
  const [trending, setTrending] = useState<Prod[]>([]);
  const [deals, setDeals] = useState<Prod[]>([]);
  const [forYou, setForYou] = useState<Prod[]>([]);
  const [pool, setPool] = useState<Prod[]>([]);
  const firstName = (user?.user_metadata?.display_name || user?.email?.split('@')[0] || '').split(' ')[0];

  useEffect(() => {
    supabase.from('ecom_products')
      .select('id, title, handle, price, compare_at_price, cover_url, vendor, product_type, is_affiliate, rating_avg, rating_count')
      .eq('status', 'active').order('trending_score', { ascending: false }).order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => { if (Array.isArray(data)) setTrending(data as unknown as Prod[]); });
  }, []);

  // Discovery pool — a broad set of active products powering the Netflix-style rows.
  useEffect(() => {
    supabase.from('ecom_products')
      .select('id, title, handle, price, compare_at_price, cover_url, vendor, product_type, is_affiliate, rating_avg, rating_count')
      .eq('status', 'active').order('trending_score', { ascending: false }).limit(48)
      .then(({ data }) => { if (Array.isArray(data)) setPool(data as unknown as Prod[]); });
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

  // Real catalog products fill the floating hero cards when available; the
  // curated showcase is the fallback for an empty catalog.
  const heroCards = trending.length >= 5
    ? HERO_CARDS.map((l, i) => {
        const p = trending[i];
        const usd = (p.price ?? 0) / 100;
        return {
          ...l,
          title: p.title,
          price: usd > 0 ? usd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : l.price,
          count: (p.rating_count ?? 0) > 0 ? String(p.rating_count) : l.count,
          rating: Number(p.rating_avg) || l.rating,
          vendor: p.vendor ?? l.vendor,
          photo: p.cover_url ?? l.photo,
          href: `/products/${p.handle ?? p.id}`,
        };
      })
    : HERO_CARDS;

  const runSearch = useCallback((text?: string) => { const q = (text ?? query).trim(); navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop'); }, [query, navigate]);
  // The signature interaction: play the "AI maps the world" animation, then route.
  const launchWorldSearch = useCallback((text?: string, dest = '/shop') => {
    const q = (text ?? query).trim();
    setWorldQuery(q || 'the whole internet');
    window.setTimeout(() => navigate(q ? `${dest}?q=${encodeURIComponent(q)}` : dest), 2600);
  }, [query, navigate]);
  const onIntent = (it: (typeof INTENTS)[number]) => { if (it.to) navigate(it.to); else launchWorldSearch(it.q || '', '/shop'); };

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
    <div className={`sk-market min-h-screen ${T.page}`}>
      <style>{`
        @keyframes sk-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes sk-drift { 0%,100%{transform:translate(0,0)} 33%{transform:translate(40px,-30px)} 66%{transform:translate(-30px,20px)} }
        @keyframes sk-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes sk-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes sk-rise { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sk-route { to{stroke-dashoffset:0} }
        @keyframes sk-pin { 0%{transform:translate(-50%,-50%) scale(0);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.25)} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes sk-ping { 0%{transform:scale(1);opacity:.55} 100%{transform:scale(3.2);opacity:0} }
        @keyframes sk-tag { from{opacity:0;transform:translate(-50%,-90%)} to{opacity:1;transform:translate(-50%,-118%)} }
        @keyframes sk-veil { from{opacity:0} to{opacity:1} }
        .sk-rise{animation:sk-rise .8s cubic-bezier(.2,.7,.2,1) both}
        .sk-float{animation:sk-float 7s ease-in-out infinite}
        .sk-marquee{animation:sk-marquee 38s linear infinite}
        .sk-cursor::after{content:'▍';animation:sk-blink 1s step-end infinite;color:#60A5FA}
        .sk-route{stroke-dasharray:240;stroke-dashoffset:240;animation:sk-route 1.1s ease-out forwards}
        .sk-pin{animation:sk-pin .55s cubic-bezier(.2,.8,.2,1) both}
        .sk-tag{animation:sk-tag .5s ease-out both}
        @keyframes sk-spin { to{transform:rotate(360deg)} }
        @keyframes sk-spin-rev { to{transform:rotate(-360deg)} }
        @media (prefers-reduced-motion: reduce){ .sk-orbit, .sk-orbit * { animation:none !important } }
      `}</style>

      <Seo title="Every Store. One Cart." description="SmartKong is the world's shopping layer — one search across Amazon, Apple, Best Buy, Temu, eBay, AliExpress and thousands more. Compare every price and check out once." />
      <MarketHeader />

      {/* ── HERO (light AI shopping engine) ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Global network globe — right ~3/4, fading into white on the left */}
        <div className="pointer-events-none select-none absolute right-0 top-0 h-full w-[88%] sm:w-[80%] lg:w-[74%]" aria-hidden>
          <img src="/Smartkonghero.png" alt="" className="w-full h-full object-cover object-right" />
          <NetworkNodes />
          <OrbitLayer />
          <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-white via-white/80 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-12 md:pt-16 pb-4 grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: copy + search */}
          <div>
            <div className="sk-rise mb-7">
              <span className="sk-eyebrow">The World’s Shopping Layer</span>
            </div>
            <h1 className="sk-rise text-6xl md:text-[5.5rem] font-black tracking-[-0.03em] leading-[0.98] mb-6" style={{ animationDelay: '.05s' }}>
              <span className="text-gray-900">Every store.</span><br />
              <span className="sk-serif sk-aurora-text pr-2">One cart.</span>
            </h1>
            <p className="sk-rise text-lg text-gray-600 max-w-lg mb-8 leading-relaxed" style={{ animationDelay: '.1s' }}>
              One search across Amazon, Apple, Best Buy, Temu, eBay, AliExpress and thousands more. SmartKong compares every price — you check out once.
            </p>

            {/* Search card */}
            <div className="sk-rise max-w-xl bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(30,58,138,0.35)] ring-1 ring-black/[0.04] p-2.5" style={{ animationDelay: '.15s' }}>
              <div className="flex items-center gap-2 px-3">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && launchWorldSearch()}
                  placeholder={query ? '' : `Find me ${typed}`}
                  className="flex-1 bg-transparent py-3 text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                />
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onImage(e.target.files?.[0])} />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <button onClick={() => launchWorldSearch(undefined, '/ai-solver')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors"><Sparkles className="w-4 h-4" /> AI Search</button>
                <button onClick={voiceSearch} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors"><Mic className="w-4 h-4" /> Voice Search</button>
                <button onClick={() => fileRef.current?.click()} disabled={imgBusy} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors disabled:opacity-50"><Camera className="w-4 h-4" /> {imgBusy ? 'Scanning…' : 'Image Search'}</button>
                <button onClick={() => navigate('/compare')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors"><GitCompare className="w-4 h-4" /> Compare</button>
              </div>
            </div>

            {/* Intent chips — "what are you trying to do today?" */}
            <div className="sk-rise flex flex-wrap gap-2 mt-5" style={{ animationDelay: '.2s' }}>
              {INTENTS.map(it => (
                <button
                  key={it.label}
                  onClick={() => onIntent(it)}
                  className="px-3.5 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 hover:shadow-sm active:scale-95 transition-all"
                >
                  {it.label}
                </button>
              ))}
            </div>

            {/* Ambient: live pulse + rotating story */}
            <div className="mt-6 flex flex-col gap-2.5">
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                AI is searching <span className="font-semibold text-gray-700">18,500 stores</span> in real time
              </span>
              <span key={storyIdx} className="sk-rise flex items-center gap-2 text-sm text-gray-500">
                <Globe className="w-4 h-4 text-blue-500 shrink-0" /> {LIVE_STORIES[storyIdx]}
              </span>
            </div>
          </div>

          {/* Right: floating product cards + live AI panel over the globe */}
          <div className={`relative h-[440px] md:h-[520px] hidden md:block transition-opacity duration-300 ${regionHovering ? 'opacity-10' : 'opacity-100'}`}>
            {worldQuery === null && heroCards.map(c => <HeroCard key={c.pos} c={c} />)}
            {worldQuery === null && <AiSearchPanel product={trending[0] ? { title: trending[0].title, priceUsd: (trending[0].price ?? 0) / 100 } : undefined} />}
          </div>
        </div>

        {/* Interactive globe: hover a continent to surface its commerce */}
        {worldQuery === null && <RegionGlobe onHover={setRegionHovering} onPick={q => launchWorldSearch(q)} />}

        {/* Signature interaction: AI maps the world's commerce on search */}
        {worldQuery !== null && <WorldSearchOverlay query={worldQuery} />}

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

      {/* ── BRAND MARQUEE (giant editorial statement) ────────────────────── */}
      <section className={`${T.sectionB} py-8 md:py-10 overflow-hidden select-none`} aria-hidden>
        <div className="sk-marquee flex items-baseline gap-8 w-max whitespace-nowrap [animation-duration:52s]">
          {[0, 1].map(i => (
            <span key={i} className="flex items-baseline gap-8 text-[11vw] md:text-[7vw] font-black tracking-[-0.04em] leading-none">
              <span className="text-gray-900">EVERY STORE</span>
              <span className="sk-serif sk-aurora-text text-[9vw] md:text-[5.6vw]">one cart</span>
              <span className="sk-outline-text">EVERY PRICE</span>
              <span className="sk-serif sk-aurora-text text-[9vw] md:text-[5.6vw]">one search</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── TRUSTED BY (real brand logos, slow marquee) ──────────────────── */}
      <section className="bg-white py-10 border-b border-gray-100">
        <p className="text-center text-sm text-gray-400 mb-8">Trusted by millions. Powered by thousands of stores.</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
          <div className="sk-marquee flex items-center gap-14 w-max">
            {[...BRAND_LIST, ...BRAND_LIST].map((b, i) => (
              <div key={i} className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"><BrandLogo name={b} /></div>
            ))}
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

      {/* ── LIVE COMMERCE PULSE (the layer is alive) ─────────────────────── */}
      <CommercePulse />

      {/* ── HOW IT WORKS (cinematic 01/02/03) ────────────────────────────── */}
      <section className={`${T.sectionA} py-24 md:py-32 overflow-hidden`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal>
            <span className="sk-eyebrow">How SmartKong works</span>
            <h2 className={`text-4xl md:text-6xl font-black tracking-tight mt-3 ${T.heading}`}>
              Three steps.<br /><span className="sk-serif sk-aurora-text">The whole internet.</span>
            </h2>
          </Reveal>
          <div className="mt-16 space-y-20 md:space-y-28">
            {[
              { n: '01', title: 'Ask for anything', accent: 'anything', body: 'Type it like you’d say it — “the best gaming laptop under €1,500”. No categories, no filters, no tabs.', Icon: MessageSquare },
              { n: '02', title: 'AI searches the world', accent: 'the world', body: 'SmartKong sweeps Amazon, Apple, Best Buy, Temu, eBay and thousands more at once — comparing price, trust and shipping in seconds.', Icon: Globe },
              { n: '03', title: 'Check out once', accent: 'once', body: 'The best offer wins. Buy SmartKong sellers in one cart, or land directly on the partner store’s lowest price.', Icon: ShoppingCart },
            ].map((s, i) => (
              <Reveal key={s.n} className={`grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-14 items-center ${i % 2 ? 'md:[direction:rtl]' : ''}`}>
                <div className="[direction:ltr] relative">
                  <span className="block text-[9rem] md:text-[13rem] font-black leading-[0.8] tracking-[-0.05em] sk-outline-text select-none" aria-hidden>{s.n}</span>
                  <div className="absolute bottom-2 left-1 w-16 h-8 border-2 border-blue-500/50 border-b-0 rounded-t-full" aria-hidden />
                </div>
                <div className="[direction:ltr]">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-white shadow-lg shadow-blue-500/25" style={{ background: 'var(--sk-aurora)' }}>
                    <s.Icon className="w-6 h-6" />
                  </div>
                  <h3 className={`text-3xl md:text-4xl font-black tracking-tight ${T.heading}`}>
                    {s.title.replace(s.accent, '').trim()} <span className="sk-serif sk-aurora-text">{s.accent}</span>
                  </h3>
                  <p className={`mt-4 text-lg leading-relaxed max-w-md ${T.body}`}>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ONE CHECKOUT (the shopping-layer promise, made tangible) ─────── */}
      <section className="bg-[#070810] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="sk-eyebrow !text-cyan-300">Compare · Buy · One cart</span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mt-3 leading-[1.02]">
              One cart across<br /><span className="sk-serif sk-aurora-text">every store on Earth.</span>
            </h2>
            <p className="text-white/55 mt-5 max-w-md leading-relaxed">
              SmartKong compares Amazon, Apple, Best Buy, Walmart and thousands more, then routes you to the lowest price. Check out SmartKong sellers in one cart, or buy partner deals in a single tap at the store.
            </p>
            <ul className="mt-6 space-y-3">
              {['Compare every store, buy at the best price', 'One cart & one checkout for SmartKong sellers', 'Partner deals open securely at the store'].map(t => (
                <li key={t} className="flex items-center gap-2.5 text-white/80"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> {t}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/cart')} className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold shadow-lg shadow-blue-500/25 hover:opacity-90 transition-opacity">
              See it in your cart <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle at 60% 40%, #2563EB, transparent 60%)' }} aria-hidden />
            <div className="relative rounded-3xl bg-white shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 font-bold text-gray-900"><ShoppingCart className="w-5 h-5 text-blue-600" /> Your SmartKong cart</span>
                <span className="text-xs text-gray-400">4 stores · 4 items</span>
              </div>
              <div className="space-y-2.5">
                {CART_DEMO.map(it => (
                  <div key={it.title} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                    <div className="w-10 h-10 rounded-lg bg-white ring-1 ring-black/5 flex items-center justify-center shrink-0"><VendorMark vendor={it.store} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{it.title}</p>
                      <p className="text-[11px] text-gray-400">{it.store}</p>
                    </div>
                    <span className="font-bold text-gray-900">${it.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">One checkout · 4 stores</p>
                  <p className="text-2xl font-black text-gray-900">$2,645</p>
                </div>
                <button onClick={() => navigate('/cart')} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">
                  <Lock className="w-4 h-4" /> Checkout once
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVING SHELF (gently moving category wall for discovery) ─────── */}
      <section className={`${T.sectionB} py-6 border-y ${theme === 'light' ? 'border-gray-100' : 'border-white/[0.06]'}`}>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <div className="sk-marquee flex items-center gap-3 w-max">
            {[...SHELF, ...SHELF].map((c, i) => (
              <button key={i} onClick={() => navigate(`/shop?q=${encodeURIComponent(c.l)}`)} className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-transform hover:scale-105 ${T.chip}`}>
                <span className="text-base">{c.e}</span> {c.l}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI COLLECTIONS (discovery signature — products that work together) */}
      <section className={`${T.sectionA} py-20 md:py-28`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal className="flex items-end justify-between mb-10">
            <SectionHead eyebrow="AI Collections" title="Curated to work together" tokens={T} sub="Don’t just buy a product — buy the whole setup. Our AI assembles complete kits where everything fits." />
            <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-500">Browse all <ArrowRight className="w-4 h-4" /></Link>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {COLLECTIONS.map(col => (
              <button
                key={col.title}
                onClick={() => navigate(`/kit/${col.key}`)}
                className={`group text-left rounded-3xl overflow-hidden transition-all hover:-translate-y-1.5 ${col.feature ? 'md:col-span-2 lg:col-span-1' : ''} ${T.card}`}
              >
                <div className={`relative h-32 bg-gradient-to-br ${col.grad} overflow-hidden`}>
                  <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 80% 20%, #fff6, transparent 45%)' }} />
                  <span className="absolute top-4 left-5 text-4xl drop-shadow-sm">{col.emoji}</span>
                  <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-white/25 backdrop-blur text-white text-[10px] font-bold tracking-wide">AI CURATED</span>
                  <div className="absolute bottom-3.5 right-4 flex gap-1.5">
                    {col.icons.map((Ic, i) => (
                      <span key={i} className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center"><Ic className="w-4 h-4 text-white" /></span>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className={`text-lg font-bold group-hover:text-blue-600 transition-colors ${T.cardTitle}`}>{col.title}</h3>
                  <p className={`text-sm mt-1 leading-relaxed ${T.cardMeta}`}>{col.sub}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-sm ${T.cardMeta}`}>From <b className={T.cardTitle}>€{col.from}</b></span>
                    <span className="flex items-center gap-1 text-blue-600 font-semibold text-sm">Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── DISCOVER (Netflix-style rows for discovery shoppers) ─────────── */}
      {pool.length >= 4 && (() => {
        const byPopular = [...pool].sort((a, b) => (b.rating_count ?? 0) - (a.rating_count ?? 0));
        const byRating = [...pool].sort((a, b) => (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0));
        const under50 = pool.filter(p => (p.price ?? 0) > 0 && (p.price ?? 0) <= 5000);
        return (
          <section className={`${T.sectionB} py-20 md:py-28`}>
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
              <SectionHead eyebrow="Because the world is shopping" title="Discover something new" tokens={T} sub="No search needed — SmartKong surfaces what people are loving right now, everywhere." />
              <div className="mt-10">
                <DiscoveryRow eyebrow="Right now" title="Trending Today" products={pool.slice(0, 14)} tokens={T} />
                <DiscoveryRow eyebrow="Loved everywhere" title="Popular Worldwide" products={byPopular.slice(0, 14)} tokens={T} />
                <DiscoveryRow eyebrow="Highest rated" title="AI Picks" products={byRating.slice(0, 14)} tokens={T} />
                <DiscoveryRow eyebrow="Budget finds" title="Under €50" products={under50.slice(0, 14)} tokens={T} />
              </div>
            </div>
          </section>
        );
      })()}

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
              <Link key={c.label} to={c.to} className={`group relative rounded-3xl p-6 pb-7 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${T.tile}`}>
                {/* Ghost letter — the tile's editorial signature */}
                <span
                  className="absolute -right-2 -bottom-7 text-[7.5rem] font-black leading-none select-none transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-4deg]"
                  style={{ color: 'transparent', WebkitTextStroke: `1.5px ${c.from}40` }} aria-hidden
                >
                  {c.label[0]}
                </span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at 30% 0%, ${c.from}1f, transparent 60%)` }} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-md transition-transform duration-300 group-hover:rotate-[8deg]" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to2})` }}><c.Icon className="w-6 h-6 text-white" /></div>
                  <p className={`text-lg font-bold ${T.cardTitle}`}>{c.label}</p>
                  <p className={`text-xs mt-1 flex items-center gap-1 group-hover:text-blue-600 transition-colors ${T.cardMeta}`}>Explore <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></p>
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
              <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] mb-4 text-white">Describe what you need.<br /><span className="sk-serif sk-aurora-text">We find the best match.</span></h3>
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

      {/* ── FINALE (grain aurora band, magnetic CTAs, giant type) ────────── */}
      <section className="sk-grain relative overflow-hidden" style={{ background: 'var(--sk-ink)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[70rem] h-[40rem] rounded-full opacity-30 blur-[130px]" style={{ background: 'var(--sk-aurora)' }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-40 border-t-2 border-blue-400/20 rounded-[100%_100%_0_0]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 lg:px-8 py-28 md:py-36 text-center">
          <Reveal>
            <span className="sk-eyebrow !text-cyan-300 justify-center">One layer above every store</span>
            <h3 className="text-5xl md:text-7xl font-black tracking-[-0.03em] leading-[0.98] text-white mt-5 mb-6">
              {firstName ? <>Ready when you are,<br /><span className="sk-serif sk-aurora-text">{firstName}.</span></> : <>Shop the world.<br /><span className="sk-serif sk-aurora-text">Sell to the world.</span></>}
            </h3>
            <p className="text-white/50 max-w-xl mx-auto mb-10 text-lg">One search, every store, one cart — and your products in front of millions of AI-guided shoppers across 230 countries.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Magnetic>
                <Link to="/shop" className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold shadow-2xl shadow-blue-500/30 hover:opacity-95 transition-opacity" style={{ background: 'var(--sk-aurora)' }}>
                  <Globe className="w-4 h-4" /> Start Shopping
                </Link>
              </Magnetic>
              <Magnetic>
                <Link to="/vendor/register" className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-md text-white font-bold hover:bg-white/[0.13] transition-colors">
                  <Store className="w-4 h-4" /> Become a Vendor
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketFooter />
    </div>
  );
}
