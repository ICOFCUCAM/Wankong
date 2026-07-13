import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import { Reveal, Magnetic } from './motion';
import { Globe, Search, ShoppingCart, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

// The SmartKong story — the page press and partners refer from. Editorial
// Meridian layout, the shopping-layer thesis stated plainly.
export default function MarketAboutPage() {
  return (
    <MarketLayout>
      <Seo title="About" description="SmartKong is the shopping layer for the whole internet — one AI search across every store on Earth." />

      {/* Thesis */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 right-0 w-[560px] h-[560px] rounded-full opacity-15 blur-3xl" style={{ background: 'var(--sk-aurora)' }} />
        <div className="relative max-w-4xl mx-auto px-4 lg:px-8 py-24 md:py-32">
          <Reveal>
            <span className="sk-eyebrow mb-5">Our story</span>
            <h1 className="text-4xl md:text-7xl font-black tracking-[-0.03em] leading-[0.98] text-[var(--sk-ink)]">
              We're building the <span className="sk-serif sk-aurora-text">shopping layer</span> for the whole internet.
            </h1>
            <p className="mt-8 text-xl md:text-2xl text-gray-500 leading-relaxed max-w-2xl">
              The web scattered the world's stores into a million islands. SmartKong
              puts them back together — one AI search across every store on Earth,
              one place to compare every price, one cart to check out once.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-[var(--sk-mist)] py-20 md:py-28 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal><h2 className="text-3xl md:text-5xl font-black tracking-[-0.02em] text-[var(--sk-ink)] mb-14">What we <span className="sk-serif sk-aurora-text pr-1">believe.</span></h2></Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { Icon: Search, k: 'Search should find, not sell', v: 'You ask, we sweep every store and rank by price, trust and fit — never by who paid the most.' },
              { Icon: Globe, k: 'The world is one shelf', v: 'Amazon to a workshop in Lagos — if it\'s for sale anywhere, it belongs in your results.' },
              { Icon: ShoppingCart, k: 'One cart, one checkout', v: 'A thousand stores, a single basket. Shopping should end in one tap, not five.' },
            ].map((b, i) => (
              <Reveal key={b.k} delay={i * 90} className="rounded-3xl bg-white border border-gray-200 p-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-blue-500/25" style={{ background: 'var(--sk-aurora)' }}><b.Icon className="w-6 h-6" /></div>
                <p className="text-lg font-bold text-gray-900">{b.k}</p>
                <p className="mt-2 text-gray-500 leading-relaxed">{b.v}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { n: '18,500+', l: 'Stores indexed' },
              { n: '20M+', l: 'Products searchable' },
              { n: '230', l: 'Countries served' },
              { n: '1.8M+', l: 'Shoppers' },
            ].map((s, i) => (
              <Reveal key={s.l} delay={i * 70} className="text-center">
                <p className="text-4xl md:text-5xl font-black tracking-[-0.02em] sk-aurora-text">{s.n}</p>
                <p className="text-sm text-gray-500 mt-1">{s.l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sk-grain relative overflow-hidden" style={{ background: 'var(--sk-ink)' }}>
        <div aria-hidden className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[60rem] h-[36rem] rounded-full opacity-30 blur-[120px]" style={{ background: 'var(--sk-aurora)' }} />
        <div className="relative max-w-3xl mx-auto px-4 lg:px-8 py-24 text-center">
          <Reveal>
            <span className="sk-eyebrow !text-cyan-300 justify-center mb-5">Join us</span>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-0.03em] text-white leading-[1.0]">Shop the world. <span className="sk-serif sk-aurora-text">Sell to the world.</span></h2>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link to="/shop" className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold shadow-2xl shadow-blue-500/30" style={{ background: 'var(--sk-aurora)' }}><Sparkles className="w-4 h-4" /> Start shopping</Link>
              </Magnetic>
              <Link to="/vendor/register" className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur text-white font-bold hover:bg-white/[0.13] transition-colors">Start selling <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-white/40"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> A Wankong company · buyer protection on every order</p>
          </Reveal>
        </div>
      </section>
    </MarketLayout>
  );
}
