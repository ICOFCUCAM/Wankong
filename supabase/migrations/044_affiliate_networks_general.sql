-- ============================================================
-- Migration 044 — Generalized affiliate network accounts
-- ============================================================
-- affiliate_accounts was limited to 4 hardcoded providers (amazon, cj,
-- rakuten, temu) with dedicated credential columns. The SmartKong backend
-- supports 30+ networks, so:
--   1. provider becomes free text (validated against the app's network
--      registry, not a DB constraint)
--   2. credentials jsonb holds per-network fields (associate tags, IDs,
--      API keys) — the registry defines which fields each network needs
--   3. legacy columns are kept so existing rows and code keep working
-- All statements are idempotent.
-- ============================================================

alter table affiliate_accounts drop constraint if exists affiliate_accounts_provider_check;

alter table affiliate_accounts
  add column if not exists credentials jsonb not null default '{}',
  add column if not exists notes       text;

-- Backfill credentials from the legacy dedicated columns so the generic
-- link builder sees every account the same way.
update affiliate_accounts set credentials = credentials
  || case when amazon_associate_tag     is not null then jsonb_build_object('associate_tag', amazon_associate_tag)         else '{}'::jsonb end
  || case when cj_personal_access_token is not null then jsonb_build_object('api_token', cj_personal_access_token)          else '{}'::jsonb end
  || case when cj_publisher_id          is not null then jsonb_build_object('publisher_id', cj_publisher_id)                else '{}'::jsonb end
  || case when cj_site_id               is not null then jsonb_build_object('site_id', cj_site_id)                          else '{}'::jsonb end
  || case when rakuten_affiliate_id     is not null then jsonb_build_object('affiliate_id', rakuten_affiliate_id)           else '{}'::jsonb end
  || case when rakuten_api_key          is not null then jsonb_build_object('api_key', rakuten_api_key)                     else '{}'::jsonb end
  || case when temu_api_key             is not null then jsonb_build_object('api_key', temu_api_key)                        else '{}'::jsonb end
  || case when temu_campaign_id         is not null then jsonb_build_object('campaign_id', temu_campaign_id)                else '{}'::jsonb end
  || case when temu_promo_code          is not null then jsonb_build_object('promo_code', temu_promo_code)                  else '{}'::jsonb end
where credentials = '{}'::jsonb;
