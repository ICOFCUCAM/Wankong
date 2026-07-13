import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME, IS_MARKET_SITE } from '@/lib/site';

// ── Column data ───────────────────────────────────────────────────────────────

const CREATORS_LINKS = [
  { label: 'Upload Music',            href: '/dashboard/artist/upload-music' },
  { label: 'Upload Album',            href: '/dashboard/artist/upload-album' },
  { label: 'Upload Book',             href: '/dashboard/author/upload-book' },
  { label: 'Upload Audiobook',        href: '/dashboard/author/upload-audiobook' },
  { label: 'Talent Arena',            href: '/collections/talent-arena' },
  { label: 'Distribution Dashboard',  href: '/dashboard/distribution' },
  { label: 'Creator Earnings',        href: '/dashboard/earnings' },
  { label: 'Creator Memberships',     href: '/dashboard/memberships' },
  { label: `Sell on ${SITE_NAME}`,      href: '/vendor/register' },
];

const DISCOVERY_LINKS = [
  { label: 'AI Problem Solver',   href: '/ai-solver' },
  { label: 'Music by Language',   href: '/collections/music' },
  { label: 'Browse Books',        href: '/collections/books' },
  { label: 'Audiobooks',          href: '/collections/audiobooks' },
  { label: 'Videos',              href: '/collections/videos' },
  { label: 'Podcasts',            href: '/collections/podcasts' },
  { label: 'Featured Artists',    href: '/collections/music' },
  { label: 'Competitions',        href: '/collections/talent-arena' },
];

const SUPPORT_LINKS = [
  { label: 'Help Center',             href: '/help' },
  { label: 'Creator Guide',           href: '/help' },
  { label: 'Distribution Guide',      href: '/distribution-agreement' },
  { label: 'Competition Rules',       href: '/competition-terms' },
  { label: 'Community Guidelines',    href: '/community-guidelines' },
  { label: 'Report Content',          href: '/report' },
  { label: 'Contact Support',         href: 'mailto:support@wankong.com' },
];

const LEGAL_LINKS = [
  { label: 'Terms of Service',              href: '/terms-of-service' },
  { label: 'Privacy Policy',               href: '/privacy-policy' },
  { label: 'Cookie Policy',                href: '/cookies' },
  { label: 'Copyright Policy',             href: '/copyright' },
  { label: 'Distribution Agreement',       href: '/distribution-agreement' },
  { label: 'Creator Monetization Policy',  href: '/creator-monetization-policy' },
  { label: 'Fan Subscription Terms',       href: '/subscription-terms' },
  { label: 'Competition Terms',            href: '/competition-terms' },
];

const ECOSYSTEM_LINKS = [
  { label: 'For Governments',    href: '/partners/government' },
  { label: 'For Universities',   href: '/partners/universities' },
  { label: 'For Churches',       href: '/partners/churches' },
  { label: 'For Publishers',     href: '/partners/publishers' },
  { label: 'For Record Labels',  href: '/partners/labels' },
  { label: 'API Access',         href: '/api-access' },
  { label: 'Mobile App',         href: '/mobile' },
];

