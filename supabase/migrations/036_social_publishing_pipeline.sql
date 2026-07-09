-- 036_social_publishing_pipeline.sql
-- Competition video → social publishing pipeline.
--
-- Flow (admin-review-first):
--   1. Creator uploads entry           → competition_entries_v2 (status 'pending_review')
--   2. Admin approves                  → status 'approved'
--   3. Pipeline publishes to WANKONG's official accounts FIRST
--                                      → wankong_published_at + wankong_social_urls
--   4. Then publishes to the creator's connected accounts
--                                      → creator_published_at + creator_social_urls
--   5. Entry becomes visible on the home Talent Arena
--                                      → visible_on_home = true, status 'live'
--
-- Creator account connections live in social_accounts (migration 010).
-- WANKONG's official accounts live in platform_social_accounts (below).

-- ── WANKONG official social accounts (admin-managed, one row per platform) ──────
create table if not exists platform_social_accounts (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null unique,        -- 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'twitter'
  display_name  text,                         -- e.g. '@wankong'
  account_uid   text,                         -- channel / page / user id on the platform
  access_token  text,
  refresh_token text,
  token_expiry  timestamptz,
  scopes        text[],
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table platform_social_accounts enable row level security;

-- Only admins/super_admins may read or manage the official account tokens.
drop policy if exists "platform_social_admin_all" on platform_social_accounts;
create policy "platform_social_admin_all"
  on platform_social_accounts for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and coalesce(p.role, '') in ('admin', 'super_admin')
    )
  );

-- ── Publish-flow columns on competition_entries_v2 ──────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'competition_entries_v2') then

    alter table competition_entries_v2
      add column if not exists wankong_published_at timestamptz,
      add column if not exists wankong_social_urls  jsonb default '{}'::jsonb,
      add column if not exists creator_published_at timestamptz,
      add column if not exists creator_social_urls  jsonb default '{}'::jsonb,
      add column if not exists visible_on_home      boolean not null default false,
      add column if not exists publish_error        text,
      add column if not exists approved_at          timestamptz,
      add column if not exists approved_by          uuid;

    create index if not exists idx_comp_entries_visible_home
      on competition_entries_v2(visible_on_home) where visible_on_home = true;
    create index if not exists idx_comp_entries_status
      on competition_entries_v2(status);
  end if;
end $$;

-- Public can read entries that have gone live on the home page.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'competition_entries_v2') then
    execute 'alter table competition_entries_v2 enable row level security';
    execute 'drop policy if exists "comp_entries_public_live" on competition_entries_v2';
    execute $p$
      create policy "comp_entries_public_live"
        on competition_entries_v2 for select
        using (visible_on_home = true)
    $p$;
  end if;
end $$;
