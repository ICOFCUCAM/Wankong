-- ============================================================
-- Migration 043 — Phase 4: discovery layer
-- ============================================================
-- 1. ai_recommendations — log of AI problem-solver queries and the
--    products recommended for them (analytics + model tuning).
-- 2. trending_score on ecom_products + refresh_trending_scores() —
--    engagement-weighted ranking refreshed on a schedule
--    (clicks + 3×cart-adds + 10×purchases + streams/20).
-- All statements are idempotent.
-- ============================================================

-- ── 1. ai_recommendations ────────────────────────────────────────────────────
create table if not exists ai_recommendations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references profiles(id) on delete set null,
  user_problem            text not null,
  problem_category        text,
  keywords                text[],
  recommended_product_ids uuid[],
  confidence              numeric(4,3),
  created_at              timestamptz not null default now()
);

create index if not exists idx_ai_recommendations_created on ai_recommendations(created_at);

alter table ai_recommendations enable row level security;

-- Written by the AI solver endpoint (service role); admins can review
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ai_recommendations' and policyname = 'ai_recommendations_admin_all'
  ) then
    execute $p$
      create policy "ai_recommendations_admin_all" on ai_recommendations for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid()))
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ai_recommendations' and policyname = 'ai_recommendations_owner_read'
  ) then
    execute $p$
      create policy "ai_recommendations_owner_read" on ai_recommendations for select
      using (user_id = auth.uid())
    $p$;
  end if;
end $$;

-- ── 2. Trending scores ───────────────────────────────────────────────────────
alter table ecom_products
  add column if not exists trending_score numeric not null default 0;

create index if not exists idx_ecom_products_trending
  on ecom_products(trending_score desc) where status = 'active';

-- Engagement-weighted score. Purchases (revenue_splits) count most, then
-- cart adds, then clicks, with streams as a light long-tail signal. A small
-- recency boost keeps fresh releases visible.
create or replace function public.refresh_trending_scores()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update ecom_products p
  set trending_score =
      coalesce(p.click_count, 0)
    + 3  * coalesce(p.cart_count, 0)
    + 10 * coalesce(s.sales, 0)
    + coalesce(p.stream_count, 0) / 20.0
    + case when p.created_at > now() - interval '14 days' then 5 else 0 end
  from (
    select product_id, count(*) as sales
    from revenue_splits
    where product_id is not null
    group by product_id
  ) s
  where s.product_id = p.id;

  -- Products with no sales still get engagement + recency scoring
  update ecom_products p
  set trending_score =
      coalesce(p.click_count, 0)
    + 3 * coalesce(p.cart_count, 0)
    + coalesce(p.stream_count, 0) / 20.0
    + case when p.created_at > now() - interval '14 days' then 5 else 0 end
  where not exists (
    select 1 from revenue_splits s where s.product_id = p.id
  );

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

revoke all on function public.refresh_trending_scores() from public;
revoke all on function public.refresh_trending_scores() from anon;
revoke all on function public.refresh_trending_scores() from authenticated;
grant execute on function public.refresh_trending_scores() to service_role;
