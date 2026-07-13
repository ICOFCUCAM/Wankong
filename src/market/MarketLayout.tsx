import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { MARKET_CATEGORIES } from './categories';
import {
  Search, Sparkles, ShoppingCart, User, Store, Globe,
  Facebook, Twitter, Instagram, Linkedin,
} from 'lucide-react';
import { toast } from 'sonner';

// SmartKong shell — light, blue-accent design ported from the original
// SmartKongMarket (Replit) app: big AI search bar, category rail, trust
// footer. Wraps every market-mode page.

const BLUE = '#2563EB';

const POWERED_BY = ['Amazon', 'AutoTrader', 'Carvana', 'Caterpillar', 'CJ Affiliate'];

export function MarketHeader() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top bar: logo · search · actions */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
              <img src="/wankong-mark.png" alt="SmartKong" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-extrabold tracking-tight" style={{ color: BLUE }}>
              SmartKong
            </span>
          </Link>

          {/* Global product search */}
          <form onSubmit={submitSearch} className="flex-1 max-w-2xl mx-auto relative hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for any product…"
              className="w-full border border-gray-300 rounded-full pl-11 pr-24 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => navigate(query.trim() ? `/ai-solver?q=${encodeURIComponent(query.trim())}` : '/ai-solver')}
              title="Ask AI to find products for your problem"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3 h-3" /> AI
            </button>
          </form>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button
              onClick={() => toast.info('SmartKong ships worldwide — prices in USD.')}
              className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              title="Global marketplace"
            >
              <Globe className="w-5 h-5" />
            </button>
            <Link
              to="/cart"
              className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
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
              to={user ? '/dashboard/vendor' : '/auth/login'}
              className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              title={user ? 'My account' : 'Sign in'}
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Category rail */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-2 h-12 overflow-x-auto scrollbar-none">
            <Link
              to="/ai-solver"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Problem Solver
            </Link>
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-semibold whitespace-nowrap shrink-0">
              <Store className="w-3.5 h-3.5" /> 20K+ Brands
            </span>
            <Link
              to="/"
              className="px-3 py-1.5 text-sm font-semibold text-gray-900 hover:text-blue-600 whitespace-nowrap transition-colors"
            >
              Homepage
            </Link>
            {MARKET_CATEGORIES.map(c => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600 whitespace-nowrap transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Marketplace',
    links: [
      { label: 'All Products', href: '/shop' },
      { label: 'AI Problem Solver', href: '/ai-solver' },
      { label: 'Trending', href: '/shop?sort=popular' },
      { label: 'Categories', href: '/category/electronics' },
      { label: 'Deals', href: '/shop?sort=price_low' },
    ],
  },
  {
    title: 'Sell & Partner',
    links: [
      { label: 'Become a Vendor', href: '/vendor/register' },
      { label: 'Vendor Dashboard', href: '/dashboard/vendor' },
      { label: 'Affiliate Backend', href: '/admin/affiliates' },
      { label: 'Partner Networks', href: '/admin/affiliates' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/help' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
      { label: 'API Access', href: '/api-access' },
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
  );
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <MarketHeader />
      <main className="flex-1">{children}</main>
      <MarketFooter />
    </div>
  );
}
