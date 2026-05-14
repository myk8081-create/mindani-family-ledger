create extension if not exists pgcrypto;

do $$
begin
  create type public.transaction_type as enum ('income', 'expense');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (display_name in ('민다니', '찌미찌미')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null default '민다니 패밀리',
  invite_code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (display_name in ('민다니', '찌미찌미')),
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (family_group_id, user_id),
  unique (user_id),
  unique (family_group_id, display_name)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  type public.transaction_type not null,
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists categories_family_root_name_key
  on public.categories(family_group_id, type, name)
  where parent_id is null and deleted_at is null;

create unique index if not exists categories_family_child_name_key
  on public.categories(family_group_id, parent_id, name)
  where parent_id is not null and deleted_at is null;

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists payment_methods_family_name_key
  on public.payment_methods(family_group_id, name)
  where deleted_at is null;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  type public.transaction_type not null,
  transaction_date date not null,
  amount numeric(14, 0) not null check (amount > 0),
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  author_name text not null check (author_name in ('민다니', '찌미찌미')),
  memo text,
  is_fixed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists transactions_family_date_idx
  on public.transactions(family_group_id, transaction_date desc, created_at desc)
  where deleted_at is null;

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  recurring_label text not null check (recurring_label in ('월세', '통신비', '보험', '구독료', '적금', '기타 고정비')),
  amount numeric(14, 0) not null check (amount > 0),
  day_of_month integer not null check (day_of_month between 1 and 31),
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  author_name text not null check (author_name in ('민다니', '찌미찌미')),
  memo text,
  is_active boolean not null default true,
  last_generated_month text check (last_generated_month is null or last_generated_month ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists recurring_transactions_family_idx
  on public.recurring_transactions(family_group_id, is_active)
  where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_family_groups_updated_at on public.family_groups;
create trigger set_family_groups_updated_at
  before update on public.family_groups
  for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_payment_methods_updated_at on public.payment_methods;
create trigger set_payment_methods_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

drop trigger if exists set_recurring_transactions_updated_at on public.recurring_transactions;
create trigger set_recurring_transactions_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

create or replace function public.is_family_member(target_family_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_group_id = target_family_group_id
      and fm.user_id = auth.uid()
  );
$$;

create or replace function public.shares_family_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.family_members me
      join public.family_members other_member
        on other_member.family_group_id = me.family_group_id
      where me.user_id = auth.uid()
        and other_member.user_id = target_user_id
    );
$$;

create or replace function public.seed_family_defaults(target_family_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cat_parent_id uuid;
begin
  if auth.uid() is not null and not public.is_family_member(target_family_group_id) then
    raise exception 'not a family member';
  end if;

  insert into public.categories (family_group_id, type, name, sort_order, is_default)
  select target_family_group_id, 'expense'::public.transaction_type, item.name, item.sort_order, true
  from (
    values
      ('식비', 10), ('카페', 20), ('교통', 30), ('주거', 40), ('월세', 50),
      ('공과금', 60), ('통신비', 70), ('쇼핑', 80), ('생활용품', 90), ('의료', 100),
      ('문화생활', 110), ('여행', 120), ('고양이', 130), ('저축', 140), ('기타', 150)
  ) as item(name, sort_order)
  on conflict do nothing;

  insert into public.categories (family_group_id, type, name, sort_order, is_default)
  select target_family_group_id, 'income'::public.transaction_type, item.name, item.sort_order, true
  from (
    values ('급여', 10), ('부수입', 20), ('환급', 30), ('기타', 40)
  ) as item(name, sort_order)
  on conflict do nothing;

  select id
    into cat_parent_id
  from public.categories
  where family_group_id = target_family_group_id
    and type = 'expense'
    and name = '고양이'
    and parent_id is null
    and deleted_at is null
  limit 1;

  if cat_parent_id is not null then
    insert into public.categories (family_group_id, type, name, parent_id, sort_order, is_default)
    select target_family_group_id, 'expense'::public.transaction_type, item.name, cat_parent_id, item.sort_order, true
    from (
      values ('사료', 10), ('간식', 20), ('병원', 30), ('모래', 40), ('장난감', 50), ('용품', 60)
    ) as item(name, sort_order)
    on conflict do nothing;
  end if;

  insert into public.payment_methods (family_group_id, name, sort_order, is_default)
  select target_family_group_id, item.name, item.sort_order, true
  from (
    values ('현금', 10), ('체크카드', 20), ('신용카드', 30), ('계좌이체', 40), ('간편결제', 50), ('기타', 60)
  ) as item(name, sort_order)
  on conflict do nothing;
end;
$$;

create or replace function public.claim_default_family_member(member_name text, family_code text default 'MINDANI-FAMILY-2026')
returns table(family_group_id uuid, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
  existing_group_id uuid;
  created_group boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if member_name not in ('민다니', '찌미찌미') then
    raise exception 'invalid family member';
  end if;

  select fm.family_group_id
    into existing_group_id
  from public.family_members fm
  where fm.user_id = auth.uid()
  limit 1;

  if existing_group_id is not null then
    if exists (
      select 1
      from public.family_members fm
      where fm.family_group_id = existing_group_id
        and fm.display_name = member_name
        and fm.user_id <> auth.uid()
    ) then
      raise exception 'family member name already claimed';
    end if;

    update public.family_members
      set display_name = member_name
    where user_id = auth.uid();

    insert into public.profiles (id, display_name)
    values (auth.uid(), member_name)
    on conflict (id) do update
      set display_name = excluded.display_name,
          updated_at = now();

    perform public.seed_family_defaults(existing_group_id);
    return query select existing_group_id, member_name;
    return;
  end if;

  select id
    into target_group_id
  from public.family_groups
  where invite_code = family_code
  limit 1;

  if target_group_id is null then
    insert into public.family_groups (name, invite_code, created_by)
    values ('민다니 패밀리', family_code, auth.uid())
    returning id into target_group_id;
    created_group := true;
  end if;

  if exists (
    select 1
    from public.family_members fm
    where fm.family_group_id = target_group_id
      and fm.display_name = member_name
      and fm.user_id <> auth.uid()
  ) then
    raise exception 'family member name already claimed';
  end if;

  insert into public.profiles (id, display_name)
  values (auth.uid(), member_name)
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  insert into public.family_members (family_group_id, user_id, display_name, role)
  values (target_group_id, auth.uid(), member_name, case when created_group then 'owner' else 'member' end)
  on conflict (user_id) do update
    set family_group_id = excluded.family_group_id,
        display_name = excluded.display_name;

  perform public.seed_family_defaults(target_group_id);
  return query select target_group_id, member_name;
end;
$$;

alter table public.profiles enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_transactions enable row level security;

drop policy if exists "profiles_select_family" on public.profiles;
create policy "profiles_select_family"
  on public.profiles for select
  using (public.shares_family_with(id));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "family_groups_select_member" on public.family_groups;
create policy "family_groups_select_member"
  on public.family_groups for select
  using (public.is_family_member(id));

drop policy if exists "family_groups_update_member" on public.family_groups;
create policy "family_groups_update_member"
  on public.family_groups for update
  using (public.is_family_member(id))
  with check (public.is_family_member(id));

drop policy if exists "family_members_select_family" on public.family_members;
create policy "family_members_select_family"
  on public.family_members for select
  using (user_id = auth.uid() or public.is_family_member(family_group_id));

drop policy if exists "categories_select_family" on public.categories;
create policy "categories_select_family"
  on public.categories for select
  using (public.is_family_member(family_group_id));

drop policy if exists "categories_insert_family" on public.categories;
create policy "categories_insert_family"
  on public.categories for insert
  with check (public.is_family_member(family_group_id));

drop policy if exists "categories_update_family" on public.categories;
create policy "categories_update_family"
  on public.categories for update
  using (public.is_family_member(family_group_id))
  with check (public.is_family_member(family_group_id));

drop policy if exists "payment_methods_select_family" on public.payment_methods;
create policy "payment_methods_select_family"
  on public.payment_methods for select
  using (public.is_family_member(family_group_id));

drop policy if exists "payment_methods_insert_family" on public.payment_methods;
create policy "payment_methods_insert_family"
  on public.payment_methods for insert
  with check (public.is_family_member(family_group_id));

drop policy if exists "payment_methods_update_family" on public.payment_methods;
create policy "payment_methods_update_family"
  on public.payment_methods for update
  using (public.is_family_member(family_group_id))
  with check (public.is_family_member(family_group_id));

drop policy if exists "transactions_select_family" on public.transactions;
create policy "transactions_select_family"
  on public.transactions for select
  using (public.is_family_member(family_group_id));

drop policy if exists "transactions_insert_family" on public.transactions;
create policy "transactions_insert_family"
  on public.transactions for insert
  with check (public.is_family_member(family_group_id) and user_id = auth.uid());

drop policy if exists "transactions_update_family" on public.transactions;
create policy "transactions_update_family"
  on public.transactions for update
  using (public.is_family_member(family_group_id))
  with check (public.is_family_member(family_group_id));

drop policy if exists "recurring_transactions_select_family" on public.recurring_transactions;
create policy "recurring_transactions_select_family"
  on public.recurring_transactions for select
  using (public.is_family_member(family_group_id));

drop policy if exists "recurring_transactions_insert_family" on public.recurring_transactions;
create policy "recurring_transactions_insert_family"
  on public.recurring_transactions for insert
  with check (public.is_family_member(family_group_id) and user_id = auth.uid());

drop policy if exists "recurring_transactions_update_family" on public.recurring_transactions;
create policy "recurring_transactions_update_family"
  on public.recurring_transactions for update
  using (public.is_family_member(family_group_id))
  with check (public.is_family_member(family_group_id));

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, update on public.family_groups to authenticated;
grant select on public.family_members to authenticated;
grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.payment_methods to authenticated;
grant select, insert, update on public.transactions to authenticated;
grant select, insert, update on public.recurring_transactions to authenticated;
grant execute on function public.claim_default_family_member(text, text) to authenticated;
grant execute on function public.seed_family_defaults(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.recurring_transactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.categories;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.payment_methods;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
