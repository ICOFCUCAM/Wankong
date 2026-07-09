import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY = '#0B0814';
const CYAN = '#00D9FF';

// ── Helpers ────────────────────────────────────────────────────────────────────

function redirectByRole(role: string | null, navigate: ReturnType<typeof useNavigate>) {
  switch (role) {
    case 'artist':   navigate('/dashboard/artist',   { replace: true }); break;
    case 'author':   navigate('/dashboard/author',   { replace: true }); break;
    case 'creator':  navigate('/dashboard/creator',  { replace: true }); break;
    case 'listener': navigate('/dashboard/listener', { replace: true }); break;
    case 'fan':      navigate('/dashboard/listener', { replace: true }); break;
    default:         navigate('/auth/select-role',   { replace: true }); break;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CallbackPage() {
  const navigate  = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    (async () => {
      // Exchange the code / hash tokens in the URL
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        navigate('/?auth_error=1', { replace: true });
        return;
      }

      // Check if user has a role already
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      redirectByRole(roleRow?.role ?? null, navigate);
    })();
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: NAVY }}
    >
      {/* Spinner */}
      <div
        className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-4"
        style={{ borderColor: `${CYAN} transparent transparent transparent` }}
      />
      <p className="text-white/50 text-sm">Signing you in…</p>
    </div>
  );
}
