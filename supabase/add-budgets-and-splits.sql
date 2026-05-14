alter table if exists public.transactions
  add column if not exists split_group_id uuid,
  add column if not exists split_index integer not null default 1,
  add column if not exists split_total integer not null default 1,
  add column if not exists original_amount numeric(14, 0);

create table if not exists public.budget_settings (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  budget_key text not null check (budget_key in ('shared_weekly', 'shared_monthly')),
  amount numeric(14, 0) not null default 0 check (amount >= 0),
  carryover_enabled boolean not null default false,
  carryover_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_group_id, budget_key)
);

drop trigger if exists set_budget_settings_updated_at on public.budget_settings;
create trigger set_budget_settings_updated_at
  before update on public.budget_settings
  for each row execute function public.set_updated_at();

alter table public.budget_settings enable row level security;

drop policy if exists "budget_settings_select_family" on public.budget_settings;
create policy "budget_settings_select_family"
  on public.budget_settings for select
  using (public.is_family_member(family_group_id));

drop policy if exists "budget_settings_insert_family" on public.budget_settings;
create policy "budget_settings_insert_family"
  on public.budget_settings for insert
  with check (public.is_family_member(family_group_id));

drop policy if exists "budget_settings_update_family" on public.budget_settings;
create policy "budget_settings_update_family"
  on public.budget_settings for update
  using (public.is_family_member(family_group_id))
  with check (public.is_family_member(family_group_id));

grant select, insert, update on public.budget_settings to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.budget_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
