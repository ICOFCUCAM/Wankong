import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { useSubscription, type PlanId } from '@/contexts/SubscriptionContext';

interface Props {
  require:    PlanId;           // 'pro' | 'premium'
  children:   React.ReactNode;
  fallback?:  React.ReactNode;  // custom locked state
  compact?:   boolean;          // tiny inline badge instead of full overlay
}

export default function SubscriptionGate({ require, children, fallback, compact = false }: Props) {
  const { plan, loading } = useSubscription();

  // Hierarchy: premium > pro > free
  const rank: Record<PlanId, number> = { free: 0, pro: 1, premium: 2 };
  const hasAccess = !loading && rank[plan] >= rank[require];

  if (loading) return <>{children}</>;
  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (compact) {
    return (
      <Link to="/pricing"
        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border border-[#00D9FF]/30 text-[#00D9FF] bg-[#00D9FF]/8 hover:bg-[#00D9FF]/15 transition-colors">
        <Lock className="w-3 h-3" />
        {require === 'premium' ? 'Premium' : 'Pro'}
      </Link>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0814]/70 backdrop-blur-sm p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center mb-3 shadow-xl shadow-cyan-500/20">
          {require === 'premium' ? <Zap className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
        </div>
        <p className="text-white font-bold text-base mb-1">
          {require === 'premium' ? 'Premium' : 'Pro'} Feature
        </p>
        <p className="text-white/50 text-sm mb-4 max-w-xs">
          {require === 'premium'
            ? 'Upgrade to Premium to unlock full audiobook library, lossless audio, and more.'
            : 'Upgrade to Pro for unlimited streaming, offline downloads, and ad-free listening.'}
        </p>
        <Link to="/pricing"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-opacity shadow-lg"
          style={{ background: 'linear-gradient(135deg, #00D9FF, #9D4EDD)' }}>
          <Zap className="w-4 h-4" />
          Upgrade to {require === 'premium' ? 'Premium' : 'Pro'}
        </Link>
      </div>
    </div>
  );
}
