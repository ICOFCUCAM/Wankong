-- The last two commission models: recurring (SaaS/AI/VPN — % per renewal) and
-- lead/CPA (insurance/finance — fixed bounty per qualified action, no sale).
-- Full DDL + RPCs applied via Supabase migration 053.
alter table partner_conversions
  add column if not exists event_type text not null default 'sale'
    check (event_type in ('sale','recurring','lead')),
  add column if not exists ref_key text;
create unique index if not exists idx_pconv_refkey
  on partner_conversions (partner_id, ref_key) where ref_key is not null;
create table if not exists lead_bounties (
  event text primary key, payout_cents integer not null, label text,
  updated_at timestamptz default now()
);
-- Seeded: insurance_quote $50, finance_signup $100, demo_request $25.
-- RPCs: record_partner_lead, record_recurring_commission, set_lead_bounty
-- — see applied migration.
