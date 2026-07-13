import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import Marketplace from '@/components/home/Marketplace';
import { Sparkles, Store, ShieldCheck, Globe } from 'lucide-react';

// Homepage for smartkong.net — the standalone marketplace site.
// Same Supabase catalog and accounts as wankong.com, market-first layout.
export default function MarketHomePage() {
  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Seo
        title="Shop Music, Books, Courses & Products"
        description="SmartKong — the global marketplace powered by Wankong. Shop music, books, audiobooks, courses and products from creators and trusted partners worldwide."
      />
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[120%] h-80 bg-[radial-gradient(ellipse_at_center,rgba(157,78,221,0.18),transparent_70%)]" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Smart<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF]">Kong</span>
          </h1>
          <p className="text-white/55 text-lg max-w-2xl mx-auto mb-8">
            The global marketplace — music, books, audiobooks, courses and products
            from independent creators and trusted partners, in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/ai-solver"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] hover:opacity-90 text-white font-semibold rounded-xl transition-opacity"
            >
              <Sparkles className="w-4 h-4" /> Solve a problem with AI
            </Link>
            <Link
              to="/vendor/register"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors"
            >
              <Store className="w-4 h-4" /> Sell on SmartKong
            </Link>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-white/35 text-xs">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Secure checkout — Stripe, PayPal, M-Pesa</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Creators &amp; partners worldwide</span>
            <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Powered by Wankong</span>
          </div>
        </div>
      </div>

      {/* Full marketplace */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <Marketplace />
      </div>

      <Footer />
    </div>
  );
}
