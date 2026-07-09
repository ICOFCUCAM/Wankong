-- 039_bloodstream_realtime.sql
-- THE PULSE phase 2 (bloodstream): the homepage listens for live platform
-- events. Ensure the source tables are in the realtime publication.
-- Guarded so re-runs and already-added tables are no-ops.

do $$
declare t text;
begin
  foreach t in array array['ecom_products', 'competition_entries_v2', 'arena_drops'] loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t)
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime'
                         and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
