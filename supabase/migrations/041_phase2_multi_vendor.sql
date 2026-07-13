-- ============================================================
-- Migration 041 — Phase 2: multi-vendor marketplace
-- ============================================================
-- 1. vendor_accounts — seller onboarding with an admin approval
--    workflow and a per-vendor platform commission rate.
-- 2. revenue_splits — per-order-item ledger of gross / vendor share /
--    platform fee, written by fulfill_ecom_order().
-- 3. ecom_products marketplace columns (discovery + engagement).
-- 4. fulfill_ecom_order() v2 — vendor-rate-aware earnings + splits.
-- All statements are idempotent.
-- ============================================================

-- ── 1. vendor_accounts ────────────────────────────────────────────────────────
create table if not exists vendor_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references profiles(id) on delete cascade,
  business_name     text not null,
  business_email    text,
  phone             text,
  country           text,
  description       text,
  logo_url          text,
  payment_provider  text not null default 'PayPal'
                    check (payment_provider in ('PayPal', 'Bank Transfer', 'Mobile Money', 'Stripe', 'Payoneer')),
  payment_details   jsonb not null default '{}',
  commission_rate   numeric(4,3) not null default 0.200
                    check (commission_rate >= 0 and commission_rate <= 0.9),
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  admin_note        text,
  sales_count       integer not null default 0,
  total_sales_cents bigint  not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_vendor_accounts_status on vendor_accounts(status);

alter table vendor_accounts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'vendor_accounts' and policyname = 'vendor_accounts_owner_read'
  ) then
    execute $p$ create policy "vendor_accounts_owner_read" on vendor_accounts for select using (user_id = auth.uid()) $p$;
  end if;
end $$;

-- Approved vendors are publicly visible (storefront "sold by" info)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'vendor_accounts' and policyname = 'vendor_accounts_public_read_approved'
  ) then
    execute $p$ create policy "vendor_accounts_public_read_approved" on vendor_accounts for select using (status = 'approved') $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'vendor_accounts' and policyname = 'vendor_accounts_owner_insert'
  ) then
    execute $p$ create policy "vendor_accounts_owner_insert" on vendor_accounts for insert with check (user_id = auth.uid()) $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'vendor_accounts' and policyname = 'vendor_accounts_owner_update'
  ) then
    execute $p$
      create policy "vendor_accounts_owner_update" on vendor_accounts for update
      using (user_id = auth.uid()) with check (user_id = auth.uid())
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'vendor_accounts' and policyname = 'vendor_accounts_admin_all'
  ) then
    execute $p$
      create policy "vendor_accounts_admin_all" on vendor_accounts for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- Owners may edit their business info but NOT self-approve or change their
-- commission rate / sales counters — those are pinned unless the caller is an
-- admin or the service role (auth.uid() is null).
create or replace function public.protect_vendor_account_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_privileged boolean;
begin
  v_privileged := auth.uid() is null
    or exists (select 1 from admin_roles where admin_roles.user_id = auth.uid());

  if not v_privileged then
    if tg_op = 'INSERT' then
      new.status            := 'pending';
      new.commission_rate   := 0.200;
      new.sales_count       := 0;
      new.total_sales_cents := 0;
      new.admin_note        := null;
    else
      new.status            := old.status;
      new.commission_rate   := old.commission_rate;
      new.sales_count       := old.sales_count;
      new.total_sales_cents := old.total_sales_cents;
      new.admin_note        := old.admin_note;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_protect_vendor_account on vendor_accounts;
create trigger trg_protect_vendor_account
  before insert or update on vendor_accounts
  for each row execute function public.protect_vendor_account_fields();

-- ── 2. revenue_splits ─────────────────────────────────────────────────────────
create table if not exists revenue_splits (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references ecom_orders(id) on delete set null,
  order_item_id  uuid unique references ecom_order_items(id) on delete set null,
  product_id     uuid references ecom_products(id) on delete set null,
  product_title  text,
  vendor_user_id uuid references profiles(id) on delete set null,
  gross_cents    integer not null default 0,
  vendor_cents   integer not null default 0,
  platform_cents integer not null default 0,
  vendor_rate    numeric(4,3) not null default 0.700,   -- vendor's share of gross
  payout_status  text not null default 'pending'
                 check (payout_status in ('pending', 'requested', 'paid')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_revenue_splits_vendor on revenue_splits(vendor_user_id);
create index if not exists idx_revenue_splits_order  on revenue_splits(order_id);

alter table revenue_splits enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'revenue_splits' and policyname = 'revenue_splits_vendor_read'
  ) then
    execute $p$ create policy "revenue_splits_vendor_read" on revenue_splits for select using (vendor_user_id = auth.uid()) $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'revenue_splits' and policyname = 'revenue_splits_admin_all'
  ) then
    execute $p$
      create policy "revenue_splits_admin_all" on revenue_splits for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- ── 3. ecom_products marketplace columns ─────────────────────────────────────
alter table ecom_products
  add column if not exists problem_tags   text[],
  add column if not exists solves_problems text[],
  add column if not exists click_count    bigint  not null default 0,
  add column if not exists cart_count     bigint  not null default 0,
  add column if not exists sort_priority  integer not null default 0;

