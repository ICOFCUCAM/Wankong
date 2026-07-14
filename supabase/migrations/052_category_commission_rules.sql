-- Per-category commission rates (beauty ~20% vs GPUs ~3%), resolved per order
-- line-item, with the partner's own rate as fallback. Seeded from typical
-- industry commission ranges. Full DDL + RPCs applied via Supabase migration 052.
create table if not exists category_commission (
  category text primary key, bps integer not null, label text,
  updated_at timestamptz default now()
);
-- Seeded: electronics 4%, automotive 4%, machinery 4%, fashion 12%,
-- digital 40%, health 20%, home 7%. RPCs: commission_for_order (per line-item),
-- record_partner_conversion (v3), record_conversion_by_promo (v3),
-- set_category_commission — see applied migration.
