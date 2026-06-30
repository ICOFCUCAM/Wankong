import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import OAuthButtons from '@/components/auth/OAuthButtons';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center">
            <span className="text-white font-black text-base">W</span>
          </div>
          <span className="text-white font-black text-2xl">WANKONG</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-black text-white mb-1">Sign In</h1>
          <p className="text-white/40 text-sm mb-6">Welcome back to the global creator platform.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* OAuth */}
          <OAuthButtons />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or continue with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00D9FF]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00D9FF]/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/auth/register" className="text-[#00D9FF] hover:underline font-medium">
              Get Started
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
