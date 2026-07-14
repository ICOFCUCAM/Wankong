-- Phase 2: commission-rule engine (percentage / flat / volume-tiered),
-- payout linkage (conversions lock to a payout), refund reversal.
-- Full DDL + RPCs applied via Supabase migration 051.
alter table affiliate_partners
  add column if not exists commission_type text not null default 'percentage'
    check (commission_type in ('percentage','flat')),
  add column if not exists flat_cents integer not null default 0;
create table if not exists commission_tiers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references affiliate_partners(id) on delete cascade,
  min_sales_cents integer not null default 0, bps integer not null,
  created_at timestamptz default now(), unique (partner_id, min_sales_cents)
);
alter table partner_conversions add column if not exists payout_id uuid references partner_payouts(id) on delete set null;
-- RPCs: partner_rate, commission_for, record_partner_conversion (v2),
-- record_conversion_by_promo (v2), reverse_conversion, partner_balance (v2),
-- request_payout (v2, payout_id linkage), list_payouts, set_payout_status,
-- set_partner_commission — see applied migration in Supabase.
