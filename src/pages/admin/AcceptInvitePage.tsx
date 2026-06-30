import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Invite {
  id:         string;
  email:      string;
  role:       string;
  accepted:   boolean;
  created_at: string;
}

type PageState = 'loading' | 'invalid' | 'expired' | 'already_accepted' | 'ready' | 'wrong_email' | 'accepting' | 'done' | 'error';

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0B0814';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GREEN  = '#00F5A0';
const RED    = '#EF4444';
const GOLD   = '#FFB800';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ── Helper ─────────────────────────────────────────────────────────────────────

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-16" style={{ background: NAVY }}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}
        >
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-black text-xl">WANKONG Admin</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  const { token }        = useParams<{ token: string }>();
  const { user, signIn, signUp, refreshRole } = useAuth();
  const navigate         = useNavigate();

  const [invite,   setInvite]   = useState<Invite | null>(null);
  const [state,    setState]    = useState<PageState>('loading');
  const [message,  setMessage]  = useState('');

  // Auth form
  const [authMode, setAuthMode]   = useState<'signin' | 'signup'>('signin');
  const [email,    setEmail]      = useState('');
  const [password, setPassword]   = useState('');
  const [authErr,  setAuthErr]    = useState('');
  const [authBusy, setAuthBusy]   = useState(false);

  const accepted = useRef(false);

  // ── 1. Load invite ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { setState('invalid'); return; }

    supabase
      .from('admin_invites')
      .select('id,email,role,accepted,created_at')
      .eq('token', token)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setState('invalid'); return; }

        const inv = data as Invite;
        setInvite(inv);

        if (inv.accepted) {
          setState('already_accepted'); return;
        }
        if (Date.now() - new Date(inv.created_at).getTime() > SEVEN_DAYS_MS) {
          setState('expired'); return;
        }

        setState('ready');
        setEmail(inv.email); // pre-fill
      });
  }, [token]);

  // ── 2. If already signed in, check email match then accept ─────────────

  useEffect(() => {
    if (state !== 'ready' || !user || !invite || accepted.current) return;

    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      setState('wrong_email');
      return;
    }

    doAccept(invite);
  }, [state, user, invite]);

  // ── 3. Accept invite ───────────────────────────────────────────────────

  async function doAccept(inv: Invite) {
    if (accepted.current) return;
    accepted.current = true;
    setState('accepting');

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { setState('error'); setMessage('Session lost. Please refresh.'); return; }

    // Security: double-check email
    if (currentUser.email?.toLowerCase() !== inv.email.toLowerCase()) {
      setState('wrong_email'); return;
    }

    // Insert admin role
    const { error: roleErr } = await supabase.from('admin_roles').upsert({
      user_id:    currentUser.id,
      role:       inv.role,
      granted_by: null,
    });

    if (roleErr) {
      setState('error');
      setMessage(`Failed to assign role: ${roleErr.message}`);
      return;
    }

    // Mark invite accepted
    await supabase.from('admin_invites').update({ accepted: true }).eq('id', inv.id);

    // Refresh role in context
    await refreshRole();

    setState('done');
    setTimeout(() => navigate('/admin', { replace: true }), 2500);
  }

  // ── 4. Handle auth submit ──────────────────────────────────────────────

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setAuthErr('');

    // Guard: entered email must match invite
    if (email.trim().toLowerCase() !== invite.email.toLowerCase()) {
      setAuthErr(`This invite is for ${invite.email}. Please use that email address.`);
      return;
    }

    setAuthBusy(true);
    let err: Error | null = null;

    if (authMode === 'signin') {
      ({ error: err } = await signIn(email.trim(), password));
    } else {
      ({ error: err } = await signUp(email.trim(), password, 'fan'));
    }

    setAuthBusy(false);

    if (err) {
      setAuthErr(err.message);
      return;
    }
    // onAuthStateChange will update `user`, triggering the useEffect above
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${CYAN} transparent transparent transparent` }} />
          <p className="text-white/40 text-sm">Verifying invite…</p>
        </div>
      </Shell>
    );
  }

  if (state === 'invalid') {
    return (
      <Shell>
        <div className="text-center rounded-2xl border border-white/8 bg-white/3 p-8">
          <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: RED }} />
          <h1 className="text-white font-black text-xl mb-2">Invalid Invite</h1>
          <p className="text-white/50 text-sm">This invite link is invalid or has already been used.</p>
          <Link to="/" className="inline-block mt-6 text-sm" style={{ color: CYAN }}>← Back to homepage</Link>
        </div>
      </Shell>
    );
  }

  if (state === 'expired') {
    return (
      <Shell>
        <div className="text-center rounded-2xl border border-white/8 bg-white/3 p-8">
          <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: GOLD }} />
          <h1 className="text-white font-black text-xl mb-2">Invite Expired</h1>
          <p className="text-white/50 text-sm">
            This invite link expired after 7 days.<br />
            Contact your administrator to request a new invite.
          </p>
          <Link to="/" className="inline-block mt-6 text-sm" style={{ color: CYAN }}>← Back to homepage</Link>
        </div>
      </Shell>
    );
  }

  if (state === 'already_accepted') {
    return (
      <Shell>
        <div className="text-center rounded-2xl border border-white/8 bg-white/3 p-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: GREEN }} />
          <h1 className="text-white font-black text-xl mb-2">Already Accepted</h1>
          <p className="text-white/50 text-sm">This invite has already been used.</p>
          <Link to="/admin/dashboard" className="inline-block mt-6 px-5 py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}>
            Go to Admin Dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === 'wrong_email') {
    return (
      <Shell>
        <div className="text-center rounded-2xl border border-white/8 bg-white/3 p-8">
          <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: RED }} />
          <h1 className="text-white font-black text-xl mb-2">Wrong Account</h1>
          <p className="text-white/50 text-sm mb-2">
            This invite is for <strong className="text-white">{invite?.email}</strong>.
          </p>
          <p className="text-white/50 text-sm">Please sign out and sign in with the correct email address.</p>
        </div>
      </Shell>
    );
  }

  if (state === 'accepting') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${CYAN} transparent transparent transparent` }} />
          <p className="text-white/40 text-sm">Assigning admin role…</p>
        </div>
      </Shell>
    );
  }

  if (state === 'done') {
    return (
      <Shell>
        <div className="text-center rounded-2xl border border-white/8 bg-white/3 p-8">
          <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: GREEN }} />
          <h1 className="text-white font-black text-2xl mb-2">Admin Access Granted</h1>
          <p className="text-white/50 text-sm mb-1">
            You now have <strong className="text-white">{roleLabel(invite?.role ?? '')}</strong> access.
          </p>
          <p className="text-white/30 text-xs">Redirecting to admin dashboard…</p>
        </div>
      </Shell>
    );
  }

  if (state === 'error') {
    return (
      <Shell>
        <div className="text-center rounded-2xl border border-white/8 bg-white/3 p-8">
          <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: RED }} />
          <h1 className="text-white font-black text-xl mb-2">Something Went Wrong</h1>
          <p className="text-white/50 text-sm">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block mt-6 text-sm px-5 py-2.5 rounded-xl font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}
          >
            Try Again
          </button>
        </div>
      </Shell>
    );
  }

  // ── state === 'ready' — show login/signup form ─────────────────────────

  return (
    <Shell>
      {invite && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
          {/* Invite badge */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}25` }}
          >
            <Shield className="w-5 h-5 flex-shrink-0" style={{ color: CYAN }} />
            <div>
              <p className="text-white font-semibold text-sm">Admin Invite</p>
              <p className="text-white/50 text-xs mt-0.5">
                Role: <span className="font-medium" style={{ color: CYAN }}>{roleLabel(invite.role)}</span>
              </p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setAuthMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMode === m ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            {authErr && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: `${RED}12`, color: RED, border: `1px solid ${RED}30` }}>
                {authErr}
              </div>
            )}

            <div>
              <label className="block text-white/40 text-xs mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
                placeholder={invite.email}
              />
            </div>

            <div>
              <label className="block text-white/40 text-xs mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
                placeholder={authMode === 'signup' ? 'Min. 8 characters' : ''}
              />
            </div>

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-40 mt-1"
              style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}
            >
              {authBusy
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</span>
                : authMode === 'signin' ? 'Sign In & Accept Invite' : 'Create Account & Accept Invite'}
            </button>
          </form>

          <p className="text-white/25 text-xs text-center mt-4">
            This invite is valid for 7 days and is exclusive to {invite.email}.
          </p>
        </div>
      )}
    </Shell>
  );
}
