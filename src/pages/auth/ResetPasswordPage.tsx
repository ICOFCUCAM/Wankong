import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Landing page for the password-recovery email link. Supabase establishes a
 * temporary recovery session from the URL, then the user sets a new password.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [ready, setReady]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  useEffect(() => {
    // The recovery link carries a session in the URL; supabase-js picks it up.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    // Also handle the case where the session is already restored on load.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err: any) {
      setError(err.message ?? 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center">
            <span className="text-white font-black text-base">W</span>
          </div>
          <span className="text-white font-black text-2xl">WANKONG</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-black text-white mb-1">Set a new password</h1>
          <p className="text-white/40 text-sm mb-6">Choose a new password for your account.</p>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}

          {done ? (
            <div className="bg-[#00F5A0]/10 border border-[#00F5A0]/25 text-[#00F5A0] text-sm rounded-xl px-4 py-3">
              Password updated. Signing you in…
            </div>
          ) : !ready ? (
            <div className="text-white/50 text-sm">Verifying your reset link…</div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">New password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00D9FF]/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm password</label>
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00D9FF]/50 transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
