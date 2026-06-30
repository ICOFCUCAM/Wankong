import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TIERS = [
  {
    name: 'Supporter',
    price: '$2/mo',
    color: '#00D9FF',
    benefits: [
      'Supporter badge on your profile',
      'x1.5 vote multiplier on competition entries',
    ],
  },
  {
    name: 'Insider',
    price: '$5/mo',
    color: '#9D4EDD',
    benefits: [
      'Insider badge on your profile',
      'x2 vote multiplier on competition entries',
      'Exclusive content access',
    ],
  },
  {
    name: 'VIP',
    price: '$10/mo',
    color: '#FFB800',
    benefits: [
      'VIP badge on your profile',
      'x3 vote multiplier on competition entries',
      'Direct creator messaging',
    ],
  },
  {
    name: 'Super Fan',
    price: '$20/mo',
    color: '#00F5A0',
    benefits: [
      'Super Fan badge on your profile',
      'x5 vote multiplier on competition entries',
      'All Insider + VIP perks',
      'Early access to new releases',
    ],
  },
];

const POLICY_SECTIONS = [
  {
    id: 'billing',
    title: '3. Billing Terms',
    content:
      'Fan Memberships are billed monthly on the date you originally subscribed. Your subscription automatically renews each month unless cancelled. You will be charged the applicable tier amount on each renewal date. All charges are processed in USD.',
  },
  {
    id: 'cancellation',
    title: '4. Cancellation Policy',
    content:
      'You may cancel your Fan Membership subscription at any time from your Account Settings. Cancellation is effective immediately but your access continues until the end of your current billing period. You will not be charged again after cancellation.',
  },
  {
    id: 'refunds',
    title: '5. Refund Policy',
    content:
      'Fan Membership fees are non-refundable for the current billing period. There are no partial refunds for unused days within a billing cycle. To avoid being charged for the next period, cancel before your next renewal date. Cancellations made after the renewal date apply to the following cycle.',
  },
  {
    id: 'votes',
    title: '6. Vote Multiplier Rules',
    content:
      'Your vote multiplier is applied to all competition votes you cast while your subscription is active. The multiplier reflects the tier you are subscribed to at the time of voting. Multipliers are not retroactive — votes cast before subscribing are not adjusted. Self-voting is prohibited and will result in disqualification regardless of membership tier.',
  },
  {
    id: 'creator-revenue',
    title: '7. Creator Revenue',
    content:
      '90% of every Fan Membership subscription fee goes directly to the creator you are subscribed to. This revenue share is calculated and disbursed monthly according to the Creator Monetization Policy. Creators must have their payment details set up to receive membership revenue.',
  },
  {
    id: 'platform-fee',
    title: '8. Platform Fee',
    content:
      'WANKONG retains a 10% platform fee from each Fan Membership subscription. This fee covers payment processing, infrastructure, fraud prevention, and platform operations. The platform fee is automatically deducted before creator earnings are calculated.',
  },
  {
    id: 'after-cancel',
    title: '9. What Happens if You Cancel',
    content:
      'When you cancel your Fan Membership, your subscriber benefits continue until the end of your paid billing period. After that period ends, your access to exclusive content is revoked, your subscriber badge is removed from your profile, and your vote multiplier reverts to the standard 1x multiplier.',
  },
  {
    id: 'disputes',
    title: '10. Disputes',
    content:
      'For billing disputes, incorrect charges, or subscription issues, contact our support team at subscriptions@wankong.com. Include your account email and a description of the issue. We aim to resolve all disputes within 5 business days.',
  },
];

export default function SubscriptionTermsPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#9D4EDD] text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Subscription Terms</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              WANKONG Fan Memberships let you support your favourite creators and unlock exclusive benefits. These terms
              govern how memberships work, how you are billed, and your rights as a subscriber.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-16">

          {/* 1. Overview */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#9D4EDD]">1. Overview</h2>
            <p className="text-white/75 leading-relaxed">
              WANKONG Fan Memberships let you support your favourite creators and unlock exclusive benefits. When you
              subscribe to a creator&apos;s Fan Membership, you gain access to tier-specific perks including badges,
              enhanced voting power, exclusive content, and direct messaging — depending on the tier you choose.
            </p>
          </section>

          {/* 2. Membership Tiers */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#9D4EDD]">2. Membership Tiers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col hover:border-white/20 transition-colors"
                  style={{ borderTopColor: tier.color, borderTopWidth: 3 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white">{tier.name}</h3>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                    >
                      {tier.price}
                    </span>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {tier.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-2 text-sm text-white/70">
                        <span className="flex-shrink-0 mt-0.5" style={{ color: tier.color }}>&#10003;</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Policy sections as accordion */}
          <section className="space-y-2">
            {POLICY_SECTIONS.map((s) => (
              <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenSection(openSection === s.id ? null : s.id)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-white text-sm">{s.title}</span>
                  <span className="text-white/40 text-xs ml-4 flex-shrink-0">
                    {openSection === s.id ? '▲' : '▼'}
                  </span>
                </button>
                {openSection === s.id && (
                  <div className="px-6 pb-6">
                    <p className="text-white/65 text-sm leading-relaxed">{s.content}</p>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Contact */}
          <section className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center">
            <p className="text-white/70 text-sm mb-2">Subscription or billing questions?</p>
            <a
              href="mailto:subscriptions@wankong.com"
              className="text-[#9D4EDD] hover:underline font-semibold"
            >
              subscriptions@wankong.com
            </a>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