const SOCIAL = [
  { label: 'YouTube',   icon: '▶',  href: 'https://www.youtube.com/@wankong'              },
  { label: 'TikTok',    icon: '♪',  href: 'https://www.tiktok.com/@wankong'               },
  { label: 'Instagram', icon: '◈',  href: 'https://www.instagram.com/wankong.official'    },
  { label: 'Facebook',  icon: 'f',  href: 'https://www.facebook.com/wankong.official'     },
  { label: 'LinkedIn',  icon: 'in', href: 'https://www.linkedin.com/company/wankong'      },
  { label: 'X',         icon: 'X',  href: 'https://x.com/wankong'                         },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'عربي' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'yo', label: 'Yorùbá' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function FooterLink({ href, label }: { href: string; label: string }) {
  const isExternal = href.startsWith('mailto:') || href.startsWith('http');
  if (isExternal) {
    return (
      <a href={href} className="text-sm text-white/40 hover:text-white transition-colors">
        {label}
      </a>
    );
  }
  return (
    <Link to={href} className="text-sm text-white/40 hover:text-white transition-colors">
      {label}
    </Link>
  );
}

function AccordionCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="md:hidden border-b border-white/5" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex items-center justify-between py-4 cursor-pointer list-none select-none">
        <span className="text-white font-semibold text-sm">{title}</span>
        <span className="text-white/40 text-xs">{open ? '▲' : '▼'}</span>
      </summary>
      <ul className="pb-4 space-y-3 pl-1">
        {links.map(l => (
          <li key={l.label}><FooterLink href={l.href} label={l.label} /></li>
        ))}
      </ul>
    </details>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Footer() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('wk_lang') ?? 'en'; } catch { return 'en'; }
  });

  const handleLangChange = (code: string) => {
    setLang(code);
    try { localStorage.setItem('wk_lang', code); } catch { /* ignore */ }
  };

  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-[#0B0814] to-[#06040c] border-t border-white/5">
      {/* Constellation background */}
      <div className="pointer-events-none absolute inset-0 wk-stars" aria-hidden />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-56 bg-[radial-gradient(ellipse_at_center,rgba(157,78,221,0.14),transparent_70%)]" aria-hidden />

      {/* ── Brand + newsletter band ──────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-14">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-7 md:p-9 flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <img src="/wankong-mark.png" alt="WANKONG" className="w-16 h-16 object-contain shrink-0" />
            <div>
              <p className="text-white font-black text-2xl tracking-wide leading-none mb-1">{SITE_NAME.toUpperCase()}</p>
              <p className="text-white/50 text-sm">{IS_MARKET_SITE ? 'Shop the world. Sell to the world.' : 'Create. Distribute. Get Paid — worldwide.'}</p>
            </div>
          </div>
          <form onSubmit={e => e.preventDefault()} className="flex w-full lg:w-auto gap-2">
            <input
              type="email"
              aria-label="Email for creator updates"
              placeholder="Your email for creator updates"
              className="flex-1 lg:w-72 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
            />
            <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white text-sm font-bold whitespace-nowrap hover:opacity-90 transition-opacity">Subscribe</button>
          </form>
        </div>
      </div>

      {/* ── Main columns ─────────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pb-10">

        {/* Desktop 7-col grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-7 gap-8 mb-12">

          {/* Col 1 — Brand (spans 2 on lg) */}
          <div className="md:col-span-1 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src="/wankong-mark.png" alt="WANKONG" className="w-9 h-9 object-contain shrink-0" />
              <span className="text-white font-black text-xl">{SITE_NAME.toUpperCase()}</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-5">
              {IS_MARKET_SITE ? 'The global marketplace powered by Wankong — music, books, courses and products from creators and trusted partners.' : 'Global creator marketplace for music, books, audiobooks, videos, competitions and multilingual publishing.'}
            </p>
            {/* Social icons */}
            <div className="flex flex-wrap gap-2">
              {SOCIAL.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all text-xs font-bold"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Creators */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Creators</h4>
            <ul className="space-y-2.5">
              {CREATORS_LINKS.map(l => (
                <li key={l.label}><FooterLink href={l.href} label={l.label} /></li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Discovery */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Discovery</h4>
            <ul className="space-y-2.5">
              {DISCOVERY_LINKS.map(l => (
                <li key={l.label}><FooterLink href={l.href} label={l.label} /></li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
            <ul className="space-y-2.5">
              {SUPPORT_LINKS.map(l => (
                <li key={l.label}><FooterLink href={l.href} label={l.label} /></li>
              ))}
            </ul>
          </div>

          {/* Col 5 — Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map(l => (
                <li key={l.label}><FooterLink href={l.href} label={l.label} /></li>
              ))}
            </ul>
          </div>

          {/* Col 6 — Platform & Ecosystem */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {ECOSYSTEM_LINKS.map(l => (
                <li key={l.label}><FooterLink href={l.href} label={l.label} /></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile accordion columns */}
        <div className="md:hidden mb-8">
          {/* Brand always visible on mobile */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center">
                <span className="text-white font-black text-sm">W</span>
              </div>
              <span className="text-white font-black text-lg">{SITE_NAME.toUpperCase()}</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              {IS_MARKET_SITE ? 'The global marketplace powered by Wankong — music, books, courses and products from creators and trusted partners.' : 'Global creator marketplace for music, books, audiobooks, videos, competitions and multilingual publishing.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/40 text-xs font-bold hover:text-white transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <AccordionCol title="Creators"          links={CREATORS_LINKS} />
          <AccordionCol title="Discovery"         links={DISCOVERY_LINKS} />
          <AccordionCol title="Support"           links={SUPPORT_LINKS} />
          <AccordionCol title="Legal"             links={LEGAL_LINKS} />
          <AccordionCol title="Platform"          links={ECOSYSTEM_LINKS} />
        </div>

        {/* ── Payments strip ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 py-6 border-t border-white/5">
          <span className="text-xs text-white/30">Payments powered by:</span>
          {['Stripe', 'M-Pesa', 'MTN MoMo', 'Orange'].map(p => (
            <span key={p} className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/40 text-xs rounded-lg">{p}</span>
          ))}
        </div>

        {/* ── Bottom strip ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-xs text-white/30">© {SITE_NAME.toUpperCase()} {year}. All rights reserved.</p>
            <div className="flex items-center gap-3">
              {[
                { label: 'Privacy', href: '/privacy-policy' },
                { label: 'Terms', href: '/terms-of-service' },
                { label: 'Cookies', href: '/cookies' },
                { label: 'Security', href: '/help' },
              ].map(l => (
                <Link key={l.label} to={l.href} className="text-xs text-white/30 hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Language selector */}
          <select
            value={lang}
            onChange={e => handleLangChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/40 text-xs focus:outline-none focus:border-white/30 cursor-pointer"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
    </footer>
  );
}
