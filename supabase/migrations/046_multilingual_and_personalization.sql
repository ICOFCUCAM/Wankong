-- ============================================================
-- Migration 046 — Multilingual products + personalized discovery
-- ============================================================
-- 1. product_translations — cache of AI-translated title/description
--    per language, so a translation is generated once and reused.
-- 2. browse_events — lightweight view/engagement log per user.
-- 3. recommend_for_user() — "For You" picks from a user's engaged
--    product types + library, excluding what they already own.
-- All statements are idempotent.
-- ============================================================

-- ── 1. product_translations ───────────────────────────────────────────────────
create table if not exists product_translations (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references ecom_products(id) on delete cascade,
  lang        text not null,
  title       text,
  description text,
  created_at  timestamptz not null default now(),
  unique (product_id, lang)
);

create index if not exists idx_product_translations_lookup on product_translations(product_id, lang);

alter table product_translations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'product_translations' and policyname = 'product_translations_public_read') then
    execute $p$ create policy "product_translations_public_read" on product_translations for select using (true) $p$;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'product_translations' and policyname = 'product_translations_admin_all') then
    execute $p$ create policy "product_translations_admin_all" on product_translations for all
      using (exists (select 1 from admin_roles where admin_roles.user_id = auth.uid())) $p$;
  end if;
end $$;
-- (the translate API writes with the service role, which bypasses RLS)

-- ── 2. browse_events ──────────────────────────────────────────────────────────
create table if not exists browse_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  product_id uuid references ecom_products(id) on delete cascade,
  event      text not null default 'view',
  created_at timestamptz not null default now()
);

create index if not exists idx_browse_events_user on browse_events(user_id, created_at);

alter table browse_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'browse_events' and policyname = 'browse_events_owner_insert') then
    execute $p$ create policy "browse_events_owner_insert" on browse_events for insert with check (user_id = auth.uid()) $p$;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'browse_events' and policyname = 'browse_events_owner_read') then
    execute $p$ create policy "browse_events_owner_read" on browse_events for select using (user_id = auth.uid()) $p$;
  end if;
end $$;

-- ── 3. recommend_for_user() ───────────────────────────────────────────────────
-- Personalized picks: the product types the user has viewed or owns, ranked by
-- trending, excluding items already in their library. Empty for brand-new users
-- (the client then falls back to trending).
create or replace function public.recommend_for_user(p_user_id uuid, p_limit integer default 8)
returns setof ecom_products
language sql
stable
security definer
set search_path = public
as $$
  with prefs as (
    select p.product_type
    from browse_events b join ecom_products p on p.id = b.product_id
    where b.user_id = p_user_id and p.product_type is not null
    union all
    select p.product_type
    from user_library ul join ecom_products p on p.id = ul.product_id
    where ul.user_id = p_user_id and p.product_type is not null
  ),
  top_types as (
    select product_type, count(*) as c
    from prefs group by product_type order by c desc limit 4
  )
  select pr.*
  from ecom_products pr
  where pr.status = 'active'
    and pr.product_type in (select product_type from top_types)
    and not exists (select 1 from user_library ul where ul.user_id = p_user_id and ul.product_id = pr.id)
  order by pr.trending_score desc nulls last, pr.created_at desc
  limit greatest(1, least(p_limit, 24));
$$;

grant execute on function public.recommend_for_user(uuid, integer) to authenticated, service_role;
