-- SmartKong Partner Program (outbound affiliate): external affiliates promote
-- ANY catalog product with a personal tracked link; clicks & conversions are
-- attributed to them and earn commission. Independent of shopper/seller/admin.
-- (Full DDL applied via Supabase migration 049_partner_program.)

create table if not exists affiliate_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  display_name text,
  payout_email text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  default_commission_bps integer not null default 500,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists partner_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references affiliate_partners(id) on delete cascade,
  product_id uuid, target_url text, ip_hash text, country text,
  created_at timestamptz default now()
);
create table if not exists partner_conversions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references affiliate_partners(id) on delete cascade,
  order_id uuid unique references ecom_orders(id) on delete set null,
  amount_cents integer not null default 0,
  commission_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','paid','reversed')),
  created_at timestamptz default now()
);
-- RLS, RPCs (become_affiliate, my_partner, record_partner_click,
-- record_partner_conversion, my_partner_stats, list_partners,
-- set_partner_status) — see applied migration in Supabase.
