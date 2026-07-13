import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/CartContext';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_LANGUAGES, applyLangDir } from '@/lib/i18n';
import { IS_MARKET_SITE, SITE_NAME } from '@/lib/site';
import NotificationBellComponent from '@/components/NotificationBell';

// ── Language Switcher ─────────────────────────────────────────────────────────

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language.slice(0, 2))
    ?? SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    applyLangDir(code);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-white transition-colors text-xs font-medium rounded-lg hover:bg-gray-800"
        title="Select language"
        aria-label="Language selector"
      >
        {/* Globe icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline uppercase">{current.code}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${
                lang.code === current.code ? 'text-[#B794F4] font-semibold' : 'text-gray-300'
              }`}
            >
              <span>{lang.nativeLabel}</span>
              <span className="text-gray-500">{lang.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nav links (label keys map to i18n translation keys) ──────────────────────

const WANKONG_NAV: Array<{ key: string; label?: string; href?: string; handle?: string }> = [
  { key: 'nav.home',        href:   '/'                   },
  { key: 'nav.music',       handle: 'music'               },
  { key: 'nav.videos',      handle: 'videos'              },
  { key: 'nav.books',       handle: 'books'               },
  { key: 'nav.audiobooks',  handle: 'audiobooks'          },
  { key: 'nav.podcasts',    handle: 'podcasts'            },
  { key: 'nav.talentArena', handle: 'talent-arena'        },
  { key: 'nav.marketplace', handle: 'marketplace'         },
  { key: 'nav.competitions',handle: 'competitions'        },
  { key: 'nav.languages',   handle: 'languages'           },
  { key: 'nav.artists',     handle: 'artists'             },
];

// smartkong.net — market-focused navigation (plain labels, no i18n keys)
const MARKET_NAV: typeof WANKONG_NAV = [
  { key: 'nav.home',   label: 'Home',       href: '/' },
  { key: 'mk.books',   label: 'Books',      href: '/ebook-marketplace' },
  { key: 'mk.music',   label: 'Music',      href: '/music-store' },
  { key: 'mk.all',     label: 'All Products', handle: 'marketplace' },
  { key: 'mk.solver',  label: 'AI Solver',  href: '/ai-solver' },
  { key: 'mk.sell',    label: 'Sell',       href: '/vendor/register' },
];

const NAV_ITEMS = IS_MARKET_SITE ? MARKET_NAV : WANKONG_NAV;

// NotificationBell is extracted to src/components/NotificationBell.tsx

// ── Header Component ──────────────────────────────────────────────────────────

export default function Header() {
  const { t } = useTranslation();
  const { cartCount } = useCart();
  const { isAuthenticated } = useApp();
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  const [currentUserId,  setCurrentUserId]  = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id));
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-[#9D4EDD] to-purple-600 text-white text-center text-xs py-2 px-4">
        🎵 New: Global Music Distribution to 30+ platforms — <Link to="/dashboard" className="underline font-medium">Start distributing →</Link>
      </div>

      <header className={`sticky top-0 z-40 transition-all duration-300 border-b ${scrolled ? 'bg-[#0B0814]/80 backdrop-blur-xl saturate-150 shadow-lg shadow-black/30 border-white/10' : 'bg-[#0B0814]/40 backdrop-blur-md border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className={`flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className={`rounded-xl bg-gradient-to-br from-[#9D4EDD]/25 to-[#00D9FF]/10 border border-white/10 flex items-center justify-center transition-all duration-300 ${scrolled ? 'w-8 h-8' : 'w-10 h-10'}`}>
                <img src="/wankong-mark.png" alt={SITE_NAME} className={`object-contain transition-all duration-300 ${scrolled ? 'w-5 h-5' : 'w-7 h-7'}`} />
              </div>
              <span className="text-white font-bold text-lg tracking-wide hidden sm:block">
                {IS_MARKET_SITE ? (
                  <>Smart<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF]">Kong</span></>
                ) : 'WANKONG'}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden xl:flex items-center gap-1 overflow-x-auto flex-1 mx-4">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href ?? item.handle}
                  to={item.href ?? `/collections/${item.handle}`}
                  className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.label ?? t(item.key)}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* Search */}
              <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Cart */}
              <Link to="/cart" className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#9D4EDD] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Notification bell */}
              {isAuthenticated && <NotificationBellComponent />}

              {/* Language switcher */}
              <LanguageSwitcher />

              {/* Auth buttons */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    {t('nav.dashboard')}
                  </Link>
                  <button onClick={handleSignOut} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                    {t('nav.signOut')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('/auth/login')} className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors hidden sm:block">
                    {t('nav.signIn')}
                  </button>
                  <button onClick={() => navigate('/auth/register')} className="px-3 py-1.5 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-sm font-medium rounded-lg transition-colors">
                    {t('nav.getStarted')}
                  </button>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="xl:hidden p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <form onSubmit={handleSearch} className="pb-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('common.search') + ' music, books, videos, artists...'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                />
              </div>
            </form>
          )}
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-gray-800 bg-gray-950">
            <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href ?? item.handle}
                  to={item.href ?? `/collections/${item.handle}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {item.label ?? t(item.key)}
                </Link>
              ))}
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-[#B794F4] hover:text-[#C9B3F5] hover:bg-gray-800 rounded-lg transition-colors">
                {t('nav.dashboard')}
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
