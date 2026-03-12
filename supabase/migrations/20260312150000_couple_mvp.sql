create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  focus_mode text check (focus_mode in ('gain', 'cut')),
  setup_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pair_members (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (pair_id, user_id),
  unique (user_id)
);

create table if not exists public.goal_configs (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('study', 'screen_time', 'body')),
  title text not null,
  target_value integer,
  unit text,
  proof_required boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, category)
);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  submitted_at timestamptz,
  personal_day_status text not null default 'draft' check (personal_day_status in ('draft', 'pass', 'fail')),
  study_minutes integer,
  study_note text,
  study_proof_path text,
  study_proof_expires_at timestamptz,
  study_had_proof boolean not null default false,
  study_status text not null default 'pending' check (study_status in ('pending', 'pass', 'fail', 'na')),
  screen_time_minutes integer,
  screen_time_note text,
  screen_time_proof_path text,
  screen_time_proof_expires_at timestamptz,
  screen_time_had_proof boolean not null default false,
  screen_time_status text not null default 'pending' check (screen_time_status in ('pending', 'pass', 'fail', 'na')),
  body_completed boolean not null default false,
  body_note text,
  body_proof_path text,
  body_proof_expires_at timestamptz,
  body_had_proof boolean not null default false,
  body_status text not null default 'pending' check (body_status in ('pending', 'pass', 'fail', 'na')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, entry_date)
);

create table if not exists public.weekly_pacts (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  week_start date not null,
  template_key text not null,
  title text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (pair_id, week_start)
);

create table if not exists public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  review_type text not null check (review_type in ('daily_rule', 'weekly_ai')),
  period_start date not null,
  period_end date not null,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  unique (pair_id, review_type, period_start, period_end)
);

create index if not exists idx_pair_members_user_id on public.pair_members (user_id);
create index if not exists idx_goal_configs_pair_user on public.goal_configs (pair_id, user_id);
create index if not exists idx_daily_checkins_pair_date on public.daily_checkins (pair_id, entry_date desc);
create index if not exists idx_daily_checkins_user_date on public.daily_checkins (user_id, entry_date desc);
create index if not exists idx_ai_reviews_pair_period on public.ai_reviews (pair_id, period_start desc);

drop trigger if exists pairs_set_updated_at on public.pairs;
create trigger pairs_set_updated_at
before update on public.pairs
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists goal_configs_set_updated_at on public.goal_configs;
create trigger goal_configs_set_updated_at
before update on public.goal_configs
for each row execute function public.set_updated_at();

drop trigger if exists daily_checkins_set_updated_at on public.daily_checkins;
create trigger daily_checkins_set_updated_at
before update on public.daily_checkins
for each row execute function public.set_updated_at();

drop trigger if exists weekly_pacts_set_updated_at on public.weekly_pacts;
create trigger weekly_pacts_set_updated_at
before update on public.weekly_pacts
for each row execute function public.set_updated_at();

create or replace function public.current_pair_ids()
returns setof uuid
language sql
stable
as $$
  select pair_id
  from public.pair_members
  where user_id = auth.uid()
$$;

alter table public.pairs enable row level security;
alter table public.profiles enable row level security;
alter table public.pair_members enable row level security;
alter table public.goal_configs enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.weekly_pacts enable row level security;
alter table public.ai_reviews enable row level security;

drop policy if exists "pairs_select_member" on public.pairs;
create policy "pairs_select_member"
on public.pairs
for select
to authenticated
using (id in (select public.current_pair_ids()));

drop policy if exists "pairs_update_member" on public.pairs;
create policy "pairs_update_member"
on public.pairs
for update
to authenticated
using (id in (select public.current_pair_ids()))
with check (id in (select public.current_pair_ids()));

drop policy if exists "profiles_select_pair" on public.profiles;
create policy "profiles_select_pair"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.pair_members viewer
    join public.pair_members subject on subject.pair_id = viewer.pair_id
    where viewer.user_id = auth.uid() and subject.user_id = profiles.id
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "pair_members_select_pair" on public.pair_members;
create policy "pair_members_select_pair"
on public.pair_members
for select
to authenticated
using (pair_id in (select public.current_pair_ids()));

drop policy if exists "goal_configs_select_pair" on public.goal_configs;
create policy "goal_configs_select_pair"
on public.goal_configs
for select
to authenticated
using (pair_id in (select public.current_pair_ids()));

drop policy if exists "goal_configs_insert_self" on public.goal_configs;
create policy "goal_configs_insert_self"
on public.goal_configs
for insert
to authenticated
with check (user_id = auth.uid() and pair_id in (select public.current_pair_ids()));

drop policy if exists "goal_configs_update_self" on public.goal_configs;
create policy "goal_configs_update_self"
on public.goal_configs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and pair_id in (select public.current_pair_ids()));

drop policy if exists "daily_checkins_select_pair" on public.daily_checkins;
create policy "daily_checkins_select_pair"
on public.daily_checkins
for select
to authenticated
using (pair_id in (select public.current_pair_ids()));

drop policy if exists "daily_checkins_insert_self" on public.daily_checkins;
create policy "daily_checkins_insert_self"
on public.daily_checkins
for insert
to authenticated
with check (user_id = auth.uid() and pair_id in (select public.current_pair_ids()));

drop policy if exists "daily_checkins_update_self" on public.daily_checkins;
create policy "daily_checkins_update_self"
on public.daily_checkins
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and pair_id in (select public.current_pair_ids()));

drop policy if exists "weekly_pacts_select_pair" on public.weekly_pacts;
create policy "weekly_pacts_select_pair"
on public.weekly_pacts
for select
to authenticated
using (pair_id in (select public.current_pair_ids()));

drop policy if exists "weekly_pacts_insert_pair" on public.weekly_pacts;
create policy "weekly_pacts_insert_pair"
on public.weekly_pacts
for insert
to authenticated
with check (pair_id in (select public.current_pair_ids()));

drop policy if exists "weekly_pacts_update_pair" on public.weekly_pacts;
create policy "weekly_pacts_update_pair"
on public.weekly_pacts
for update
to authenticated
using (pair_id in (select public.current_pair_ids()))
with check (pair_id in (select public.current_pair_ids()));

drop policy if exists "ai_reviews_select_pair" on public.ai_reviews;
create policy "ai_reviews_select_pair"
on public.ai_reviews
for select
to authenticated
using (pair_id in (select public.current_pair_ids()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
