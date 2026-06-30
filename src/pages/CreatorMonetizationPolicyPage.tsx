import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const REVENUE_SOURCES = [
  { icon: '🎵', title: 'Music Streaming', desc: 'Earn per stream from your published tracks on the WANKONG platform.' },
  { icon: '📚', title: 'Book Sales', desc: 'Earn per download or purchase when readers buy your published books.' },
  { icon: '🎧', title: 'Audiobook Sales', desc: 'Earn per chapter play or full purchase of your audiobook titles.' },
  { icon: '🏆', title: 'Competition Prizes', desc: '100% of the prize pool goes directly to the winner — zero deductions.' },
  { icon: '💿', title: 'Distribution Royalties', desc: 'Earn from Spotify, Apple Music, and other platforms via our distribution partners.' },
  { icon: '❤', title: 'Fan Memberships', desc: 'Earn recurring monthly revenue from fans who subscribe to your creator page.' },
  { icon: '🌍', title: 'Translation Sales', desc: 'Earn when translated editions of your books are purchased by readers worldwide.' },
];

const COMMISSION_ROWS = [
  { type: 'Music Streaming', creator: '70%', platform: '30%' },
  { type: 'Book / Audiobook Sales', creator: '70%', platform: '30%' },
  { type: 'Fan Memberships', creator: '90%', platform: '10%' },
  { type: 'Competition Prizes', creator: '100%', platform: '0%' },
  { type: 'Distribution Royalties', creator: 'Per partner terms', platform: '—' },
];

const CREATOR_LEVELS = [
  { level: 'Bronze', color: '#CD7F32', bonus: 'Standard rates — no bonus', extra: '' },
  { level: 'Silver', color: '#C0C0C0', bonus: '+1% bonus on all revenue streams', extra: '' },
  { level: 'Gold', color: '#FFB800', bonus: '+2% bonus on all revenue streams', extra: '' },
  { level: 'Platinum', color: '#00D9FF', bonus: '+3% bonus on all revenue streams', extra: '' },
  { level: 'Diamond', color: '#9D4EDD', bonus: '+5% bonus on all revenue streams', extra: '' },
  {
    level: 'Global Ambassador',
    color: '#00F5A0',
    bonus: '+7% bonus on all revenue streams',
    extra: 'Priority support + dedicated account manager',
  },
];

const PAYMENT_METHODS = [
  { name: 'PayPal', icon: '💳' },
  { name: 'Bank Transfer', icon: '🏦' },
  { name: 'M-Pesa', icon: '📱' },
  { name: 'MTN MoMo', icon: '📱' },
  { name: 'Orange Money', icon: '📱' },
];

