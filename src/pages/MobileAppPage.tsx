import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

const FEATURES = [
  {
    icon: '🎵',
    title: 'Music & Audio',
    desc: 'Stream and download music and audiobooks. Play offline with our cache system.',
  },
  {
    icon: '🎭',
    title: 'Talent Arena Live',
    desc: 'Vote on competitions in real time. Watch performances. Submit your own.',
  },
  {
    icon: '📤',
    title: 'Mobile Upload',
    desc: 'Upload tracks, books, and competition videos directly from your phone.',
  },
  {
    icon: '💰',
    title: 'Earnings Dashboard',
    desc: 'Track your revenue across all categories. Request withdrawals on the go.',
  },
  {
    icon: '🔔',
    title: 'Push Notifications',
    desc: 'Get notified when you receive votes, sales, or new subscribers.',
  },
  {
    icon: '🌍',
    title: 'Language Discovery',
    desc: 'Browse content in 16 languages. Filter by language with one tap.',
  },
];

export default function MobileAppPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: dbError } = await supabase.from('mobile_waitlist').insert([
        { email: email.trim(), created_at: new Date().toISOString() },
      ]);
      if (dbError) throw dbError;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">

        {/* Hero */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-16">

            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#00F5A0]/10 border border-[#00F5A0]/30 text-[#00F5A0] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                Coming to iOS &amp; Android
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-5 leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD]">
                  WANKONG Mobile
                </span>
              </h1>
              <p className="text-white/70 text-xl leading-relaxed mb-8 max-w-lg">
                Take your creator journey anywhere.
              </p>

              {/* Fake app store badges */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="flex items-center gap-3 bg-black border border-white/20 rounded-xl px-5 py-3 min-w-40">
                  <span className="text-2xl">🍎</span>
                  <div>
                    <p className="text-white/40 text-xs">App Store</p>
                    <p className="text-white font-semibold text-sm">Coming Soon</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black border border-white/20 rounded-xl px-5 py-3 min-w-40">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="text-white/40 text-xs">Google Play</p>
                    <p className="text-white font-semibold text-sm">Coming Soon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex-shrink-0">
              <div className="w-56 h-96 bg-[#0D1A3A] border-2 border-[#00D9FF] rounded-3xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                {/* Notch */}
                <div className="absolute top-4 w-16 h-4 bg-[#00D9FF]/20 rounded-full border border-[#00D9FF]/40" />
                <div className="text-center px-6 mt-8">
                  <p className="text-[#00D9FF] font-black text-2xl tracking-widest mb-2">WANKONG</p>
                  <p className="text-white/40 text-xs">Mobile</p>
                </div>
                {/* Fake UI elements */}
                <div className="mt-8 w-full px-5 space-y-3">
                  <div className="h-8 bg-white/5 border border-white/10 rounded-xl" />
                  <div className="h-8 bg-[#00D9FF]/10 border border-[#00D9FF]/20 rounded-xl" />
                  <div className="h-8 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-xl" />
                  <div className="h-8 bg-white/5 border border-white/10 rounded-xl" />
                </div>
                {/* Home indicator */}
                <div className="absolute bottom-4 w-24 h-1 bg-white/20 rounded-full" />
              </div>
            </div>

          </div>
        </section>

        {/* Features grid */}
        <section className="border-t border-white/10 py-16">
          <div className="max-w-5xl mx-auto px-4 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-10 text-white">Everything you need, in your pocket</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors"
                >
                  <span className="text-3xl mb-3 block">{f.icon}</span>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Early access signup */}
        <section className="border-t border-white/10 py-16">
          <div className="max-w-xl mx-auto px-4 lg:px-8 text-center">
            <h2 className="text-2xl font-bold mb-3 text-white">Get Early Access</h2>
            <p className="text-white/60 mb-8">Be the first to know when we launch.</p>

            {submitted ? (
              <div className="bg-[#00F5A0]/5 border border-[#00F5A0]/30 rounded-2xl px-8 py-8">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-[#00F5A0] font-semibold mb-1">You&apos;re on the list!</p>
                <p className="text-white/60 text-sm">We&apos;ll notify you as soon as the WANKONG mobile app is available.</p>
              </div>
            ) : (
              <form onSubmit={handleNotify} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00D9FF]/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold bg-[#00D9FF] text-[#0B0814] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving…' : 'Notify Me'}
                </button>
              </form>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
