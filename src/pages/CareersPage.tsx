import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const OPENINGS = [
  {
    id: 1,
    title: 'Senior Full-Stack Engineer',
    dept: 'Engineering',
    type: 'Full-time',
    location: 'Remote',
    desc: 'Build and scale the platform powering thousands of creators worldwide. React, TypeScript, Supabase, Node.',
    tags: ['React', 'TypeScript', 'Supabase', 'Node.js'],
  },
  {
    id: 2,
    title: 'Artist Relations Manager',
    dept: 'Artists & Talent',
    type: 'Full-time',
    location: 'Remote',
    desc: 'Onboard, support, and grow relationships with our global creator community across every genre.',
    tags: ['Artist Management', 'Communication', 'Creator Relations'],
  },
  {
    id: 3,
    title: 'Content & Marketing Strategist',
    dept: 'Marketing',
    type: 'Full-time',
    location: 'Remote',
    desc: 'Drive organic and paid growth. Create campaigns that resonate with creators and fans worldwide.',
    tags: ['Content Strategy', 'Social Media', 'SEO', 'Paid Ads'],
  },
  {
    id: 4,
    title: 'A&R Coordinator',
    dept: 'Artists & Talent',
    type: 'Contract',
    location: 'Remote',
    desc: 'Discover emerging talent across genres, curate playlists, and evaluate competition submissions.',
    tags: ['Music Curation', 'A&R', 'Discovery'],
  },
  {
    id: 5,
    title: 'DevOps / Infrastructure Engineer',
    dept: 'Engineering',
    type: 'Full-time',
    location: 'Remote',
    desc: 'Own our cloud infrastructure on Vercel and Supabase. Build CI/CD pipelines and keep us running at scale.',
    tags: ['Vercel', 'Supabase', 'CI/CD', 'DevOps'],
  },
];

const PERKS = [
  { icon: '🤝', title: 'Creator-First Culture', desc: 'Work with people who care deeply about empowering creators everywhere.' },
  { icon: '🌍', title: 'Work From Anywhere', desc: 'Fully remote team spanning the Americas, Europe, Africa and Asia.' },
  { icon: '🎵', title: 'Music Allowance', desc: '$50/month for streaming and music tools.' },
  { icon: '📚', title: 'Learning Budget', desc: '$1,000/year for courses, books, and conferences.' },
  { icon: '🏥', title: 'Health Benefits', desc: 'Comprehensive health and wellness coverage.' },
  { icon: '💸', title: 'Competitive Pay', desc: 'Market-rate salaries with equity for full-time roles.' },
];

export default function CareersPage() {
  const [selectedDept, setSelectedDept] = useState('All');
  const depts = ['All', ...Array.from(new Set(OPENINGS.map(o => o.dept)))];
  const filtered = selectedDept === 'All' ? OPENINGS : OPENINGS.filter(o => o.dept === selectedDept);

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden py-24 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,217,255,0.10),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-[#00F5A0]/10 border border-[#00F5A0]/20 text-[#00F5A0] text-sm px-4 py-1.5 rounded-full mb-6">
            🌱 We're Hiring
          </div>
          <h1 className="text-5xl font-black text-white mb-6">
            Build Something{' '}
            <span className="bg-gradient-to-r from-[#00D9FF] to-[#00F5A0] bg-clip-text text-transparent">
              That Matters
            </span>
          </h1>
          <p className="text-white/65 text-xl max-w-2xl mx-auto">
            Join a mission-driven team empowering creators worldwide. We're building the future of the global creator economy — and we want you on the team.
          </p>
        </div>
      </div>

      {/* Perks */}
      <div className="py-16 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-black text-white text-center mb-10">Why Wankong?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PERKS.map(p => (
              <div key={p.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
                <div className="text-2xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-white text-sm mb-1">{p.title}</h3>
                <p className="text-gray-400 text-xs">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Openings */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-2xl font-black text-white">Open Positions</h2>
            <div className="flex gap-2 flex-wrap">
              {depts.map(d => (
                <button key={d} onClick={() => setSelectedDept(d)} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${selectedDept === d ? 'bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filtered.map(job => (
              <div key={job.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#00D9FF]/30 transition-all group">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-[#00D9FF] transition-colors">{job.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{job.dept}</span>
                      <span>·</span>
                      <span>{job.type}</span>
                      <span>·</span>
                      <span>📍 {job.location}</span>
                    </div>
                  </div>
                  <a href={`mailto:careers@wankong.com?subject=Application: ${encodeURIComponent(job.title)}`} className="shrink-0 px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white text-xs font-medium rounded-xl hover:opacity-90 transition-opacity">
                    Apply
                  </a>
                </div>
                <p className="text-gray-400 text-sm mb-3">{job.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map(t => (
                    <span key={t} className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-lg">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Generic CTA */}
          <div className="mt-8 bg-gradient-to-br from-[#9D4EDD]/10 to-[#00D9FF]/10 border border-[#9D4EDD]/20 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Don't see your role?</h3>
            <p className="text-gray-400 text-sm mb-5">We're always looking for passionate people. Send us your story.</p>
            <a href="mailto:careers@wankong.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors text-sm font-medium">
              ✉️ careers@wankong.com
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
