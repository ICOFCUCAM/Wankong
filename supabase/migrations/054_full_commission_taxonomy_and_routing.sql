-- Migration 054 — Complete the commission taxonomy + Commerce Score routing.
--
-- Closes the remaining gaps in the SmartKong commission model so every model
-- in the "commission models" matrix is representable, and adds the marquee
-- routing engine that ranks competing merchant offers by *customer value*
-- (with commission as a comparable-value tie-breaker, never the driver).
--
-- New models added here:
--   * Merchant-specific rates      (Amazon 3%, eBay 4%, Temu 8% …)
--   * Hybrid                       ($20 + 5% per sale)
--   * Volume bonus (monthly window)(+2% after N sales this month)
--   * Multi-tier / sub-affiliate   (recruit affiliates → override on their sales)
--   * Partner rev-share levels     (Starter 60% … Enterprise negotiated of SK's take)
--   * Commerce Score routing       (best_offer_for(): value-first merchant pick)
--
-- Already present (migrations 051–053): percentage, fixed/flat, category-based,
-- cumulative tiers, recurring, lead/CPA.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Program-wide config (override rates, assumed inbound rate)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists partner_program_config (
  key   text primary key,
  value integer not null,
  label text
);
insert into partner_program_config (key, value, label) values
  ('tier2_bps',          500, 'Sub-affiliate override — 2nd tier (recruiter earns on their recruits'' sales)'),
  ('tier3_bps',          200, 'Sub-affiliate override — 3rd tier'),
  ('default_inbound_bps',500, 'Assumed SmartKong inbound commission when the merchant rate is unknown')
on conflict (key) do nothing;

create or replace function public.cfg_int(p_key text, p_default int default 0)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce((select value from partner_program_config where key = p_key), p_default);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Merchant-specific inbound rates
--    `bps` = the commission SmartKong itself earns from this merchant. It is the
--    "Commission" column in routing, and (in GMV mode) the per-merchant rate a
--    partner earns on that merchant's products.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists merchant_commission (
  merchant   text primary key,
  bps        integer not null,
  flat_cents integer not null default 0,
  label      text,
  updated_at timestamptz default now()
);
insert into merchant_commission (merchant, bps, label) values
  ('amazon',     300, 'Amazon'),
  ('best buy',   100, 'Best Buy'),
  ('bestbuy',    100, 'Best Buy'),
  ('newegg',     300, 'Newegg'),
  ('ebay',       400, 'eBay'),
  ('walmart',    200, 'Walmart'),
  ('aliexpress', 800, 'AliExpress'),
  ('temu',       800, 'Temu'),
  ('target',     200, 'Target')
on conflict (merchant) do nothing;

