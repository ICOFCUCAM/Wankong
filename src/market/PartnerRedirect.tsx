import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// /r/:code?to=<product-handle|url>&p=<productId> — a partner's tracked link.
// Logs the click, drops a 30-day attribution cookie, then forwards the shopper.
export const REF_KEY = 'sk_ref';

export function rememberRef(code: string) {
  try { localStorage.setItem(REF_KEY, JSON.stringify({ code, ts: Date.now() })); } catch { /* ignore */ }
}
export function currentRef(): string | null {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const { code, ts } = JSON.parse(raw);
    if (!code || Date.now() - ts > 30 * 864e5) return null; // 30-day window
    return code as string;
  } catch { return null; }
}

export default function PartnerRedirect() {
  const { code } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const to = params.get('to') ?? '';
    const productId = params.get('p');
    const isExternal = /^https?:\/\//i.test(to);
    const dest = isExternal ? to : to ? `/products/${to}` : '/shop';

    (async () => {
      if (code) {
        rememberRef(code);
        try { await supabase.rpc('record_partner_click', { p_code: code, p_product_id: productId, p_target: to || null, p_country: null }); }
        catch { /* click logging is best-effort */ }
      }
      if (isExternal) window.location.replace(dest);
      else navigate(dest, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sk-market min-h-screen flex items-center justify-center bg-[var(--sk-mist)]">
      <div className="flex items-center gap-3 text-gray-500">
        <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Taking you to the best price…
      </div>
    </div>
  );
}
