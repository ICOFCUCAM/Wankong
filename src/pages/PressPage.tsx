import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PRESS_ITEMS = [
  {
    outlet: 'Gospel Music Weekly',
    date: 'March 28, 2025',
    headline: 'Wankong Is Quietly Becoming the Spotify of Gospel Music',
    url: '#',
    logo: 'GMW',
    color: 'from-[#9D4EDD] to-[#00D9FF]',
  },
  {
    outlet: 'TechCrunch Africa',
    date: 'February 14, 2025',
    headline: 'Faith-Tech Startup Wankong Raises Seed Round to Disrupt Christian Music Distribution',
    url: '#',
    logo: 'TC',
    color: 'from-[#00D9FF] to-[#00F5A0]',
  },
  {
    outlet: 'Billboard Gospel',
    date: 'January 9, 2025',
    headline: 'New Platform Promises Fair Royalties and Real Community for Gospel Artists',
    url: '#',
    logo: 'BB',
    color: 'from-[#FFB800] to-[#FF6B00]',
  },
  {
    outlet: 'Christianity Today',
    date: 'December 5, 2024',
    headline: 'How Wankong Is Helping African Gospel Artists Reach Global Audiences',
    url: '#',
    logo: 'CT',
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
          <h1 className="text-5xl font-black text-white mb-4">Wankong in the News</h1>
          <p className="text-gray-300 text-xl max-w-xl">
            Resources for journalists, bloggers, and media covering faith-based music technology.
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
          <h2 className="text-2xl font-black text-white mb-4">About Wankong</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              Wankong is the premier gospel and Christian music platform, providing artists with professional distribution to 150+ streaming platforms, a competitive talent arena with real cash prizes, and a vibrant community of faith-based creators. Founded in 2024, Wankong serves over 50,000 artists across 150 countries, with millions of monthly streams and over $2 million in royalties paid to date. Wankong is headquartered in Lagos, Nigeria, with a fully remote global team.
            </p>
            <button className="mt-4 text-xs text-[#00D9FF] hover:underline" onClick={() => navigator.clipboard?.writeText("Wankong is the premier gospel and Christian music platform...")}>
              Copy to clipboard
            </button>
          </div>
          <p className="mt-6 text-gray-500 text-sm">
            For press inquiries, interviews, or speaking requests:{' '}
            <a href="mailto:press@wankong.com" className="text-[#00D9FF] hover:underline">press@wankong.com</a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
