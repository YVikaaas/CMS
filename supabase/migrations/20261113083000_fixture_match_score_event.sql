-- Basketball player scoring: each event is 1, 2, or 3 points by a live team member.

create table public.fixture_match_score_event (
  id uuid primary key default gen_random_uuid(),
  fixture_match_id uuid not null
    references public.fixture_match (id) on delete cascade,
  team_id uuid not null references public.team (id) on delete restrict,
  team_member_id uuid not null references public.team_member (id) on delete restrict,
  points smallint not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id) on delete set null,
  constraint fixture_match_score_event_points_check check (points in (1, 2, 3))
);

create index fixture_match_score_event_match_id_idx
  on public.fixture_match_score_event (fixture_match_id)
  where deleted_at is null;

create index fixture_match_score_event_member_id_idx
  on public.fixture_match_score_event (team_member_id)
  where deleted_at is null;

create or replace function private.fixture_score_event_side()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_team uuid;
  member_deleted timestamptz;
  team_deleted timestamptz;
  match_deleted timestamptz;
  side_ok boolean;
begin
  select team_id, deleted_at into member_team, member_deleted
  from public.team_member
  where id = new.team_member_id;

  if not found or member_deleted is not null then
    raise exception 'Player was not found.';
  end if;

  if member_team is distinct from new.team_id then
    raise exception 'Player is not on this team.';
  end if;

  select deleted_at into team_deleted
  from public.team
  where id = new.team_id;

  if not found or team_deleted is not null then
    raise exception 'Team was not found.';
  end if;

  select deleted_at into match_deleted
  from public.fixture_match
  where id = new.fixture_match_id;

  if not found or match_deleted is not null then
    raise exception 'Match was not found.';
  end if;

  select exists (
    select 1
    from public.fixture_match_participant
    where fixture_match_id = new.fixture_match_id
      and team_id = new.team_id
      and deleted_at is null
  ) into side_ok;

  if not side_ok then
    raise exception 'Team is not in this match.';
  end if;

  return new;
end;
$$;

create trigger fixture_score_event_side
  before insert or update of fixture_match_id, team_id, team_member_id
  on public.fixture_match_score_event
  for each row
  execute function private.fixture_score_event_side();

alter table public.fixture_match_score_event enable row level security;
alter table public.fixture_match_score_event force row level security;

create policy fixture_match_score_event_admin_all
  on public.fixture_match_score_event
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.fixture_match_score_event to authenticated;
