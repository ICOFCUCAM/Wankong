-- ============================================================
-- Migration 040 — Phase 1 commerce hardening
-- ============================================================
-- 1. Server-authoritative order fulfillment: fulfill_ecom_order() grants
--    user_library access and credits seller earnings in one idempotent
--    transaction. Callable only by service_role (payment webhooks), so
--    fulfillment no longer depends on the buyer's browser staying open.
-- 2. Widen creator_earnings for general product sales and tie earnings
--    rows to the order that produced them.
-- 3. product_reviews: verified-purchase reviews with rating aggregates
--    maintained on ecom_products (rating_avg / rating_count).
-- All statements are idempotent.
-- ============================================================

-- ── 1. creator_earnings: product_sale category + order traceability ──────────
alter table creator_earnings drop constraint if exists creator_earnings_category_check;
alter table creator_earnings add constraint creator_earnings_category_check
  check (category in (
    'music_stream','book_sale','audiobook_play',
    'competition_win','fan_vote_reward',
    'distribution_royalty','translation_sale',
    'product_sale'
  ));

alter table creator_earnings
  add column if not exists order_id uuid references ecom_orders(id) on delete set null;

create index if not exists idx_creator_earnings_order on creator_earnings(order_id);
create index if not exists idx_ecom_orders_payment_status on ecom_orders(payment_status);

-- ── 2. Server-side fulfillment ────────────────────────────────────────────────
-- Grants library access to the buyer and credits the seller for every item of
-- a PAID order. Safe to call multiple times: the row lock plus the
-- fulfillment_status guard make it idempotent at the order level.
create or replace function public.fulfill_ecom_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order    ecom_orders%rowtype;
  v_item     record;
  v_seller   uuid;
  v_type     text;
  v_gross    numeric;
  v_net      numeric;
  v_granted  integer := 0;
  v_credited integer := 0;
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

    -- Seller keeps 70% of the gross sale (rate parity with EarningsWorker).
    if v_seller is not null then
      v_gross := (v_item.price * v_item.quantity)::numeric / 100.0;
      v_net   := round(v_gross * 0.70, 4);
      if v_net > 0 then
        insert into creator_earnings (user_id, category, amount, period, description, paid, order_id)
        values (
          v_seller,
          case when v_type = 'Book' then 'book_sale' else 'product_sale' end,
          v_net,
          to_char(now(), 'YYYY-MM'),
          'Sale: ' || v_item.title,
          false,
          p_order_id
        );
        v_credited := v_credited + 1;
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

-- Only payment webhooks (service role) may fulfill orders.
revoke all on function public.fulfill_ecom_order(uuid) from public;
revoke all on function public.fulfill_ecom_order(uuid) from anon;
revoke all on function public.fulfill_ecom_order(uuid) from authenticated;
grant execute on function public.fulfill_ecom_order(uuid) to service_role;

-- ── 3. Product reviews ────────────────────────────────────────────────────────
alter table ecom_products
  add column if not exists rating_avg   numeric(3,2) not null default 0,
  add column if not exists rating_count integer      not null default 0;

create table if not exists product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references ecom_products(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  title      text,
  body       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists idx_product_reviews_product on product_reviews(product_id);
create index if not exists idx_product_reviews_user    on product_reviews(user_id);

alter table product_reviews enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_reviews' and policyname = 'product_reviews_public_read'
  ) then
    execute $p$ create policy "product_reviews_public_read" on product_reviews for select using (true) $p$;
  end if;
end $$;

-- Only verified purchasers (a user_library row for the product) may review.
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_reviews' and policyname = 'product_reviews_purchaser_insert'
  ) then
    execute $p$
      create policy "product_reviews_purchaser_insert" on product_reviews for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from user_library ul
          where ul.user_id = auth.uid()
            and ul.product_id = product_reviews.product_id
        )
      )
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_reviews' and policyname = 'product_reviews_owner_update'
  ) then
    execute $p$
      create policy "product_reviews_owner_update" on product_reviews for update
      using (user_id = auth.uid()) with check (user_id = auth.uid())
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_reviews' and policyname = 'product_reviews_owner_delete'
  ) then
    execute $p$
      create policy "product_reviews_owner_delete" on product_reviews for delete
      using (user_id = auth.uid())
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_reviews' and policyname = 'product_reviews_admin_all'
  ) then
    execute $p$
      create policy "product_reviews_admin_all" on product_reviews for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- Keep rating aggregates on the product row in sync.
-- SECURITY DEFINER because reviewers don't own the product row they update.
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  update ecom_products p
    set rating_avg   = coalesce((select round(avg(r.rating)::numeric, 2) from product_reviews r where r.product_id = v_product), 0),
        rating_count = (select count(*) from product_reviews r where r.product_id = v_product)
    where p.id = v_product;
  return null;
end;
$$;

drop trigger if exists trg_refresh_product_rating on product_reviews;
create trigger trg_refresh_product_rating
  after insert or update or delete on product_reviews
  for each row execute function public.refresh_product_rating();
