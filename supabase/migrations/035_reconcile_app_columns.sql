-- ============================================================
-- Migration 035 — Reconcile schema with application code
-- ============================================================
-- Migrations 001–034 were authored across several drafts and drifted from
-- the column names the app actually queries. They also model some tables two
-- ways (002 uses tracks.artist_id / releases.user_id, while 008/012 use
-- creator_id / release_id). This migration:
--   1. Adds the UNION of owner columns so policies from both drafts compile
--      and inserts from either code path succeed.
--   2. Adds the app-expected alias columns the earlier migrations missed.
-- All statements are idempotent.
-- ============================================================

-- ── 1. Union owner columns (002 vs 008/012 drafts) ───────────────────────────
alter table tracks                add column if not exists creator_id uuid references auth.users(id) on delete cascade;
alter table tracks                add column if not exists user_id    uuid;
alter table releases              add column if not exists creator_id uuid references auth.users(id) on delete cascade;
alter table royalty_splits        add column if not exists release_id uuid;
alter table distribution_targets  add column if not exists release_id uuid;
alter table audiobook_chapters    add column if not exists release_id uuid;
alter table competition_entries   add column if not exists creator_id uuid references auth.users(id) on delete cascade;

-- ── 2. App-expected alias / missing columns ──────────────────────────────────
-- distribution_releases: app reads artwork_url (migrations named it cover_url)
alter table distribution_releases add column if not exists artwork_url text;

-- profiles: app references richer profile fields beyond migration 004's set
alter table profiles
  add column if not exists full_name       text,
  add column if not exists username        text,
  add column if not exists role            text,
  add column if not exists genre           text,
  add column if not exists followers_count integer default 0,
  add column if not exists follower_count  integer default 0,
  add column if not exists total_plays     integer default 0,
  add column if not exists total_reads     integer default 0,
  add column if not exists verified        boolean default false,
  add column if not exists label_name      text,
  add column if not exists cover_image     text;

-- tracks: app sometimes reads these directly
alter table tracks
  add column if not exists stream_count bigint default 0,
  add column if not exists cover_url    text,
  add column if not exists artist_name  text;

-- ecom_products: product view counter used by ProductPage
alter table ecom_products add column if not exists view_count bigint default 0;
