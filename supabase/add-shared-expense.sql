alter table if exists public.transactions
  add column if not exists is_shared boolean not null default false;

alter table if exists public.recurring_transactions
  add column if not exists is_shared boolean not null default false;