export default function CreatorMonetizationPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#00D9FF] text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Creator Monetization Policy</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              WANKONG is built for creators. We maximize your earnings across every content type — music, books,
              audiobooks, competitions, fan memberships, and translations.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-16">

          {/* 1. Overview */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">1. Overview</h2>
            <p className="text-white/75 leading-relaxed">
              WANKONG is built for creators. We maximize your earnings across every content type. This policy sets out how
              you earn money on the platform, the commission structure we use, the creator level bonus programme, payment
              methods, schedules, and our fraud prevention rules. By publishing content and enabling monetization, you
              agree to the terms described below.
            </p>
          </section>

          {/* 2. Revenue Sources */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#00D9FF]">2. Revenue Sources</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {REVENUE_SOURCES.map((src) => (
                <div
                  key={src.title}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors flex gap-4 items-start"
                >
                  <span className="text-2xl flex-shrink-0">{src.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{src.title}</h3>
                    <p className="text-white/65 text-sm leading-relaxed">{src.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Platform Commission Table */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#00D9FF]">3. Platform Commission Structure</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/10">
                    <th className="text-left px-6 py-4 font-semibold text-white">Revenue Type</th>
                    <th className="text-left px-6 py-4 font-semibold text-[#00F5A0]">Creator Share</th>
                    <th className="text-left px-6 py-4 font-semibold text-white/60">Platform Share</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMISSION_ROWS.map((row, i) => (
                    <tr
                      key={row.type}
                      className={`border-t border-white/10 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                    >
                      <td className="px-6 py-4 text-white/80">{row.type}</td>
                      <td className="px-6 py-4 font-semibold text-[#00F5A0]">{row.creator}</td>
                      <td className="px-6 py-4 text-white/50">{row.platform}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-white/50 text-xs mt-3">
              * Distribution royalties are passed through directly from our distribution partners. WANKONG does not take
              an additional cut beyond what the distribution partner charges.
            </p>
          </section>

          {/* 4. Creator Levels & Bonuses */}
          <section>
            <h2 className="text-2xl font-bold mb-2 text-[#00D9FF]">4. Creator Levels & Bonuses</h2>
            <p className="text-white/70 mb-6 leading-relaxed">
              As you grow on WANKONG, you advance through creator levels. Each level unlocks bonus earnings on top of
              the standard commission rates listed above.
            </p>
            <div className="space-y-3">
              {CREATOR_LEVELS.map((lvl) => (
                <div
                  key={lvl.level}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 hover:border-white/20 transition-colors"
                >
                  <div className="font-bold text-sm w-44 flex-shrink-0" style={{ color: lvl.color }}>
                    {lvl.level}
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-sm">{lvl.bonus}</p>
                    {lvl.extra && <p className="text-white/50 text-xs mt-0.5">{lvl.extra}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Payment Methods */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#00D9FF]">5. Payment Methods</h2>
            <div className="flex flex-wrap gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <div
                  key={pm.name}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white/80"
                >
                  <span>{pm.icon}</span>
                  <span>{pm.name}</span>
                </div>
              ))}
            </div>
            <p className="text-white/60 text-sm mt-4 leading-relaxed">
              Mobile Money options (M-Pesa, MTN MoMo, Orange Money) are available for creators in supported African
              markets. Availability may vary by country.
            </p>
          </section>

          {/* 6. Minimum Withdrawal */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">6. Minimum Withdrawal</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 flex items-center gap-4">
              <span className="text-3xl">💰</span>
              <div>
                <p className="text-white font-semibold text-lg">$10 USD</p>
                <p className="text-white/60 text-sm">
                  Your balance must reach a minimum of $10 USD (or local equivalent) before you can request a
                  withdrawal. Balances below this threshold roll over to the following month.
                </p>
              </div>
            </div>
          </section>

          {/* 7. Payment Schedule */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">7. Payment Schedule</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="text-white/80 leading-relaxed">
                Earnings are calculated on the last day of each calendar month. Withdrawal requests are processed
                within{' '}
                <span className="text-[#FFB800] font-semibold">5–7 business days</span> of submission. You will
                receive a confirmation email once your payout has been dispatched.
              </p>
            </div>
          </section>

          {/* 8. Tax */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">8. Tax Obligations</h2>
            <p className="text-white/75 leading-relaxed">
              WANKONG does not withhold taxes on creator earnings. You are solely responsible for declaring and paying
              any income tax, VAT, or other levies applicable in your jurisdiction. WANKONG will issue earnings
              statements and transaction records via your Creator Dashboard that you can use for tax filing purposes.
              For tax documentation requests, email{' '}
              <a href="mailto:tax@wankong.com" className="text-[#00D9FF] hover:underline">
                tax@wankong.com
              </a>
              .
            </p>
          </section>

          {/* 9. Fraud Prevention */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">9. Fraud Prevention</h2>
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-6 py-5">
              <p className="text-white/80 leading-relaxed mb-4">
                WANKONG actively monitors for fraudulent activity including stream manipulation via bots or scripts,
                fabricated sales, fake fan memberships, and coordinated vote inflation. Detection of any fraudulent
                activity will result in:
              </p>
              <ul className="space-y-2">
                {[
                  'Immediate forfeiture of all pending and accumulated earnings',
                  'Permanent account ban with no right of appeal',
                  'Referral to relevant legal authorities where criminal activity is suspected',
                  'Blacklisting from future WANKONG platform registration',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-white/70">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">10. Contact</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="text-white/75 leading-relaxed mb-3">
                For questions about earnings, commission rates, payment methods, or this policy, contact our Creator
                Earnings team:
              </p>
              <a
                href="mailto:earnings@wankong.com"
                className="inline-flex items-center gap-2 text-[#00D9FF] hover:underline font-semibold"
              >
                📧 earnings@wankong.com
              </a>
              <p className="text-white/50 text-sm mt-3">
                Response time is typically 3–5 business days. For urgent payout issues, include "URGENT" in your
                subject line.
              </p>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
