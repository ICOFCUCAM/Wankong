-- 037_integration_config.sql
-- Unified social-integration config. Consolidates everything per platform into
-- one admin-managed row: OAuth app credentials (client_id / client_secret) AND
-- WANKONG's official account token. Admins manage it from Admin → Integrations.
--
-- Security model:
--   • client_secret + access_token are read ONLY server-side (edge function,
--     service role). RLS keeps the whole table admin-only.
--   • client_id is NOT secret (it appears in OAuth URLs), so a SECURITY DEFINER
--     function exposes just that field to the browser so the Connect buttons
--     can start the OAuth flow.

alter table platform_social_accounts
  add column if not exists client_id     text,
  add column if not exists client_secret text;

-- Public, non-secret accessor: returns only platform + client_id for platforms
-- that have one configured. Used by the creator Connect UI.
create or replace function oauth_client_ids()
returns table (platform text, client_id text)
language sql
security definer
set search_path = public
as $$
  select platform, client_id
  from platform_social_accounts
  where client_id is not null and is_active = true;
$$;

grant execute on function oauth_client_ids() to anon, authenticated;
