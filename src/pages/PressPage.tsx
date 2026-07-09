import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PRESS_ITEMS = [
  {
    outlet: 'Billboard',
    date: 'March 28, 2025',
    headline: 'WANKONG Is Quietly Becoming the Distribution Platform Indie Creators Trust',
    url: '#',
    logo: 'BB',
    color: 'from-[#9D4EDD] to-[#00D9FF]',
  },
  {
    outlet: 'TechCrunch',
    date: 'February 14, 2025',
    headline: 'Creator-Economy Startup WANKONG Raises Seed Round to Take On the Distribution Giants',
    url: '#',
    logo: 'TC',
    color: 'from-[#00D9FF] to-[#00F5A0]',
  },
  {
    outlet: 'Rolling Stone',
    date: 'January 9, 2025',
    headline: 'New Platform Promises Fair Royalties and Real Community for Independent Artists',
    url: '#',
    logo: 'RS',
    color: 'from-[#FFB800] to-[#FF6B00]',
  },
  {
    outlet: 'Music Business Worldwide',
    date: 'December 5, 2024',
    headline: 'How WANKONG Is Helping Creators on Every Continent Reach Global Audiences',
    url: '#',
    logo: 'MBW',
    color: 'from-[#00F5A0] to-[#9D4EDD]',
  },
];

const RESOURCES = [
  { label: 'Press Kit (ZIP)', icon: '📦', href: '#' },
  { label: 'Logo Assets (SVG/PNG)', icon: '🎨', href: '#' },
  { label: 'Brand Guidelines (PDF)', icon: '📄', href: '#' },
  { label: 'Executive Bios', icon: '👤', href: '#' },
];

export default function PressPage() {
  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden py-20 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,184,0,0.08),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] text-sm px-4 py-1.5 rounded-full mb-6">
            📰 Press & Media
          </div>
          <h1 className="text-5xl font-black text-white mb-4">WANKONG in the News</h1>
          <p className="text-white/65 text-xl max-w-xl">
            Resources for journalists, bloggers, and media covering the global creator economy.
          </p>
          <div className="mt-6">
            <a href="mailto:press@wankong.com" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
              ✉️ press@wankong.com
            </a>
          </div>
        </div>
      </div>

      {/* Coverage */}
      <div className="py-16 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-black text-white mb-8">Recent Coverage</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {PRESS_ITEMS.map(item => (
              <a key={item.headline} href={item.url} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all block">
                <div className="flex items-start gap-4 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{item.logo}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.outlet}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors">"{item.headline}"</p>
                <p className="text-[#00D9FF] text-xs mt-3 group-hover:underline">Read article →</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Press Kit */}
      <div className="py-16 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-black text-white mb-8">Press Resources</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {RESOURCES.map(r => (
              <a key={r.label} href={r.href} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:border-[#FFB800]/30 hover:bg-[#FFB800]/5 transition-all group">
                <div className="text-3xl mb-3">{r.icon}</div>
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{r.label}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Boilerplate */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-black text-white mb-4">About WANKONG</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/65 text-sm leading-relaxed">
              WANKONG is the global creator marketplace, providing artists, authors and podcasters with professional distribution to 150+ streaming platforms, a competitive talent arena with real cash prizes, and a worldwide community of independent creators. Founded in 2024, WANKONG serves over 50,000 creators across 150 countries, with millions of monthly streams and over $2.8 million in royalties paid to date — and creators keep 100% of their royalties. WANKONG operates as a fully remote global team.
            </p>
            <button className="mt-4 text-xs text-[#00D9FF] hover:underline" onClick={() => navigator.clipboard?.writeText("WANKONG is the global creator marketplace for music, books, audiobooks, videos and podcasts.")}>
              Copy to clipboard
            </button>
          </div>
          <p className="mt-6 text-white/40 text-sm">
            For press inquiries, interviews, or speaking requests:{' '}
            <a href="mailto:press@wankong.com" className="text-[#00D9FF] hover:underline">press@wankong.com</a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
