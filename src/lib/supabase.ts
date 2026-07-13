import { createClient } from '@supabase/supabase-js';

// Env vars are sometimes pasted with a stray Unicode character (a smart quote,
// en-dash, non-breaking space, or trailing newline). Those land in the request
// headers and make every fetch throw "String contains non ISO-8859-1 code
// point", which silently breaks auth. A Supabase URL/JWT is pure printable
// ASCII, so we strip anything outside that range defensively.
const clean = (v: string | undefined) =>
  (v ?? '').trim().replace(/[^\x21-\x7E]/g, '');

const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const supabaseKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
