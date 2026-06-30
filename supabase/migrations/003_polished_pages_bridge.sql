-- ============================================================
-- WANKONG — Polished Pages publishing bridge
-- ============================================================
-- Lets the "Polished Pages" app publish a finished document straight into the
-- Wankong store as a book (ecom_products row, product_type = 'Book'), tied to
-- the author's existing Wankong account (matched by email). The actual write is
-- performed server-to-server by the `wankong-publish-book` edge function using
-- the service role, authenticated with a shared bridge secret.

-- ── ecom_products: source-tracking columns ───────────────────
-- ecom_products is provisioned outside the migrations, so guard on its
-- existence to keep fresh-clone migration runs from failing.
do $$
begin
  if to_regclass('public.ecom_products') is not null then
    alter table public.ecom_products add column if not exists source        text;
    alter table public.ecom_products add column if not exists source_doc_id text;
    alter table public.ecom_products add column if not exists seller_id     uuid references auth.users(id) on delete set null;
    alter table public.ecom_products add column if not exists file_url      text;

    -- One product per external document, so re-publishing updates in place
    -- rather than duplicating. NULL source (normal store products) never
    -- conflicts, since NULLs are distinct.
    if not exists (
      select 1 from pg_constraint where conname = 'ecom_products_source_doc_uniq'
    ) then
      alter table public.ecom_products
        add constraint ecom_products_source_doc_uniq unique (source, source_doc_id);
    end if;

    create index if not exists idx_ecom_products_seller_id on public.ecom_products(seller_id);
  end if;
end $$;

-- ── Storage: a public bucket for imported book files & covers ──
insert into storage.buckets (id, name, public)
values ('polished_books', 'polished_books', true)
on conflict (id) do nothing;

-- ── Look up a Wankong account by email ───────────────────────
-- Used by the bridge to enforce "publish only if you own a Wankong account".
-- Reads auth.users, so it runs SECURITY DEFINER and is callable by the
-- service role only.
create or replace function public.wankong_find_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id
  from auth.users
  where lower(email) = lower(btrim(p_email))
  limit 1;
$$;

revoke all on function public.wankong_find_user_by_email(text) from public, anon, authenticated;
grant execute on function public.wankong_find_user_by_email(text) to service_role;
