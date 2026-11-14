-- Manual fixture ranking (shown as a Results tab).
-- Field rounds store their own attempt plan (default 3 + 2 extra).

alter table public.fixture_round
  add column if not exists attempt_count integer not null default 3,
  add column if not exists extra_attempt_count integer not null default 2;

alter table public.fixture_round
  drop constraint if exists fixture_round_attempts_check;

alter table public.fixture_round
  add constraint fixture_round_attempts_check check (
    attempt_count between 1 and 8
    and extra_attempt_count between 0 and 8
  );

update public.fixture_round r
set
  attempt_count = 3,
  extra_attempt_count = 2
from public.fixture f
where f.id = r.fixture_id
  and f.format_type = 'field_attempts'
  and r.deleted_at is null
  and r.round_type in ('qualifying', 'final');

create table if not exists public.fixture_ranking (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixture (id) on delete cascade,
  rank integer not null,
  team_id uuid references public.team (id) on delete restrict,
  athlete_id uuid references public.team_member (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixture_ranking_rank_check check (rank between 1 and 999),
  constraint fixture_ranking_side_check check (
    (team_id is not null and athlete_id is null)
    or (team_id is null and athlete_id is not null)
  )
);

create unique index if not exists fixture_ranking_rank_live_idx
  on public.fixture_ranking (fixture_id, rank)
  where deleted_at is null;

create unique index if not exists fixture_ranking_team_live_idx
  on public.fixture_ranking (fixture_id, team_id)
  where deleted_at is null and team_id is not null;

create unique index if not exists fixture_ranking_athlete_live_idx
  on public.fixture_ranking (fixture_id, athlete_id)
  where deleted_at is null and athlete_id is not null;

create index if not exists fixture_ranking_fixture_id_idx
  on public.fixture_ranking (fixture_id);

drop trigger if exists fixture_ranking_set_updated_at on public.fixture_ranking;
create trigger fixture_ranking_set_updated_at
  before update on public.fixture_ranking
  for each row
  execute function private.set_updated_at();

create or replace function private.fixture_ranking_csc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fixture_csc uuid;
  entry_csc uuid;
begin
  select competition_sport_category_map_id into fixture_csc
  from public.fixture
  where id = new.fixture_id
    and deleted_at is null;

  if fixture_csc is null then
    raise exception 'Fixture was not found.';
  end if;

  if new.team_id is not null then
    select competition_sport_category_map_id into entry_csc
    from public.team
    where id = new.team_id
      and deleted_at is null;
    if entry_csc is null or entry_csc is distinct from fixture_csc then
      raise exception 'Team is not in this championship category.';
    end if;
  end if;

  if new.athlete_id is not null then
    select t.competition_sport_category_map_id into entry_csc
    from public.team_member tm
    join public.team t on t.id = tm.team_id
    where tm.id = new.athlete_id
      and tm.deleted_at is null
      and t.deleted_at is null;
    if entry_csc is null or entry_csc is distinct from fixture_csc then
      raise exception 'Athlete is not in this championship category.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists fixture_ranking_csc on public.fixture_ranking;
create trigger fixture_ranking_csc
  before insert or update of fixture_id, team_id, athlete_id
  on public.fixture_ranking
  for each row
  execute function private.fixture_ranking_csc();

alter table public.fixture_ranking enable row level security;
alter table public.fixture_ranking force row level security;

drop policy if exists fixture_ranking_admin_all on public.fixture_ranking;
create policy fixture_ranking_admin_all on public.fixture_ranking
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.fixture_ranking to authenticated;
