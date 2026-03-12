create table if not exists public.body_checkpoint_entries (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  checkin_id uuid not null references public.daily_checkins(id) on delete cascade,
  checkpoint_index integer not null check (checkpoint_index >= 1 and checkpoint_index <= 6),
  completed boolean not null default false,
  note text,
  proof_path text,
  proof_expires_at timestamptz,
  had_proof boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (checkin_id, checkpoint_index)
);

create index if not exists idx_body_checkpoint_entries_pair_checkin
  on public.body_checkpoint_entries (pair_id, checkin_id);

create index if not exists idx_body_checkpoint_entries_checkin_idx
  on public.body_checkpoint_entries (checkin_id, checkpoint_index);

drop trigger if exists body_checkpoint_entries_set_updated_at on public.body_checkpoint_entries;
create trigger body_checkpoint_entries_set_updated_at
before update on public.body_checkpoint_entries
for each row execute function public.set_updated_at();

alter table public.body_checkpoint_entries enable row level security;

drop policy if exists "body_checkpoint_entries_select_pair" on public.body_checkpoint_entries;
create policy "body_checkpoint_entries_select_pair"
on public.body_checkpoint_entries
for select
to authenticated
using (pair_id in (select public.current_pair_ids()));

drop policy if exists "body_checkpoint_entries_insert_self" on public.body_checkpoint_entries;
create policy "body_checkpoint_entries_insert_self"
on public.body_checkpoint_entries
for insert
to authenticated
with check (
  pair_id in (select public.current_pair_ids())
  and exists (
    select 1
    from public.daily_checkins
    where daily_checkins.id = body_checkpoint_entries.checkin_id
      and daily_checkins.user_id = auth.uid()
  )
);

drop policy if exists "body_checkpoint_entries_update_self" on public.body_checkpoint_entries;
create policy "body_checkpoint_entries_update_self"
on public.body_checkpoint_entries
for update
to authenticated
using (
  pair_id in (select public.current_pair_ids())
  and exists (
    select 1
    from public.daily_checkins
    where daily_checkins.id = body_checkpoint_entries.checkin_id
      and daily_checkins.user_id = auth.uid()
  )
)
with check (
  pair_id in (select public.current_pair_ids())
  and exists (
    select 1
    from public.daily_checkins
    where daily_checkins.id = body_checkpoint_entries.checkin_id
      and daily_checkins.user_id = auth.uid()
  )
);

alter table public.weekly_pacts
  add column if not exists updated_by uuid;

update public.weekly_pacts
set updated_by = coalesce(updated_by, created_by)
where updated_by is null;

alter table public.proof_reactions
  add column if not exists checkpoint_index integer check (checkpoint_index is null or (checkpoint_index >= 1 and checkpoint_index <= 6));

alter table public.proof_reactions
  drop constraint if exists proof_reactions_checkin_id_category_reactor_user_id_key;

create unique index if not exists idx_proof_reactions_unique_no_checkpoint
  on public.proof_reactions (checkin_id, category, reactor_user_id)
  where checkpoint_index is null;

create unique index if not exists idx_proof_reactions_unique_checkpoint
  on public.proof_reactions (checkin_id, category, checkpoint_index, reactor_user_id)
  where checkpoint_index is not null;

create index if not exists idx_proof_reactions_checkin_category_checkpoint
  on public.proof_reactions (checkin_id, category, checkpoint_index);
