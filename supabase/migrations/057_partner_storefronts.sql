-- Migration 057 — Phase 4: persistent per-partner storefronts.
-- A shareable branded shop page (/s/:code) that also drops the partner's
-- attribution cookie, so it doubles as their tracked link.

alter table affiliate_partners
  add column if not exists tagline    text,
  add column if not exists bio        text,
  add column if not exists avatar_url text,
  add column if not exists accent     text,
  add column if not exists storefront_enabled boolean not null default true;

create table if not exists partner_storefront_items (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references affiliate_partners(id) on delete cascade,
  product_id uuid not null references ecom_products(id) on delete cascade,
  sort       integer not null default 0,
  created_at timestamptz default now(),
  unique (partner_id, product_id)
);
create index if not exists idx_storefront_partner on partner_storefront_items (partner_id, sort);

-- Public profile for a storefront (approved partners only).
create or replace function public.public_storefront(p_code text)
returns table (code text, display_name text, tagline text, bio text, avatar_url text, accent text)
language sql stable security definer set search_path to 'public' as $$
  select code, display_name, tagline, bio, avatar_url, accent
  from affiliate_partners
  where code = lower(trim(p_code)) and status = 'approved' and storefront_enabled;
$$;

-- The curated products for a storefront.
create or replace function public.storefront_products(p_code text)
returns table (
  id uuid, title text, handle text, product_type text, genre text, category text,
  description text, price integer, compare_at_price integer, cover_url text, vendor text,
  is_affiliate boolean, affiliate_url text, rating_avg numeric, rating_count integer,
  trending_score numeric, created_at timestamptz
) language sql stable security definer set search_path to 'public' as $$
  select p.id, p.title, p.handle, p.product_type, p.genre, p.category, p.description,
         p.price, p.compare_at_price, p.cover_url, p.vendor, p.is_affiliate, p.affiliate_url,
         p.rating_avg, p.rating_count, p.trending_score, p.created_at
  from partner_storefront_items si
  join affiliate_partners ap on ap.id = si.partner_id
  join ecom_products p on p.id = si.product_id
  where ap.code = lower(trim(p_code)) and ap.status = 'approved' and ap.storefront_enabled
    and p.status = 'active'
  order by si.sort asc, si.created_at desc;
$$;

-- Partner-side editing.
create or replace function public.my_storefront_items()
returns table (item_id uuid, product_id uuid, title text, handle text, price integer, cover_url text, sort integer)
language sql stable security definer set search_path to 'public' as $$
  select si.id, p.id, p.title, p.handle, p.price, p.cover_url, si.sort
  from partner_storefront_items si join ecom_products p on p.id = si.product_id
  where si.partner_id = public.my_partner_id()
  order by si.sort asc, si.created_at desc;
$$;

create or replace function public.add_storefront_item(p_product_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare pid uuid;
begin
  pid := public.my_partner_id();
  if pid is null then raise exception 'not a partner'; end if;
  insert into partner_storefront_items (partner_id, product_id)
  values (pid, p_product_id) on conflict (partner_id, product_id) do nothing;
end; $$;

create or replace function public.remove_storefront_item(p_item_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  delete from partner_storefront_items where id = p_item_id and partner_id = public.my_partner_id();
end; $$;

create or replace function public.update_my_storefront(p_tagline text, p_bio text, p_accent text, p_avatar_url text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare pid uuid;
begin
  pid := public.my_partner_id();
  if pid is null then raise exception 'not a partner'; end if;
  update affiliate_partners set
    tagline    = nullif(trim(coalesce(p_tagline,'')), ''),
    bio        = nullif(trim(coalesce(p_bio,'')), ''),
    accent     = nullif(trim(coalesce(p_accent,'')), ''),
    avatar_url = nullif(trim(coalesce(p_avatar_url,'')), '')
  where id = pid;
end; $$;

grant execute on function
  public.public_storefront(text),
  public.storefront_products(text)
to anon, authenticated;
grant execute on function
  public.my_storefront_items(),
  public.add_storefront_item(uuid),
  public.remove_storefront_item(uuid),
  public.update_my_storefront(text,text,text,text)
to authenticated;
