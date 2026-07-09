import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import RoleSelector from '@/components/auth/RoleSelector';
import OAuthButtons from '@/components/auth/OAuthButtons';

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0B0814';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';

// ── Multi-step register ────────────────────────────────────────────────────────

type Step = 'role' | 'credentials';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate   = useNavigate();

  const [step,     setStep]     = useState<Step>('role');
  const [role,     setRole]     = useState<UserRole | null>(null);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleRoleSelect = (r: UserRole) => {
    setRole(r);
    setStep('credentials');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    setError('');

    const { error: err } = await signUp(email, password, role);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Always send new users through onboarding first
    navigate('/onboarding', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: NAVY }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}
        >
          <span className="text-white font-black text-base">W</span>
        </div>
        <span className="text-white font-black text-xl">WANKONG</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg">

          {/* Step 1 — Role selection */}
          {step === 'role' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
                <p className="text-white/50">Choose how you want to use WANKONG</p>
              </div>
              <RoleSelector onSelect={handleRoleSelect} ctaLabel="Next: Create Account" />
              <p className="text-center mt-5 text-white/40 text-sm">
                Already have an account?{' '}
                <Link to="/" className="text-[#00D9FF] hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* Step 2 — Credentials */}
          {step === 'credentials' && (
            <>
              {/* Back + title */}
              <div className="mb-6">
                <button
                  onClick={() => setStep('role')}
                  className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-4 transition-colors"
                >
                  ← Change role
                </button>
                <h1 className="text-2xl font-black text-white">
                  Join as{' '}
                  <span style={{ color: CYAN }}>
                    {role === 'artist' ? 'Artist' : role === 'author' ? 'Author' : 'Fan'}
                  </span>
                </h1>
                <p className="text-white/50 text-sm mt-1">Create your free account</p>
              </div>

              {/* Social login */}
              <div className="mb-5">
                <OAuthButtons label="Sign up" />
              </div>

              {/* Divider */}
              <div className="relative flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">or with email</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00D9FF]/50"
                />

                <input
                  type="password"
                  placeholder="Password (min 8 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00D9FF]/50"
                />

                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00D9FF]/50"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : 'Create Account'}
                </button>
              </form>

              <p className="text-center mt-5 text-white/30 text-xs">
                By creating an account you agree to our{' '}
                <Link to="/terms-of-service" className="underline hover:text-white/60">Terms</Link>
                {' and '}
                <Link to="/privacy-policy" className="underline hover:text-white/60">Privacy Policy</Link>
              </p>

              <p className="text-center mt-3 text-white/40 text-sm">
                Already have an account?{' '}
                <Link to="/" className="text-[#00D9FF] hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
