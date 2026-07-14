-- Migration 055 — Monetization foundations: make the revenue portfolio real.
--
-- Affiliate commission is stream #1; this lays real schema + resolvers for the
-- other tractable streams so they're representable end-to-end, not just doc:
--   * Sponsored placements  (labeled promoted products — wired to storefront)
--   * Merchant subscriptions (stores pay for premium tools/analytics)
--   * API access            (metered agent API keys with tiers/quota)
--   * Data insights         (privacy-preserving aggregated market analytics)
-- Logistics / payment-processing / external-checkout fees stay partnership-
-- dependent and are intentionally not schematized here.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Sponsored placements — clearly-labeled promoted products
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists sponsored_placements (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references ecom_products(id) on delete cascade,
  slot       text not null default 'shop',        -- e.g. 'shop', 'home', 'category:electronics'
  bid_cents  integer not null default 0,          -- what the merchant pays per period (ranking signal)
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz not null,
  active     boolean not null default true,
  created_by uuid,
  created_at timestamptz default now()
);
create index if not exists idx_sponsored_slot on sponsored_placements (slot, active, ends_at);

-- Public: current sponsored products for a slot, highest bid first. Labeled as
-- sponsored by the caller — never mixed silently into organic results.
create or replace function public.active_sponsored(p_slot text, p_limit int default 4)
returns table (
  id uuid, title text, handle text, product_type text, genre text, category text,
  description text, price integer, compare_at_price integer, cover_url text, vendor text,
  is_affiliate boolean, affiliate_url text, rating_avg numeric, rating_count integer,
  trending_score numeric, created_at timestamptz
) language sql stable security definer set search_path to 'public' as $$
  select p.id, p.title, p.handle, p.product_type, p.genre, p.category, p.description,
         p.price, p.compare_at_price, p.cover_url, p.vendor, p.is_affiliate, p.affiliate_url,
         p.rating_avg, p.rating_count, p.trending_score, p.created_at
  from sponsored_placements sp
  join ecom_products p on p.id = sp.product_id
  where sp.active and sp.starts_at <= now() and sp.ends_at > now()
    and p.status = 'active'
    and (sp.slot = p_slot or sp.slot = 'all')
  order by sp.bid_cents desc, sp.created_at desc
  limit greatest(1, least(p_limit, 12));
$$;

create or replace function public.create_sponsored(p_product_id uuid, p_slot text, p_bid_cents int, p_days int default 30)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  if not public.is_admin_effective() then raise exception 'forbidden'; end if;
  insert into sponsored_placements (product_id, slot, bid_cents, ends_at, created_by)
  values (p_product_id, coalesce(nullif(trim(p_slot),''),'shop'), greatest(0,p_bid_cents),
          now() + make_interval(days => greatest(1, p_days)), auth.uid())
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.end_sponsored(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin_effective() then raise exception 'forbidden'; end if;
  update sponsored_placements set active = false where id = p_id;
end; $$;

create or replace function public.list_sponsored()
returns table (
  id uuid, product_id uuid, title text, slot text, bid_cents int,
  starts_at timestamptz, ends_at timestamptz, active boolean
) language sql stable security definer set search_path to 'public' as $$
  select sp.id, sp.product_id, p.title, sp.slot, sp.bid_cents, sp.starts_at, sp.ends_at, sp.active
  from sponsored_placements sp join ecom_products p on p.id = sp.product_id
  where public.is_admin_effective()
  order by sp.active desc, sp.ends_at desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Merchant subscriptions — stores pay for premium tools / analytics
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists merchant_plans (
  plan        text primary key,
  price_cents integer not null,
  features    jsonb not null default '[]'::jsonb,
  sort        integer not null default 0,
  label       text
);
insert into merchant_plans (plan, price_cents, features, sort, label) values
  ('free',    0,    '["Basic listing","Standard payouts"]'::jsonb, 1, 'Free'),
  ('growth',  2900, '["Analytics dashboard","Priority support","Bulk import"]'::jsonb, 2, 'Growth'),
  ('pro',     9900, '["Advanced analytics","Sponsored credits","API access","Dedicated manager"]'::jsonb, 3, 'Pro')
on conflict (plan) do nothing;

create table if not exists merchant_subscriptions (
  user_id            uuid primary key,
  plan               text not null default 'free' references merchant_plans(plan),
  status             text not null default 'active',
  current_period_end timestamptz,
  updated_at         timestamptz default now()
);
alter table merchant_subscriptions enable row level security;
do $$ begin
  create policy merchant_sub_self_read on merchant_subscriptions for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create or replace function public.my_merchant_plan()
returns merchant_plans language sql stable security definer set search_path to 'public' as $$
  select mp.* from merchant_plans mp
  where mp.plan = coalesce(
    (select plan from merchant_subscriptions where user_id = auth.uid() and status = 'active'),
    'free');
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. API access — metered agent API keys with tiers + monthly quota
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists agent_api_keys (
  key           text primary key,
  owner_email   text,
  tier          text not null default 'free',     -- free | pro | enterprise
  monthly_quota integer not null default 1000,
  calls         integer not null default 0,
  month_anchor  date not null default date_trunc('month', now())::date,
  active        boolean not null default true,
  created_at    timestamptz default now()
);
alter table agent_api_keys enable row level security;   -- no anon/auth select; RPC only

-- Validate + meter a key in one call. Resets the counter when the month rolls.
-- Returns { ok, tier, remaining } — ok=false when the key is invalid or the
-- monthly quota is exhausted.
create or replace function public.meter_agent_key(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare k agent_api_keys;
begin
  select * into k from agent_api_keys where key = p_key and active;
  if k.key is null then return jsonb_build_object('ok', false, 'reason', 'invalid_key'); end if;
  if k.month_anchor < date_trunc('month', now())::date then
    update agent_api_keys set calls = 0, month_anchor = date_trunc('month', now())::date where key = p_key;
    k.calls := 0;
  end if;
  if k.calls >= k.monthly_quota then
    return jsonb_build_object('ok', false, 'reason', 'quota_exceeded', 'tier', k.tier, 'remaining', 0);
  end if;
  update agent_api_keys set calls = calls + 1 where key = p_key;
  return jsonb_build_object('ok', true, 'tier', k.tier, 'remaining', k.monthly_quota - k.calls - 1);
end; $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Data insights — privacy-preserving aggregated market analytics (no PII)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.market_insights(p_category text default null)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  with base as (
    select * from ecom_products
    where status = 'active'
      and (p_category is null or category ilike '%'||p_category||'%')
  )
  select jsonb_build_object(
    'category',      coalesce(p_category, 'all'),
    'product_count', (select count(*) from base),
    'price_cents',   jsonb_build_object(
       'avg', (select coalesce(round(avg(price)),0) from base),
       'min', (select coalesce(min(price),0) from base),
       'max', (select coalesce(max(price),0) from base)),
    'top_vendors',   (select coalesce(jsonb_agg(v), '[]'::jsonb) from (
       select vendor as name, count(*) as products from base
       where vendor is not null group by vendor order by count(*) desc limit 5) v),
    'trending',      (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
       select title, trending_score from base order by trending_score desc nulls last limit 5) t)
  );
$$;

grant execute on function
  public.active_sponsored(text,int),
  public.market_insights(text),
  public.meter_agent_key(text)
to anon, authenticated;
grant execute on function public.my_merchant_plan() to authenticated;
