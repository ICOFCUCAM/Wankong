import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Sparkles, ShoppingCart, Store, Globe, Heart, Menu, ChevronDown,
  Facebook, Twitter, Instagram, Linkedin, GitCompare, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompare } from './useCompare';
import { useWishlist } from './useWishlist';
import { ThemeToggle, useMarketTheme, themeTokens } from './theme';
import FloatingAssistant from './FloatingAssistant';
import CommandPalette from './CommandPalette';
import { ScrollProgress } from './motion';
import './market-theme.css';
import './brand.css';

// Floating compare bar — appears on every market page when the shopper has
// products in their comparison tray.
export function CompareBar() {
  const navigate = useNavigate();
  const { count, clear } = useCompare();
  if (count === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl border border-white/10">
      <span className="flex items-center gap-2 text-sm font-medium">
        <GitCompare className="w-4 h-4 text-blue-400" /> {count} to compare
      </span>
      <button onClick={() => navigate('/compare')} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors">
        Compare
      </button>
      <button onClick={clear} className="text-white/40 hover:text-white" title="Clear"><X className="w-4 h-4" /></button>
    </div>
  );
}

// SmartKong shell — light, blue-accent design ported from the original
// SmartKongMarket (Replit) app: big AI search bar, category rail, trust
// footer. Wraps every market-mode page.

const POWERED_BY = ['Amazon', 'AutoTrader', 'Carvana', 'Caterpillar', 'CJ Affiliate'];

const NAV: { label: string; to: string }[] = [
  { label: 'Categories', to: '/shop' },
  { label: 'Deals', to: '/shop?sort=price_low' },
  { label: 'Compare', to: '/compare' },
  { label: 'AI Assistant', to: '/ai-solver' },
  { label: 'Sell on SmartKong', to: '/vendor/register' },
  { label: 'Track Order', to: '/dashboard' },
];

