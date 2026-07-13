-- ============================================================
-- Migration 045 — Vendor trust scores + price intelligence
-- ============================================================
-- 1. vendor_trust_score() — a 0-100 score computed from real signals
--    (product ratings, review volume, sales volume, approval).
-- 2. price_history + snapshot_product_prices() — daily price points so
--    product pages can show history and "lowest in range".
-- 3. price_alerts — notify-me-on-drop; snapshot flags triggered alerts.
-- All statements are idempotent.
-- ============================================================

-- ── 1. Vendor trust score ─────────────────────────────────────────────────────
create or replace function public.vendor_trust_score(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select
      coalesce(avg(p.rating_avg) filter (where coalesce(p.rating_count,0) > 0), 0) as avg_rating,
      coalesce(sum(p.rating_count), 0) as reviews,
      count(*) as products
    from ecom_products p
    where coalesce(p.vendor_id, p.creator_id) = p_user_id and p.status = 'active'
  ),
  v as (
    select sales_count, total_sales_cents, status
    from vendor_accounts where user_id = p_user_id
  )
  select jsonb_build_object(
    'score', least(100, greatest(0, round(
        40                                                             -- base
      + (select avg_rating from r) / 5.0 * 30                         -- up to 30 for rating
      + least(20, (select reviews from r)::numeric / 10.0)            -- up to 20 (200 reviews)
      + least(10, coalesce((select sales_count from v), 0)::numeric / 5.0)  -- up to 10 (50 sales)
    )::int)),
    'avg_rating', round((select avg_rating from r)::numeric, 2),
    'reviews',    (select reviews from r),
    'sales',      coalesce((select sales_count from v), 0),
    'products',   (select products from r),
    'approved',   coalesce((select status from v), '') = 'approved'
  );
$$;

grant execute on function public.vendor_trust_score(uuid) to anon, authenticated, service_role;

-- ── 2. Price history ──────────────────────────────────────────────────────────
create table if not exists price_history (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references ecom_products(id) on delete cascade,
  price       integer not null,   -- cents
  recorded_at timestamptz not null default now()
);

create index if not exists idx_price_history_product on price_history(product_id, recorded_at);

alter table price_history enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'price_history' and policyname = 'price_history_public_read') then
    execute $p$ create policy "price_history_public_read" on price_history for select using (true) $p$;
  end if;
end $$;

-- Records one price point per active product per ~day (deduped within 20h) so
-- a history line accrues even when the price is flat. Service-role only.
create or replace function public.snapshot_product_prices()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_alerts integer;
begin
  insert into price_history (product_id, price)
  select p.id, p.price
  from ecom_products p
  where p.status = 'active'
    and not exists (
      select 1 from price_history h
      where h.product_id = p.id and h.recorded_at > now() - interval '20 hours'
    );
  get diagnostics v_count = row_count;

  -- Trigger price-drop alerts
  update price_alerts a
    set triggered_at = now()
  from ecom_products p
  where a.product_id = p.id
    and a.active
    and a.triggered_at is null
    and p.price <= a.target_cents;
  get diagnostics v_alerts = row_count;

  return jsonb_build_object('ok', true, 'snapshotted', v_count, 'alerts_triggered', v_alerts);
end;
$$;

revoke all on function public.snapshot_product_prices() from public, anon, authenticated;
grant execute on function public.snapshot_product_prices() to service_role;

-- ── 3. Price alerts ───────────────────────────────────────────────────────────
create table if not exists price_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  product_id   uuid not null references ecom_products(id) on delete cascade,
  target_cents integer not null,
  active       boolean not null default true,
  triggered_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_price_alerts_product on price_alerts(product_id);

alter table price_alerts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'price_alerts' and policyname = 'price_alerts_owner_all') then
    execute $p$ create policy "price_alerts_owner_all" on price_alerts for all
      using (user_id = auth.uid()) with check (user_id = auth.uid()) $p$;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'price_alerts' and policyname = 'price_alerts_admin_all') then
    execute $p$ create policy "price_alerts_admin_all" on price_alerts for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid())) $p$;
  end if;
end $$;