-- ── 4. fulfill_ecom_order() v2 ────────────────────────────────────────────────
-- Adds: per-item revenue_splits ledger rows, per-vendor commission rates
-- (approved vendor_accounts), and vendor sales counters. Behaviour for
-- creators without a vendor account is unchanged (70% share).
create or replace function public.fulfill_ecom_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order       ecom_orders%rowtype;
  v_item        record;
  v_seller      uuid;
  v_type        text;
  v_rate        numeric;
  v_gross_cents integer;
  v_vendor_cents integer;
  v_granted     integer := 0;
  v_credited    integer := 0;
begin
  select * into v_order from ecom_orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;
  if v_order.fulfillment_status = 'fulfilled' then
    return jsonb_build_object('ok', true, 'reason', 'already_fulfilled');
  end if;
  if v_order.payment_status is distinct from 'paid' then
    return jsonb_build_object('ok', false, 'reason', 'not_paid');
  end if;

  for v_item in
    select oi.id, oi.product_id, oi.title, oi.price, coalesce(oi.quantity, 1) as quantity
    from ecom_order_items oi
    where oi.order_id = p_order_id
  loop
    if v_item.product_id is null then
      continue;
    end if;

    select coalesce(p.vendor_id, p.creator_id), p.product_type
      into v_seller, v_type
      from ecom_products p
      where p.id = v_item.product_id;
    if not found then
      continue;
    end if;

    if v_order.user_id is not null then
      insert into user_library (user_id, product_id, order_id, access_type)
      values (v_order.user_id, v_item.product_id, p_order_id, 'purchase')
      on conflict (user_id, product_id) do nothing;
      v_granted := v_granted + 1;
    end if;

    if v_seller is not null then
      -- Approved vendors use their negotiated commission rate; everyone else
      -- keeps the platform-default 70% creator share.
      select 1 - va.commission_rate into v_rate
        from vendor_accounts va
        where va.user_id = v_seller and va.status = 'approved';
      if v_rate is null then
        v_rate := 0.700;
      end if;

      v_gross_cents  := v_item.price * v_item.quantity;
      v_vendor_cents := round(v_gross_cents * v_rate);

      if v_gross_cents > 0 then
        insert into revenue_splits
          (order_id, order_item_id, product_id, product_title, vendor_user_id,
           gross_cents, vendor_cents, platform_cents, vendor_rate)
        values
          (p_order_id, v_item.id, v_item.product_id, v_item.title, v_seller,
           v_gross_cents, v_vendor_cents, v_gross_cents - v_vendor_cents, v_rate)
        on conflict (order_item_id) do nothing;

        insert into creator_earnings (user_id, category, amount, period, description, paid, order_id)
        values (
          v_seller,
          case when v_type = 'Book' then 'book_sale' else 'product_sale' end,
          round(v_vendor_cents / 100.0, 4),
          to_char(now(), 'YYYY-MM'),
          'Sale: ' || v_item.title,
          false,
          p_order_id
        );
        v_credited := v_credited + 1;

        update vendor_accounts
          set sales_count       = sales_count + v_item.quantity,
              total_sales_cents = total_sales_cents + v_gross_cents
          where user_id = v_seller and status = 'approved';
      end if;
    end if;
  end loop;

  update ecom_orders
    set fulfillment_status = 'fulfilled',
        updated_at         = now()
    where id = p_order_id;

  return jsonb_build_object('ok', true, 'granted', v_granted, 'credited', v_credited);
end;
$$;

revoke all on function public.fulfill_ecom_order(uuid) from public;
revoke all on function public.fulfill_ecom_order(uuid) from anon;
revoke all on function public.fulfill_ecom_order(uuid) from authenticated;
grant execute on function public.fulfill_ecom_order(uuid) to service_role;

-- ── 5. request_vendor_payout() ────────────────────────────────────────────────
-- Atomically converts the caller's pending revenue splits into a
-- creator_withdrawals request. SECURITY DEFINER because vendors have no
-- update rights on revenue_splits (the ledger is otherwise read-only to them).
create or replace function public.request_vendor_payout(
  p_method text default 'PayPal',
  p_phone  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_total  bigint;
  v_method text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;
  if not exists (select 1 from vendor_accounts where user_id = v_user and status = 'approved') then
    return jsonb_build_object('ok', false, 'reason', 'not_approved_vendor');
  end if;

  select coalesce(sum(vendor_cents), 0) into v_total
    from revenue_splits
    where vendor_user_id = v_user and payout_status = 'pending';

  if v_total < 100 then
    return jsonb_build_object('ok', false, 'reason', 'below_minimum', 'amount_cents', v_total);
  end if;

  update revenue_splits
    set payout_status = 'requested'
    where vendor_user_id = v_user and payout_status = 'pending';

  v_method := case
    when p_method in ('PayPal', 'Bank Transfer', 'Mobile Money', 'Stripe', 'Payoneer') then p_method
    else 'PayPal'
  end;

  insert into creator_withdrawals (user_id, amount, method, status, phone, description)
  values (v_user, round(v_total / 100.0, 2), v_method, 'pending', p_phone, 'Marketplace payout request');

  return jsonb_build_object('ok', true, 'amount_cents', v_total);
end;
$$;

revoke all on function public.request_vendor_payout(text, text) from public;
revoke all on function public.request_vendor_payout(text, text) from anon;
grant execute on function public.request_vendor_payout(text, text) to authenticated;
grant execute on function public.request_vendor_payout(text, text) to service_role;
