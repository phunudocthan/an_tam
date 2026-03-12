create table if not exists public.proof_reactions (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  checkin_id uuid not null references public.daily_checkins(id) on delete cascade,
  category text not null check (category in ('study', 'screen_time', 'body')),
  reactor_user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_key text not null check (reaction_key in ('seen', 'nice', 'keep_going', 'still_time')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (checkin_id, category, reactor_user_id)
);

create index if not exists idx_proof_reactions_pair_created
  on public.proof_reactions (pair_id, created_at desc);

create index if not exists idx_proof_reactions_checkin_category
  on public.proof_reactions (checkin_id, category);

alter table public.proof_reactions enable row level security;

drop policy if exists "proof_reactions_select_pair" on public.proof_reactions;
create policy "proof_reactions_select_pair"
on public.proof_reactions
for select
to authenticated
using (pair_id in (select public.current_pair_ids()));

drop policy if exists "proof_reactions_insert_pair_member" on public.proof_reactions;
create policy "proof_reactions_insert_pair_member"
on public.proof_reactions
for insert
to authenticated
with check (
  reactor_user_id = auth.uid()
  and pair_id in (select public.current_pair_ids())
);

drop policy if exists "proof_reactions_delete_self" on public.proof_reactions;
create policy "proof_reactions_delete_self"
on public.proof_reactions
for delete
to authenticated
using (
  reactor_user_id = auth.uid()
  and pair_id in (select public.current_pair_ids())
);
