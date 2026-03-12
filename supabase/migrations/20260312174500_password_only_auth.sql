alter table public.pairs
  drop constraint if exists pairs_created_by_fkey;

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.pair_members
  drop constraint if exists pair_members_user_id_fkey;

alter table public.goal_configs
  drop constraint if exists goal_configs_user_id_fkey;

alter table public.daily_checkins
  drop constraint if exists daily_checkins_user_id_fkey;

alter table public.weekly_pacts
  drop constraint if exists weekly_pacts_created_by_fkey;

do $$
declare
  pair_uuid uuid;
  old_member_one uuid;
  old_member_two uuid;
  new_member_one constant uuid := '5c43233c-ae17-ce7a-b58d-819462aa5a6c';
  new_member_two constant uuid := '17807450-a9d1-b9d7-4f6b-2acb6811d69c';
begin
  select id
  into pair_uuid
  from public.pairs
  order by created_at asc
  limit 1;

  if pair_uuid is null then
    return;
  end if;

  select user_id
  into old_member_one
  from public.pair_members
  where pair_id = pair_uuid
  order by created_at asc, user_id asc
  limit 1;

  select user_id
  into old_member_two
  from public.pair_members
  where pair_id = pair_uuid
  order by created_at asc, user_id asc
  offset 1
  limit 1;

  if old_member_one is not null and old_member_one <> new_member_one then
    delete from public.goal_configs where user_id = new_member_one;
    delete from public.daily_checkins where user_id = new_member_one;
    delete from public.pair_members where user_id = new_member_one;
    delete from public.profiles where id = new_member_one and setup_completed = false;

    update public.weekly_pacts
    set created_by = new_member_one
    where created_by = old_member_one;

    update public.pairs
    set created_by = new_member_one
    where created_by = old_member_one;

    update public.goal_configs
    set user_id = new_member_one
    where user_id = old_member_one;

    update public.daily_checkins
    set user_id = new_member_one
    where user_id = old_member_one;

    update public.pair_members
    set user_id = new_member_one
    where user_id = old_member_one;

    update public.profiles
    set id = new_member_one
    where id = old_member_one;
  end if;

  if old_member_two is not null and old_member_two <> new_member_two then
    delete from public.goal_configs where user_id = new_member_two;
    delete from public.daily_checkins where user_id = new_member_two;
    delete from public.pair_members where user_id = new_member_two;
    delete from public.profiles where id = new_member_two and setup_completed = false;

    update public.weekly_pacts
    set created_by = new_member_two
    where created_by = old_member_two;

    update public.pairs
    set created_by = new_member_two
    where created_by = old_member_two;

    update public.goal_configs
    set user_id = new_member_two
    where user_id = old_member_two;

    update public.daily_checkins
    set user_id = new_member_two
    where user_id = old_member_two;

    update public.pair_members
    set user_id = new_member_two
    where user_id = old_member_two;

    update public.profiles
    set id = new_member_two
    where id = old_member_two;
  end if;
end
$$;
