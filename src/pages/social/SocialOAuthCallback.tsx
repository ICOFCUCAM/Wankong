import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

/**
 * Landing page for the social OAuth redirect. Reads ?code&state, hands them to
 * the social-oauth-callback edge function (which does the secret token
 * exchange), then returns the creator to their Connections settings.
 */
export default function SocialOAuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Connecting your account…');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const platform = params.get('state');
      const oauthError = params.get('error_description') || params.get('error');

      if (oauthError) { setState('error'); setMessage(oauthError); return; }
      if (!code || !platform) { setState('error'); setMessage('Missing authorization code.'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState('error'); setMessage('Please sign in and try connecting again.'); return; }

      try {
        const { data, error } = await supabase.functions.invoke('social-oauth-callback', {
          body: {
            platform,
            code,
            redirect_uri: `${window.location.origin}/settings/social/callback`,
            code_verifier: sessionStorage.getItem('wk_oauth_verifier') || 'challenge',
          },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        setState('done');
        setMessage(`${platform} connected successfully.`);
        setTimeout(() => navigate('/dashboard?view=settings'), 1400);
      } catch (e: any) {
        setState('error');
        setMessage(e?.message || 'Could not complete the connection.');
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
          state === 'done' ? 'bg-[#00F5A0]/15' : state === 'error' ? 'bg-red-500/15' : 'bg-white/5'
        }`}>
          {state === 'working' && <Loader2 className="w-8 h-8 text-white/60 animate-spin" />}
          {state === 'done' && <CheckCircle className="w-8 h-8 text-[#00F5A0]" />}
          {state === 'error' && <AlertCircle className="w-8 h-8 text-red-400" />}
        </div>
        <p className="text-white font-semibold mb-1 capitalize">{state === 'working' ? 'Connecting…' : state}</p>
        <p className="text-white/50 text-sm">{message}</p>
        {state === 'error' && (
          <button onClick={() => navigate('/dashboard?view=settings')} className="mt-5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors">
            Back to settings
          </button>
        )}
      </div>
    </div>
  );
}
