import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TEAM = [
  { name: 'Pastor Emmanuel Ofori', role: 'Founder & CEO', bio: 'Visionary gospel entrepreneur with 15 years in Christian media and music ministry.', avatar: 'EO', color: 'from-[#9D4EDD] to-[#00D9FF]' },
  { name: 'Rachel Mensah', role: 'Head of Artists & Talent', bio: 'Former A&R at a major gospel label, passionate about discovering and elevating new voices.', avatar: 'RM', color: 'from-[#00D9FF] to-[#00F5A0]' },
  { name: 'Daniel Asante', role: 'CTO', bio: 'Full-stack engineer and worship leader. Believes technology should serve the Kingdom.', avatar: 'DA', color: 'from-[#FFB800] to-[#FF6B00]' },
  { name: 'Grace Oduya', role: 'Head of Content', bio: 'Award-winning music producer and podcaster with a heart for authentic Christian storytelling.', avatar: 'GO', color: 'from-[#00F5A0] to-[#9D4EDD]' },
];

const VALUES = [
  { icon: '✝️', title: 'Faith First', desc: 'Every decision we make is rooted in our commitment to Christ and Kingdom values.' },
  { icon: '🎵', title: 'Artist Empowerment', desc: 'We exist to serve creators — giving them tools, visibility, and fair compensation.' },
  { icon: '🌍', title: 'Global Impact', desc: 'Gospel music has no borders. We distribute and promote to 150+ countries.' },
  { icon: '🤝', title: 'Integrity', desc: 'Transparent royalties, honest policies, and authentic community.' },
];

const STATS = [
  { value: '50,000+', label: 'Artists & Creators' },
  { value: '150+', label: 'Countries Reached' },
  { value: '5M+', label: 'Monthly Streams' },
  { value: '$2M+', label: 'Royalties Paid Out' },
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
            <span>✝️</span> About Wankong
          </div>
          <h1 className="text-5xl font-black text-white mb-6">
            Amplifying{' '}
            <span className="bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] bg-clip-text text-transparent">
              Gospel Music
            </span>{' '}
            Worldwide
          </h1>
          <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mx-auto">
            Wankong is the premier platform for Christian and gospel artists — a place to distribute music, compete for recognition, and build a fanbase that shares your faith.
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
              <h2 className="text-3xl font-black text-white mb-5">Built for Kingdom Artists</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We started Wankong because we saw talented gospel artists struggling to get their music heard. The mainstream music industry wasn't built with faith-driven creators in mind.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Wankong changes that. We combine professional-grade distribution tools with a community that understands your message — and a competition system that rewards raw talent fairly.
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
