-- Partner promo codes (attribution-carrying) + on-demand payout ledger.
-- The discount amount is applied at checkout in the Phase-2 pricing engine;
-- here a code carries ATTRIBUTION (cuts leakage when the click cookie is lost).
-- Full DDL + RPCs applied via Supabase migration 050_partner_promo_and_payouts.

create table if not exists partner_promo_codes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references affiliate_partners(id) on delete cascade,
  code text not null unique,
  discount_bps integer not null default 0,
  max_uses integer, uses integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);
create table if not exists partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references affiliate_partners(id) on delete cascade,
  amount_cents integer not null, method text not null default 'wallet',
  status text not null default 'requested' check (status in ('requested','processing','paid','rejected')),
  note text, created_at timestamptz default now(), paid_at timestamptz
);
-- RLS + RPCs (my_partner_id, create_promo_code, my_promo_codes, apply_promo_code,
-- record_conversion_by_promo, partner_balance, request_payout, my_payouts)
-- — see applied migration in Supabase.
