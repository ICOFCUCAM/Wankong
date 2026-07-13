-- 047: Affiliate Engine v2 — one-button bulk import + continuous auto-sync.
--
-- 1. affiliate_accounts gains sync configuration: auto_sync, keywords /
--    advertiser filters, an optional product-feed URL (universal adapter for
--    networks without a search API), an import cap, and last-sync bookkeeping.
-- 2. affiliate_sync_runs — an audit log of every import/sync run.
-- 3. ecom_products.external_key — stable "<provider>:<external id>" so bulk
--    imports upsert instead of duplicating, and price/stock updates flow in.

-- ── 1. Account sync configuration ────────────────────────────────────────────
alter table affiliate_accounts add column if not exists auto_sync        boolean not null default false;
alter table affiliate_accounts add column if not exists sync_keywords    text;
alter table affiliate_accounts add column if not exists sync_advertisers text;
alter table affiliate_accounts add column if not exists feed_url         text;
alter table affiliate_accounts add column if not exists import_limit     integer not null default 1000;
alter table affiliate_accounts add column if not exists last_synced_at   timestamptz;
alter table affiliate_accounts add column if not exists last_sync_status text;

-- ── 2. Sync run log ──────────────────────────────────────────────────────────
create table if not exists affiliate_sync_runs (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references affiliate_accounts(id) on delete cascade,
  provider    text not null,
  trigger     text not null default 'manual' check (trigger in ('manual', 'auto')),
  found       integer not null default 0,
  imported    integer not null default 0,
  updated     integer not null default 0,
  skipped     integer not null default 0,
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_affiliate_sync_runs_account
  on affiliate_sync_runs(account_id, started_at desc);

alter table affiliate_sync_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'affiliate_sync_runs' and policyname = 'affiliate_sync_runs_admin_all'
  ) then
    create policy "affiliate_sync_runs_admin_all" on affiliate_sync_runs for all
      using (exists (select 1 from admin_roles where user_id = auth.uid()))
      with check (exists (select 1 from admin_roles where user_id = auth.uid()));
  end if;
end $$;

-- ── 3. Stable external key for dedupe/upsert ─────────────────────────────────
alter table ecom_products add column if not exists external_key text;

create unique index if not exists idx_ecom_products_external_key
  on ecom_products(external_key) where external_key is not null;

-- Backfill CJ imports done before this migration so re-imports don't duplicate.
update ecom_products
   set external_key = 'cj:' || (metadata ->> 'cj_catalog_id')
 where external_key is null
   and is_affiliate = true
   and metadata ? 'cj_catalog_id';
