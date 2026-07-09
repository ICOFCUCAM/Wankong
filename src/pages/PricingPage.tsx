import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Star, Shield } from 'lucide-react';
import { PLANS } from '@/contexts/SubscriptionContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const STRIPE_KEY = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free:    <Shield className="w-5 h-5" />,
  pro:     <Star   className="w-5 h-5" />,
  premium: <Zap    className="w-5 h-5" />,
};

export default function PricingPage() {
  const { plan: currentPlan } = useSubscription();
  const { user }              = useAuth();
  const navigate              = useNavigate();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!user) { navigate('/auth/login?next=/pricing'); return; }
    if (planId === 'free') return;

    setLoading(planId);

    try {
      if (STRIPE_KEY) {
        // Redirect to Stripe Checkout (requires backend endpoint)
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, billing, userId: user.id }),
        });
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
          return;
        }
      }

      // Payment gateway not configured — show guidance instead of granting free access
      navigate('/dashboard');
    } catch {
      // Stripe endpoint error
    } finally {
      setLoading(null);
    }
  };

  const displayPrice = (plan: typeof PLANS[number]) => {
    if (plan.price === 0) return 'Free';
    const p = billing === 'yearly' ? plan.yearlyPrice / 12 : plan.price;
    return `$${p.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
            style={{ background: 'rgba(0,217,255,0.1)', color: '#00D9FF', border: '1px solid rgba(0,217,255,0.2)' }}>
            <Zap className="w-3.5 h-3.5" />
            Unlimited access starts here
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Choose your<br />
            <span style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WANKONG plan
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Stream, download, distribute, and compete. Cancel anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-white' : 'text-white/40'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors ${billing === 'yearly' ? 'bg-[#00D9FF]' : 'bg-white/20'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${billing === 'yearly' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-white' : 'text-white/40'}`}>
            Yearly
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400">Save 20%</span>
          </span>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {PLANS.map(plan => {
            const isCurrent  = currentPlan === plan.id;
            const isPopular  = plan.id === 'pro';

            return (
              <div key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  isPopular ? 'border-[#00D9FF]/50 bg-[#00D9FF]/5 scale-[1.02]' : 'border-white/10 bg-white/3 hover:border-white/20'
                }`}>

                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black text-[#0B0814]"
                    style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${plan.color}18`, color: plan.color }}>
                    {PLAN_ICONS[plan.id]}
                  </div>
                  <div>
                    <p className="text-white font-bold">{plan.name}</p>
                    <p className="text-white/40 text-xs">
                      {billing === 'yearly' && plan.price > 0 ? `$${plan.yearlyPrice}/yr` : ''}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-black" style={{ color: plan.color }}>
                    {displayPrice(plan)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-white/40 text-sm ml-1">/month</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-semibold border border-white/20 text-white/50">
                    Current Plan
                  </div>
                ) : plan.id === 'free' ? (
                  <Link to="/"
                    className="w-full py-3 rounded-xl text-center text-sm font-semibold border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors block">
                    Stay Free
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.id === 'premium' ? '#00D9FF' : '#9D4EDD'})` }}
                  >
                    {loading === plan.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Upgrade to {plan.name}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-white/30 text-sm">
          {['Cancel anytime', 'Secure payment', '30-day money-back guarantee', '150+ countries'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              {t}
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
