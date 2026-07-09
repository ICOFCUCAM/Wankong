import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';
import { useAuth } from '@/contexts/AuthContext';

interface MembershipGateProps {
  /** The artist whose membership tiers are checked */
  artistId: string;
  /** Optional: require a specific tier (otherwise any active tier passes) */
  tierId?: string;
  /** Tier name shown in the upgrade prompt */
  tierName?: string;
  /** Content to render when the user has access */
  children: React.ReactNode;
  /** Optional custom fallback — defaults to a lock card */
  fallback?: React.ReactNode;
}

/**
 * MembershipGate — renders children only when the logged-in user has an
 * active fan subscription for the given artist (and optionally a specific tier).
 *
 * Usage:
 *   <MembershipGate artistId={track.artist_id} tierName="Gold Member">
 *     <ExclusiveContent />
 *   </MembershipGate>
 */
export default function MembershipGate({
  artistId,
  tierId,
  tierName,
  children,
  fallback,
}: MembershipGateProps) {
  const { user } = useAuth();
  const { loading, isSubscribedTo } = useMembership();

  // While loading show nothing to avoid flash
  if (loading) return null;

  // If user has access, render children
  if (user && isSubscribedTo(artistId, tierId)) {
    return <>{children}</>;
  }

  // Otherwise show the upgrade prompt (or custom fallback)
  if (fallback) return <>{fallback}</>;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#9D4EDD]/20 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-[#B794F4]" />
        </div>
        <p className="text-white font-semibold mb-1">
          {tierName ? `${tierName} exclusive` : 'Members only'}
        </p>
        <p className="text-gray-400 text-sm mb-4">
          {user
            ? 'Subscribe to this creator to unlock this content.'
            : 'Sign in and subscribe to unlock this content.'}
        </p>
        {user ? (
          <Link
            to={`/artists/${artistId}`}
            className="px-4 py-2 rounded-lg bg-[#9D4EDD] hover:bg-[#9D4EDD] text-white text-sm font-semibold transition-colors"
          >
            View Membership Tiers
          </Link>
        ) : (
          <Link
            to="/auth/login"
            className="px-4 py-2 rounded-lg bg-[#9D4EDD] hover:bg-[#9D4EDD] text-white text-sm font-semibold transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