export function MarketHeader() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const { count: wishCount } = useWishlist();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
      {/* Top bar: logo · search · actions */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          <Link to="/" className="group flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/25 overflow-hidden transition-transform group-hover:rotate-[8deg]" style={{ background: 'var(--sk-aurora, linear-gradient(100deg,#2563EB,#7C3AED 55%,#06B6D4 120%))' }}>
              <img src="/wankong-mark.png" alt="SmartKong" className="w-5 h-5 object-contain brightness-0 invert" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">Smart<span className="sk-serif sk-aurora-text pr-0.5">Kong</span></span>
          </Link>

          {/* Global product search */}
          <form onSubmit={submitSearch} className="flex-1 max-w-2xl mx-auto relative hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="What are you shopping for today?"
              className="w-full border border-gray-200 rounded-full pl-11 pr-28 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <kbd className="absolute right-[6.5rem] top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 pointer-events-none">⌘K</kbd>
            <button
              type="button"
              onClick={() => navigate(query.trim() ? `/ai-solver?q=${encodeURIComponent(query.trim())}` : '/ai-solver')}
              title="Ask AI to find products for your problem"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Search
            </button>
          </form>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <div className="hidden lg:block mr-1"><ThemeToggle /></div>
            <button
              onClick={() => toast.info('More languages coming soon — SmartKong ships worldwide.')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Language"
            >
              <Globe className="w-4 h-4" /> EN <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <Link
              to="/wishlist"
              className="relative hidden sm:flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-gray-600 hover:text-rose-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Wishlist"
            >
              <Heart className={`w-5 h-5 ${wishCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
              <span className="hidden lg:inline">Wishlist</span>
              {wishCount > 0 && (
                <span className="absolute top-1 left-4 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishCount}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              to={user ? '/dashboard' : '/auth/login'}
              className="ml-1 hidden sm:flex items-center px-4 py-2 text-white text-sm font-semibold rounded-lg transition-opacity hover:opacity-90 shadow-md shadow-blue-500/25"
              style={{ background: 'var(--sk-aurora, linear-gradient(100deg,#2563EB,#7C3AED 55%,#06B6D4 120%))' }}
            >
              {user ? 'Account' : 'Sign in'}
            </Link>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <div className="border-t border-gray-100 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <nav className="flex items-center justify-center gap-8 h-11">
            {NAV.map(n => (
              <Link
                key={n.label} to={n.to}
                className="relative text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:rounded-full after:transition-all after:duration-300 hover:after:w-full after:[background:var(--sk-aurora,linear-gradient(100deg,#2563EB,#7C3AED,#06B6D4))]"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <form onSubmit={submitSearch} className="p-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="What are you shopping for today?"
                className="w-full border border-gray-200 rounded-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
          <nav className="flex flex-col pb-2">
            {NAV.map(n => (
              <Link key={n.label} to={n.to} onClick={() => setMenuOpen(false)} className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {n.label}
              </Link>
            ))}
            <Link to={user ? '/dashboard' : '/auth/login'} onClick={() => setMenuOpen(false)} className="mx-5 my-2 text-center px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg">
              {user ? 'Account' : 'Sign in'}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// Grouped by mindset — Shop / Business / AI — so SmartKong reads as one
// focused platform, not seven products stacked together.
const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { label: 'Discover products', href: '/shop' },
      { label: 'Compare prices', href: '/compare' },
      { label: 'Deals', href: '/shop?sort=price_low' },
      { label: 'Categories', href: '/category/electronics' },
      { label: 'Wishlist', href: '/wishlist' },
    ],
  },
  {
    title: 'Business',
    links: [
      { label: 'Find suppliers', href: '/shop?q=wholesale%20suppliers' },
      { label: 'Import globally', href: '/shop?q=import%20from%20China' },
      { label: 'Sell products', href: '/vendor/register' },
      { label: 'Partner program', href: '/affiliate' },
      { label: 'Vendor dashboard', href: '/dashboard/vendor' },
    ],
  },
  {
    title: 'AI',
    links: [
      { label: 'Ask the AI', href: '/ai-solver' },
      { label: 'Compare with AI', href: '/compare' },
      { label: 'AI Collections', href: '/#collections' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Help Center', href: '/help' },
      { label: 'Contact', href: '/contact' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Buyer Protection', href: '/help' },
    ],
  },
];

export function MarketFooter() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');

  return (
    <>
    <FloatingAssistant />
    <CompareBar />
    <footer className="bg-[#05060A] border-t border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        {/* Top: brand + newsletter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-12 border-b border-white/10">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-400/20 flex items-center justify-center overflow-hidden">
                <img src="/wankong-mark.png" alt="SmartKong" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                Smart<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Kong</span>
              </span>
            </div>
            <p className="text-sm text-white/45 leading-relaxed">
              The world’s AI marketplace — discover, compare and buy anything from anywhere.
            </p>
          </div>
          <form
            onSubmit={e => { e.preventDefault(); if (email.trim()) { toast.success('Subscribed!'); setEmail(''); } }}
            className="w-full lg:w-auto"
          >
            <p className="text-sm font-semibold mb-2">Get AI deal alerts</p>
            <div className="flex gap-2">
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 lg:w-64 min-w-0 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            </div>
          </form>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 py-12">
          {FOOTER_COLUMNS.map(col => (
            <div key={col.title}>
              <p className="text-sm font-bold text-white mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-sm text-white/45 hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant wordmark — the brand sign-off */}
        <div className="overflow-hidden select-none" aria-hidden>
          <p className="sk-outline-text-dark text-center font-black tracking-[-0.04em] leading-[0.95] text-[17vw] md:text-[13vw] whitespace-nowrap translate-y-[12%]">
            SmartKong
          </p>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-white/10">
          <p className="text-xs text-white/35">© {year} SmartKong · A Wankong company. All rights reserved.</p>
          <div className="flex items-center gap-3 text-white/40">
            {[
              { Icon: Facebook,  href: 'https://www.facebook.com/wankong.official' },
              { Icon: Twitter,   href: 'https://x.com/wankong' },
              { Icon: Instagram, href: 'https://www.instagram.com/wankong.official' },
              { Icon: Linkedin,  href: 'https://www.linkedin.com/company/wankong' },
            ].map(({ Icon, href }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-white/35">Powered by:</span>
            {POWERED_BY.map(b => <span key={b} className="text-xs text-white/45 font-medium">{b}</span>)}
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useMarketTheme();
  const T = themeTokens(theme);
  return (
    <div
      className={`sk-market min-h-screen flex flex-col ${T.page} ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
      data-mktheme={theme}
    >
      <ScrollProgress />
      <MarketHeader />
      <CommandPalette />
      <main className="flex-1">{children}</main>
      <MarketFooter />
    </div>
  );
}
