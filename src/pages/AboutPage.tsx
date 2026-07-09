import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TEAM = [
  { name: 'Emmanuel Ofori', role: 'Founder & CEO', bio: 'Creator-economy entrepreneur with 15 years building media and distribution platforms across three continents.', avatar: 'EO', color: 'from-[#9D4EDD] to-[#00D9FF]' },
  { name: 'Rachel Mensah', role: 'Head of Artists & Talent', bio: 'Former major-label A&R, passionate about discovering and elevating new voices from every region.', avatar: 'RM', color: 'from-[#00D9FF] to-[#00F5A0]' },
  { name: 'Daniel Asante', role: 'CTO', bio: 'Full-stack engineer who has scaled streaming products to millions of listeners worldwide.', avatar: 'DA', color: 'from-[#FFB800] to-[#FF6B00]' },
  { name: 'Grace Oduya', role: 'Head of Content', bio: 'Award-winning music producer and podcaster with a global ear for authentic storytelling.', avatar: 'GO', color: 'from-[#00F5A0] to-[#9D4EDD]' },
];

const VALUES = [
  { icon: '🎤', title: 'Creators First', desc: 'Every decision starts with the creator — better tools, more visibility, fairer pay.' },
  { icon: '🎵', title: 'Keep Your Royalties', desc: 'We never take a cut of your streaming or sales royalties. You keep 100%.' },
  { icon: '🌍', title: 'Borderless', desc: 'Music, books and stories have no borders. We distribute and promote to 150+ countries.' },
  { icon: '🤝', title: 'Integrity', desc: 'Transparent royalties, honest policies, and an authentic global community.' },
];

const STATS = [
  { value: '50,000+', label: 'Creators Worldwide' },
  { value: '150+', label: 'Countries Reached' },
  { value: '45M+', label: 'Monthly Streams' },
  { value: '$2.8M+', label: 'Royalties Paid Out' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden py-24 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(157,78,221,0.12),transparent_70%)]" />
        <div className="relative max-w-4xl mx-auto px-4 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 text-[#9D4EDD] text-sm px-4 py-1.5 rounded-full mb-6">
            <span>🌍</span> About WANKONG
          </div>
          <h1 className="text-5xl font-black text-white mb-6">
            Empowering{' '}
            <span className="bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] bg-clip-text text-transparent">
              Creators
            </span>{' '}
            Worldwide
          </h1>
          <p className="text-white/65 text-xl leading-relaxed max-w-2xl mx-auto">
            WANKONG is the global creator marketplace — a place for artists, authors and podcasters everywhere to distribute their work, compete for recognition, and build a worldwide fanbase while keeping 100% of their royalties.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-white/5 py-14">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                <p className="text-gray-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="py-20 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#00D9FF] text-sm font-medium uppercase tracking-widest block mb-3">Our Mission</span>
              <h2 className="text-3xl font-black text-white mb-5">Built for Independent Creators</h2>
              <p className="text-white/65 leading-relaxed mb-4">
                We started WANKONG because we saw talented creators everywhere struggling to get their work heard — and giving away most of their earnings to gatekeepers.
              </p>
              <p className="text-white/65 leading-relaxed">
                WANKONG changes that. We combine professional-grade distribution to 30+ platforms with a global community and a competition system that rewards raw talent fairly — while you keep 100% of your royalties.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {VALUES.map(v => (
                <div key={v.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
                  <div className="text-2xl mb-3">{v.icon}</div>
                  <h3 className="font-bold text-white text-sm mb-2">{v.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#FFB800] text-sm font-medium uppercase tracking-widest block mb-3">The Team</span>
            <h2 className="text-3xl font-black text-white">People Behind the Platform</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {TEAM.map(m => (
              <div key={m.name} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:border-white/20 transition-colors">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-lg mx-auto mb-4`}>{m.avatar}</div>
                <h3 className="font-bold text-white text-sm mb-1">{m.name}</h3>
                <p className="text-[#00D9FF] text-xs mb-3">{m.role}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
