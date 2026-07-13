-- ============================================================
-- Migration 042 — Phase 3: affiliate engine
-- ============================================================
-- 1. Affiliate product fields on ecom_products: affiliate products
--    live in the same catalog but redirect buyers to the partner
--    store through a commission-tracked link instead of checkout.
-- 2. affiliate_accounts — per-network credentials (Amazon Associates,
--    CJ, Rakuten, Temu). Admin-only.
-- 3. affiliate_commissions — commission ledger synced from networks.
-- 4. track_product_event() — click/cart counters for engagement
--    scoring (used by affiliate out-clicks and the trending engine).
-- All statements are idempotent.
-- ============================================================

-- ── 1. ecom_products affiliate fields ────────────────────────────────────────
alter table ecom_products
  add column if not exists is_affiliate     boolean not null default false,
  add column if not exists affiliate_source text,
  add column if not exists affiliate_url    text,
  add column if not exists original_url     text;

create index if not exists idx_ecom_products_affiliate
  on ecom_products(is_affiliate) where is_affiliate = true;

-- ── 2. affiliate_accounts ────────────────────────────────────────────────────
create table if not exists affiliate_accounts (
  id                        uuid primary key default gen_random_uuid(),
  provider                  text not null check (provider in ('amazon', 'cj', 'rakuten', 'temu')),
  label                     text not null,
  amazon_associate_tag      text,
  cj_personal_access_token  text,
  cj_publisher_id           text,
  cj_site_id                text,
  rakuten_affiliate_id      text,
  rakuten_api_key           text,
  temu_api_key              text,
  temu_campaign_id          text,
  temu_promo_code           text,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_affiliate_accounts_provider on affiliate_accounts(provider);

alter table affiliate_accounts enable row level security;

-- Credentials are admin-only (service role bypasses RLS for the API layer)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'affiliate_accounts' and policyname = 'affiliate_accounts_admin_all'
  ) then
    execute $p$
      create policy "affiliate_accounts_admin_all" on affiliate_accounts for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- ── 3. affiliate_commissions ─────────────────────────────────────────────────
create table if not exists affiliate_commissions (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  external_id       text not null unique,      -- network-side id (e.g. CJ actionTrackerId)
  advertiser_id     text,
  advertiser_name   text,
  commission_amount numeric(12,2) not null default 0,
  sale_amount       numeric(12,2) not null default 0,
  currency          text not null default 'USD',
  order_date        timestamptz,
  event_date        timestamptz,
  status            text,
  action_type       text,
  raw               jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_affiliate_commissions_provider on affiliate_commissions(provider);
create index if not exists idx_affiliate_commissions_event    on affiliate_commissions(event_date);

alter table affiliate_commissions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'affiliate_commissions' and policyname = 'affiliate_commissions_admin_all'
  ) then
    execute $p$
      create policy "affiliate_commissions_admin_all" on affiliate_commissions for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- ── 4. track_product_event() ─────────────────────────────────────────────────
-- Engagement counters for trending + affiliate analytics. SECURITY DEFINER so
-- anonymous shoppers can bump counters they have no update rights on.
create or replace function public.track_product_event(p_product_id uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event = 'click' then
    update ecom_products set click_count = click_count + 1 where id = p_product_id;
  elsif p_event = 'cart' then
    update ecom_products set cart_count = cart_count + 1 where id = p_product_id;
  end if;
end;
$$;

grant execute on function public.track_product_event(uuid, text) to anon;
grant execute on function public.track_product_event(uuid, text) to authenticated;
grant execute on function public.track_product_event(uuid, text) to service_role;
