-- Call room: present/absent per match. Solo rows are players. Team rows are
-- the team plus each member. Unset means no live row.

create type public.call_room_mark as enum ('present', 'absent');

create table public.fixture_match_attendance (
  id uuid primary key default gen_random_uuid(),
  fixture_match_id uuid not null
    references public.fixture_match (id) on delete restrict,
  team_id uuid references public.team (id) on delete restrict,
  team_member_id uuid references public.team_member (id) on delete restrict,
  status public.call_room_mark not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint fixture_match_attendance_subject_check check (
    (team_id is not null and team_member_id is null)
    or (team_id is null and team_member_id is not null)
  )
);

create unique index fixture_match_attendance_team_live_idx
  on public.fixture_match_attendance (fixture_match_id, team_id)
  where deleted_at is null and team_id is not null;

create unique index fixture_match_attendance_member_live_idx
  on public.fixture_match_attendance (fixture_match_id, team_member_id)
  where deleted_at is null and team_member_id is not null;

create index fixture_match_attendance_match_id_idx
  on public.fixture_match_attendance (fixture_match_id);

create trigger fixture_match_attendance_set_updated_at
  before update on public.fixture_match_attendance
  for each row
  execute function private.set_updated_at();

create or replace function private.fixture_match_attendance_ok()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_team uuid;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  if not exists (
    select 1
    from public.fixture_match m
    where m.id = new.fixture_match_id
      and m.deleted_at is null
  ) then
    raise exception 'Match was not found.';
  end if;

  if new.team_id is not null and not exists (
    select 1
    from public.fixture_match_participant p
    where p.fixture_match_id = new.fixture_match_id
      and p.team_id = new.team_id
      and p.deleted_at is null
  ) then
    raise exception 'Team is not in this match.';
  end if;

  if new.team_member_id is not null then
    select tm.team_id into member_team
    from public.team_member tm
    where tm.id = new.team_member_id
      and tm.deleted_at is null;

    if member_team is null then
      raise exception 'Player was not found.';
    end if;

    if not exists (
      select 1
      from public.fixture_match_participant p
      where p.fixture_match_id = new.fixture_match_id
        and p.deleted_at is null
        and (p.athlete_id = new.team_member_id or p.team_id = member_team)
    ) then
      raise exception 'Player is not in this match.';
    end if;
  end if;

  return new;
end;
$$;

create trigger fixture_match_attendance_ok
  before insert or update of fixture_match_id, team_id, team_member_id, deleted_at
  on public.fixture_match_attendance
  for each row
  execute function private.fixture_match_attendance_ok();

alter table public.fixture_match_attendance enable row level security;
alter table public.fixture_match_attendance force row level security;

create policy fixture_match_attendance_admin_all on public.fixture_match_attendance
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.fixture_match_attendance to authenticated;
