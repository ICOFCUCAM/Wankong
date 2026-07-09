-- 038_arena_drops.sql
-- The Arena Drop — WANKONG's signature weekly ritual.
-- Every week one challenge song drops globally; creators answer within the
-- submission window; fans vote until voting closes; the winner takes the prize
-- pool and automatic distribution. Admins create and manage drops from
-- Admin → Competitions.
--
-- Phase is DERIVED from timestamps (no cron needed):
--   now < drop_at                                  → upcoming
--   drop_at ≤ now < submissions_close_at           → live      (submissions open)
--   submissions_close_at ≤ now < voting_closes_at  → voting
--   voting_closes_at ≤ now                         → closed

create table if not exists arena_drops (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,            -- e.g. 'Midnight Jazz Challenge'
  song_title            text not null,            -- the challenge song
  song_artist           text,
  genre                 text,
  cover_url             text,
  audio_url             text,
  prize_pool_cents      integer not null default 0,
  drop_at               timestamptz not null,
  submissions_close_at  timestamptz not null,
  voting_closes_at      timestamptz not null,
  winner_entry_id       uuid,
  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint arena_drop_window check (drop_at < submissions_close_at
                                  and submissions_close_at < voting_closes_at)
);

create index if not exists idx_arena_drops_voting_close on arena_drops(voting_closes_at desc);

alter table arena_drops enable row level security;

-- Drops are public content — anyone can read the schedule and current drop.
drop policy if exists "arena_drops_public_read" on arena_drops;
create policy "arena_drops_public_read"
  on arena_drops for select using (true);

-- Only admins create/update/delete drops.
drop policy if exists "arena_drops_admin_write" on arena_drops;
create policy "arena_drops_admin_write"
  on arena_drops for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and coalesce(p.role, '') in ('admin', 'super_admin')
    )
  );

-- Link competition entries to the drop they answer.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'competition_entries_v2') then
    alter table competition_entries_v2 add column if not exists drop_id uuid;
    create index if not exists idx_comp_entries_drop on competition_entries_v2(drop_id);
  end if;
end $$;