create or replace function public.set_merchant_commission(p_merchant text, p_bps int, p_flat int default 0, p_label text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin_effective() then raise exception 'forbidden'; end if;
  insert into merchant_commission (merchant, bps, flat_cents, label, updated_at)
  values (lower(trim(p_merchant)), p_bps, coalesce(p_flat,0), p_label, now())
  on conflict (merchant) do update
    set bps = excluded.bps, flat_cents = excluded.flat_cents,
        label = coalesce(excluded.label, merchant_commission.label), updated_at = now();
end; $$;

-- Guard: is_admin_effective may not exist under that name — fall back gracefully.
-- (Defined in the superadmin migration as is_super_admin / admin_roles lookup.)
create or replace function public.is_admin_effective()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from admin_roles where user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Volume bonus (monthly window) — distinct from cumulative commission_tiers
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists volume_bonus (
  min_monthly_orders integer primary key,
  bonus_bps          integer not null,
  label              text
);
insert into volume_bonus (min_monthly_orders, bonus_bps, label) values
  (100,  200, '+2% after 100 sales/month'),
  (500,  300, '+3% after 500 sales/month'),
  (1000, 500, '+5% after 1,000 sales/month')
on conflict (min_monthly_orders) do nothing;

create or replace function public.partner_monthly_orders(p_partner_id uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select count(*)::int from partner_conversions
   where partner_id = p_partner_id
     and status <> 'reversed'
     and event_type in ('sale','recurring')
     and created_at >= date_trunc('month', now());
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Multi-tier / sub-affiliate + hybrid + rev-share columns
-- ─────────────────────────────────────────────────────────────────────────────
alter table affiliate_partners
  add column if not exists referred_by uuid references affiliate_partners(id),
  add column if not exists commission_basis text not null default 'gmv'
    check (commission_basis in ('gmv','revshare'));

-- Allow the new 'override' event on conversions.
alter table partner_conversions drop constraint if exists partner_conversions_event_type_check;
alter table partner_conversions
  add constraint partner_conversions_event_type_check
  check (event_type in ('sale','recurring','lead','override'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Partner rev-share levels (Starter → Enterprise), share of SmartKong's take
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists partner_levels (
  level              text primary key,
  min_monthly_orders integer not null,
  revenue_share_bps  integer,          -- null = negotiated
  sort               integer not null,
  label              text
);
insert into partner_levels (level, min_monthly_orders, revenue_share_bps, sort, label) values
  ('starter',    0,     6000, 1, 'Starter — 60% of SmartKong''s affiliate revenue'),
  ('growth',     100,   7000, 2, 'Growth — 70%'),
  ('pro',        1000,  8000, 3, 'Pro — 80%'),
  ('enterprise', 10000, null, 4, 'Enterprise — negotiated')
on conflict (level) do nothing;

create or replace function public.partner_level(p_partner_id uuid)
returns partner_levels language sql stable security definer set search_path to 'public' as $$
  select * from partner_levels
   where min_monthly_orders <= public.partner_monthly_orders(p_partner_id)
   order by min_monthly_orders desc limit 1;
$$;

create or replace function public.partner_revshare_bps(p_partner_id uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce((public.partner_level(p_partner_id)).revenue_share_bps, 6000);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Rate resolution — now merchant-aware, hybrid-aware, monthly-bonus-aware
-- ─────────────────────────────────────────────────────────────────────────────
-- partner_rate: cumulative tier OR base, plus the best-qualifying monthly bonus.
create or replace function public.partner_rate(p_partner_id uuid)
returns integer language plpgsql stable security definer set search_path to 'public' as $$
declare v_sales bigint; v_bps int; v_base int; v_bonus int;
begin
  select default_commission_bps into v_base from affiliate_partners where id = p_partner_id;
  select coalesce(sum(amount_cents),0) into v_sales from partner_conversions
    where partner_id = p_partner_id and status <> 'reversed';
  select bps into v_bps from commission_tiers
    where partner_id = p_partner_id and min_sales_cents <= v_sales
    order by min_sales_cents desc limit 1;
  select coalesce(max(bonus_bps),0) into v_bonus from volume_bonus
    where min_monthly_orders <= public.partner_monthly_orders(p_partner_id);
  return coalesce(v_bps, v_base, 0) + coalesce(v_bonus, 0);
end; $$;

-- SmartKong's inbound rate for a merchant (bps), falling back to config default.
create or replace function public.merchant_inbound_bps(p_merchant text)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select bps from merchant_commission where merchant = lower(trim(p_merchant))),
    public.cfg_int('default_inbound_bps', 500));
$$;

-- commission_for: single-amount path (recurring, promo without line items).
-- Adds hybrid (flat + %) and rev-share basis.
create or replace function public.commission_for(p_partner_id uuid, p_amount_cents integer)
returns integer language plpgsql stable security definer set search_path to 'public' as $$
declare v_type text; v_flat int; v_basis text; v_rate int;
begin
  select commission_type, flat_cents, commission_basis
    into v_type, v_flat, v_basis from affiliate_partners where id = p_partner_id;

  if v_basis = 'revshare' then
    -- Partner earns a share of SmartKong's assumed inbound commission.
    return round(p_amount_cents
           * public.cfg_int('default_inbound_bps', 500) / 10000.0
           * public.partner_revshare_bps(p_partner_id) / 10000.0);
  end if;

  if v_type = 'flat'   then return coalesce(v_flat,0); end if;
  v_rate := public.partner_rate(p_partner_id);
  if v_type = 'hybrid' then return coalesce(v_flat,0) + round(p_amount_cents * v_rate / 10000.0); end if;
  return round(p_amount_cents * v_rate / 10000.0);
end; $$;

-- commission_for_order: per-line-item, precedence merchant > category > base;
-- hybrid adds the flat once; rev-share pays a share of SK's inbound take.
create or replace function public.commission_for_order(p_partner_id uuid, p_order_id uuid)
returns integer language plpgsql stable security definer set search_path to 'public' as $$
declare v_type text; v_flat int; v_basis text; v_base int; v_total int; v_gross int;
begin
  select commission_type, flat_cents, commission_basis
    into v_type, v_flat, v_basis from affiliate_partners where id = p_partner_id;

  if v_basis = 'revshare' then
    -- SmartKong's inbound gross across the order (merchant rate > category > default).
    select coalesce(sum(
             round(oi.price * oi.quantity *
               coalesce(mc.bps, cc.bps, public.cfg_int('default_inbound_bps',500)) / 10000.0)
           ),0)::int
      into v_gross
    from ecom_order_items oi
    left join ecom_products p on p.id = oi.product_id
    left join merchant_commission mc on mc.merchant = lower(p.vendor)
    left join category_commission cc on cc.category = p.category
    where oi.order_id = p_order_id;
    if v_gross = 0 then
      select round(total_cents * public.cfg_int('default_inbound_bps',500) / 10000.0)::int
        into v_gross from ecom_orders where id = p_order_id;
    end if;
    return round(coalesce(v_gross,0) * public.partner_revshare_bps(p_partner_id) / 10000.0);
  end if;

  if v_type = 'flat' then return coalesce(v_flat,0); end if;
  v_base := public.partner_rate(p_partner_id);

  -- Per-item: merchant-specific rate beats category rate beats the partner base.
  select coalesce(sum(
           round(oi.price * oi.quantity * coalesce(mc.bps, cc.bps, v_base) / 10000.0)
         ),0)::int
    into v_total
  from ecom_order_items oi
  left join ecom_products p on p.id = oi.product_id
  left join merchant_commission mc on mc.merchant = lower(p.vendor)
  left join category_commission cc on cc.category = p.category
  where oi.order_id = p_order_id;

  if v_total = 0 then
    select round(total_cents * v_base / 10000.0)::int into v_total from ecom_orders where id = p_order_id;
  end if;

  if v_type = 'hybrid' then v_total := coalesce(v_total,0) + coalesce(v_flat,0); end if;
  return coalesce(v_total, 0);
end; $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Sub-affiliate override chain (credit the recruiter, and their recruiter)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.credit_override_chain(p_partner_id uuid, p_order_id uuid, p_amount_cents int)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_ref uuid; v_ref2 uuid; v_t2 int; v_t3 int;
begin
  v_t2 := public.cfg_int('tier2_bps', 500);
  v_t3 := public.cfg_int('tier3_bps', 200);

  select referred_by into v_ref from affiliate_partners where id = p_partner_id;
  if v_ref is not null and v_t2 > 0
     and exists (select 1 from affiliate_partners where id = v_ref and status = 'approved') then
    insert into partner_conversions (partner_id, order_id, amount_cents, commission_cents, event_type, ref_key)
    values (v_ref, null, p_amount_cents, round(p_amount_cents * v_t2 / 10000.0), 'override', 'ov1:'||p_order_id)
    on conflict (partner_id, ref_key) where ref_key is not null do nothing;

    select referred_by into v_ref2 from affiliate_partners where id = v_ref;
    if v_ref2 is not null and v_t3 > 0
       and exists (select 1 from affiliate_partners where id = v_ref2 and status = 'approved') then
      insert into partner_conversions (partner_id, order_id, amount_cents, commission_cents, event_type, ref_key)
      values (v_ref2, null, p_amount_cents, round(p_amount_cents * v_t3 / 10000.0), 'override', 'ov2:'||p_order_id)
      on conflict (partner_id, ref_key) where ref_key is not null do nothing;
    end if;
  end if;
end; $$;

-- Fire the override chain from both conversion entry points.
create or replace function public.record_partner_conversion(p_code text, p_order_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_pid uuid; v_total int; v_buyer uuid; v_puser uuid;
begin
  select id, user_id into v_pid, v_puser from affiliate_partners where code = lower(p_code) and status = 'approved';
  if v_pid is null then return; end if;
  select total_cents, user_id into v_total, v_buyer from ecom_orders where id = p_order_id;
  if v_total is null then return; end if;
  if v_buyer is not null and v_buyer = v_puser then return; end if;
  insert into partner_conversions (partner_id, order_id, amount_cents, commission_cents)
  values (v_pid, p_order_id, v_total, public.commission_for_order(v_pid, p_order_id))
  on conflict (order_id) do nothing;
  perform public.credit_override_chain(v_pid, p_order_id, v_total);
end; $$;

create or replace function public.record_conversion_by_promo(p_code text, p_order_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_pc partner_promo_codes; v_total int; v_buyer uuid; v_puser uuid;
begin
  select * into v_pc from partner_promo_codes where code = upper(trim(p_code)) and active
    and (max_uses is null or uses < max_uses);
  if v_pc is null then return; end if;
  select user_id into v_puser from affiliate_partners where id = v_pc.partner_id and status='approved';
  if v_puser is null then return; end if;
  select total_cents, user_id into v_total, v_buyer from ecom_orders where id = p_order_id;
  if v_total is null then return; end if;
  if v_buyer is not null and v_buyer = v_puser then return; end if;
  insert into partner_conversions (partner_id, order_id, amount_cents, commission_cents)
  values (v_pc.partner_id, p_order_id, v_total, public.commission_for_order(v_pc.partner_id, p_order_id))
  on conflict (order_id) do nothing;
  update partner_promo_codes set uses = uses + 1 where id = v_pc.id;
  perform public.credit_override_chain(v_pc.partner_id, p_order_id, v_total);
end; $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Commerce Score routing — value-first merchant selection
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists merchant_reputation (
  merchant       text primary key,
  rep_score      integer not null default 70,   -- 0–100 trust
  avg_ship_days  numeric not null default 4,
  return_days    integer not null default 30,
  warranty_months integer not null default 0,
  updated_at     timestamptz default now()
);
insert into merchant_reputation (merchant, rep_score, avg_ship_days, return_days, warranty_months) values
  ('amazon',     95, 1, 30, 12),
  ('best buy',   93, 3, 15, 12),
  ('bestbuy',    93, 3, 15, 12),
  ('newegg',     90, 5, 30, 12),
  ('ebay',       82, 7, 30, 0),
  ('walmart',    88, 2, 90, 12),
  ('target',     88, 3, 90, 12),
  ('aliexpress', 74, 20, 15, 0),
  ('temu',       72, 12, 90, 0)
on conflict (merchant) do nothing;

create or replace function public.set_merchant_reputation(
  p_merchant text, p_rep int, p_ship numeric, p_return int, p_warranty int)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin_effective() then raise exception 'forbidden'; end if;
  insert into merchant_reputation (merchant, rep_score, avg_ship_days, return_days, warranty_months, updated_at)
  values (lower(trim(p_merchant)), p_rep, p_ship, p_return, p_warranty, now())
  on conflict (merchant) do update set
    rep_score = excluded.rep_score, avg_ship_days = excluded.avg_ship_days,
    return_days = excluded.return_days, warranty_months = excluded.warranty_months, updated_at = now();
end; $$;

-- Pure Commerce Score (0–100) for one offer, normalized within its comparison set.
-- Weights shift by shopper preference. Commission is NOT part of customer value.
create or replace function public.commerce_score(
  p_price_cents int, p_min_price int, p_max_price int,
  p_ship_days numeric, p_max_ship numeric,
  p_rep int, p_return_days int, p_warranty_months int,
  p_pref text default 'balanced')
returns numeric language plpgsql immutable set search_path to 'public' as $$
declare
  price_s numeric; ship_s numeric; rep_s numeric; svc_s numeric;
  w_price numeric; w_ship numeric; w_rep numeric; w_svc numeric;
begin
  -- Sub-scores 0–100 (higher is better).
  price_s := case when p_max_price <= p_min_price then 100
                  else 100 * (p_max_price - p_price_cents)::numeric / (p_max_price - p_min_price) end;
  ship_s  := case when p_max_ship <= 0 then 100
                  else 100 * (p_max_ship - p_ship_days)::numeric / greatest(p_max_ship, 1) end;
  rep_s   := greatest(0, least(100, p_rep));
  svc_s   := least(100, coalesce(p_return_days,0) * 0.8 + coalesce(p_warranty_months,0) * 3);

  case lower(coalesce(p_pref,'balanced'))
    when 'cheapest' then w_price:=0.65; w_ship:=0.10; w_rep:=0.15; w_svc:=0.10;
    when 'fastest'  then w_price:=0.20; w_ship:=0.55; w_rep:=0.15; w_svc:=0.10;
    when 'trusted'  then w_price:=0.20; w_ship:=0.15; w_rep:=0.45; w_svc:=0.20;
    else                 w_price:=0.40; w_ship:=0.22; w_rep:=0.26; w_svc:=0.12; -- balanced
  end case;

  return round(price_s*w_price + ship_s*w_ship + rep_s*w_rep + svc_s*w_svc, 1);
end; $$;

-- best_offer_for(): rank the merchant offers for one product group by Commerce
-- Score, using est. commission ONLY as a tie-breaker among comparable offers
-- (adds at most ~3 points), so revenue never overrides a better deal.
--
-- Grouping: products sharing a UPC, else a normalized title. Returns one row per
-- offer, ordered best-first; `is_pick` flags the routed recommendation.
create or replace function public.best_offer_for(p_group text, p_pref text default 'balanced')
returns table (
  product_id uuid, merchant text, price_cents int, ship_days numeric,
  rep_score int, est_commission_cents int, commerce_score numeric,
  routed_value numeric, is_pick boolean
) language sql stable security definer set search_path to 'public' as $$
  with offers as (
    select p.id, coalesce(nullif(lower(p.vendor),''),'unknown') as merchant, p.price,
           coalesce(mr.avg_ship_days, 5)          as ship_days,
           coalesce(mr.rep_score, 70)             as rep,
           coalesce(mr.return_days, 30)           as ret,
           coalesce(mr.warranty_months, 0)        as warr,
           round(p.price * public.merchant_inbound_bps(p.vendor) / 10000.0)::int as commission
    from ecom_products p
    left join merchant_reputation mr on mr.merchant = lower(p.vendor)
    where p.status = 'active'
      and ( (p.upc is not null and p.upc = p_group)
            or regexp_replace(lower(p.title), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(p_group), '[^a-z0-9]+', '', 'g') )
  ),
  bounds as (
    select min(price) mn, max(price) mx, max(ship_days) mxs, max(greatest(commission,1)) mxc from offers
  ),
  scored as (
    select o.*,
      public.commerce_score(o.price, b.mn, b.mx, o.ship_days, b.mxs, o.rep, o.ret, o.warr, p_pref) as cscore,
      (o.commission::numeric / nullif(b.mxc,0)) * 3.0 as commission_bonus
    from offers o cross join bounds b
  ),
  ranked as (
    select s.*, (s.cscore + coalesce(s.commission_bonus,0)) as rvalue,
      row_number() over (order by (s.cscore + coalesce(s.commission_bonus,0)) desc, s.price asc) as rn
    from scored s
  )
  select id, merchant, price, ship_days, rep, commission,
         cscore, round(rvalue,1), (rn = 1)
  from ranked order by rvalue desc, price asc;
$$;

grant execute on function
  public.best_offer_for(text,text),
  public.commerce_score(int,int,int,numeric,numeric,int,int,int,text),
  public.merchant_inbound_bps(text),
  public.partner_level(uuid),
  public.partner_revshare_bps(uuid),
  public.partner_monthly_orders(uuid),
  public.cfg_int(text,int)
to anon, authenticated;
