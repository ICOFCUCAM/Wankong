import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import RoleSelector from '@/components/auth/RoleSelector';

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0B0814';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';

// ── Component ──────────────────────────────────────────────────────────────────

export default function SelectRolePage() {
  const { user, saveRole } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  if (!user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSelect = async (role: UserRole) => {
    setSaving(true);
    setError('');
    const { error: err } = await saveRole(role);
    if (err) {
      setError('Failed to save your role. Please try again.');
      setSaving(false);
      return;
    }
    // Redirect by role
    switch (role) {
      case 'artist': navigate('/dashboard/artist', { replace: true }); break;
      case 'author': navigate('/dashboard/author', { replace: true }); break;
      default:       navigate('/dashboard',         { replace: true }); break;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: NAVY }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}>
          <span className="text-white font-black text-base">W</span>
        </div>
        <span className="text-white font-black text-xl">WANKONG</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-3">Choose your role</h1>
            <p className="text-white/50 text-base leading-relaxed">
              How do you want to use WANKONG?<br />
              You can always change this later.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <RoleSelector onSelect={handleSelect} loading={saving} ctaLabel="Get Started" />

          {/* Skip */}
          <p className="text-center mt-4">
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              Skip for now — browse as fan
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
