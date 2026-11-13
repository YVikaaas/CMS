-- Gameplay fixtures: one draw per championship category (CSC).
-- Formats: league + bracket, or bracket elimination only.

create type public.fixture_format_type as enum (
  'league_knockout',
  'bracket_elimination'
);

create type public.fixture_status as enum (
  'draft',
  'published',
  'in_progress',
  'completed'
);

create type public.fixture_match_status as enum (
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

create type public.fixture_participant_result as enum (
  'winner',
  'loser',
  'draw',
  'dns',
  'dnf',
  'dq',
  'bye',
  'pending',
  'no_show',
  'qualified'
);

create table public.fixture (
  id uuid primary key default gen_random_uuid(),
  competition_sport_category_map_id uuid not null
    references public.competition_sport_category_map (id) on delete restrict,
  format_type public.fixture_format_type not null,
  config jsonb not null default '{}'::jsonb,
  status public.fixture_status not null default 'draft',
  start_date date,
  end_date date,
  created_by uuid references public.users (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index fixture_csc_live_idx
  on public.fixture (competition_sport_category_map_id)
  where deleted_at is null;

create index fixture_csc_id_idx
  on public.fixture (competition_sport_category_map_id);

create trigger fixture_set_updated_at
  before update on public.fixture
  for each row
  execute function private.set_updated_at();

create table public.fixture_round (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixture (id) on delete cascade,
  round_type text not null,
  round_number integer not null,
  round_label text not null,
  status public.fixture_match_status not null default 'draft',
  event_date date,
  event_time time,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixture_round_type_check check (
    round_type in (
      'league',
      'quarter_final',
      'semi_final',
      'final',
      'third_place'
    )
  )
);

create unique index fixture_round_type_live_idx
  on public.fixture_round (fixture_id, round_type)
  where deleted_at is null;

create index fixture_round_fixture_id_idx on public.fixture_round (fixture_id);

create trigger fixture_round_set_updated_at
  before update on public.fixture_round
  for each row
  execute function private.set_updated_at();

create table public.fixture_match (
  id uuid primary key default gen_random_uuid(),
  fixture_round_id uuid not null
    references public.fixture_round (id) on delete cascade,
  match_number integer not null,
  match_label text not null,
  venue text,
  scheduled_at timestamptz,
  status public.fixture_match_status not null default 'draft',
  is_ready boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index fixture_match_number_live_idx
  on public.fixture_match (fixture_round_id, match_number)
  where deleted_at is null;

create index fixture_match_round_id_idx on public.fixture_match (fixture_round_id);

create trigger fixture_match_set_updated_at
  before update on public.fixture_match
  for each row
  execute function private.set_updated_at();

create table public.fixture_match_participant (
  id uuid primary key default gen_random_uuid(),
  fixture_match_id uuid not null
    references public.fixture_match (id) on delete cascade,
  team_id uuid references public.team (id) on delete restrict,
  athlete_id uuid,
  participant_label text not null,
  score text not null default '',
  score_detail jsonb not null default '{}'::jsonb,
  result_status public.fixture_participant_result not null default 'pending',
  position integer,
  attempts jsonb not null default '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixture_match_participant_label_check
    check (participant_label in ('1', '2')),
  constraint fixture_match_participant_side_check check (
    (team_id is not null and athlete_id is null)
    or (team_id is null and athlete_id is not null)
  )
);

create unique index fixture_match_participant_label_live_idx
  on public.fixture_match_participant (fixture_match_id, participant_label)
  where deleted_at is null;

create unique index fixture_match_participant_team_live_idx
  on public.fixture_match_participant (fixture_match_id, team_id)
  where deleted_at is null and team_id is not null;

create index fixture_match_participant_match_id_idx
  on public.fixture_match_participant (fixture_match_id);

create trigger fixture_match_participant_set_updated_at
  before update on public.fixture_match_participant
  for each row
  execute function private.set_updated_at();

create or replace function private.fixture_require_live_csc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  csc_deleted timestamptz;
begin
  select deleted_at into csc_deleted
  from public.competition_sport_category_map
  where id = new.competition_sport_category_map_id;

  if not found or csc_deleted is not null then
    raise exception 'Championship category was not found.';
  end if;
  return new;
end;
$$;

create trigger fixture_require_live_csc
  before insert or update of competition_sport_category_map_id
  on public.fixture
  for each row
  execute function private.fixture_require_live_csc();

create or replace function private.fixture_validate_config()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rounds jsonb;
  has_league boolean;
  knockout_count integer;
begin
  new.config := coalesce(new.config, '{}'::jsonb);
  new.config := jsonb_set(new.config, '{scoring_style}', '"simple"'::jsonb, true);
  new.config := jsonb_set(new.config, '{participants_per_match}', '2'::jsonb, true);

  rounds := coalesce(new.config->'active_rounds', '[]'::jsonb);
  if jsonb_typeof(rounds) <> 'array' or jsonb_array_length(rounds) = 0 then
    raise exception 'Pick at least one round.';
  end if;

  has_league := rounds @> '"league"'::jsonb;
  select count(*) into knockout_count
  from jsonb_array_elements_text(rounds) as round_type
  where round_type in ('quarter_final', 'semi_final', 'final', 'third_place');

  if new.format_type = 'league_knockout'::public.fixture_format_type then
    if not has_league or knockout_count < 1 then
      raise exception 'League + bracket needs a league round and at least one knockout round.';
    end if;
  else
    if has_league then
      raise exception 'Bracket elimination cannot include a league round.';
    end if;
    if knockout_count < 1 then
      raise exception 'Pick at least one knockout round.';
    end if;
  end if;

  return new;
end;
$$;

create trigger fixture_validate_config
  before insert or update of format_type, config
  on public.fixture
  for each row
  execute function private.fixture_validate_config();

create or replace function private.fixture_participant_team_csc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_csc uuid;
  team_deleted timestamptz;
  fixture_csc uuid;
begin
  if new.team_id is null then
    return new;
  end if;

  select competition_sport_category_map_id, deleted_at
    into team_csc, team_deleted
  from public.team
  where id = new.team_id;

  if not found or team_deleted is not null then
    raise exception 'Team was not found.';
  end if;

  select f.competition_sport_category_map_id into fixture_csc
  from public.fixture_match m
  join public.fixture_round r on r.id = m.fixture_round_id
  join public.fixture f on f.id = r.fixture_id
  where m.id = new.fixture_match_id;

  if fixture_csc is null or fixture_csc is distinct from team_csc then
    raise exception 'Team is not in this championship category.';
  end if;

  return new;
end;
$$;

create trigger fixture_participant_team_csc
  before insert or update of team_id, fixture_match_id
  on public.fixture_match_participant
  for each row
  execute function private.fixture_participant_team_csc();

alter table public.fixture enable row level security;
alter table public.fixture force row level security;
alter table public.fixture_round enable row level security;
alter table public.fixture_round force row level security;
alter table public.fixture_match enable row level security;
alter table public.fixture_match force row level security;
alter table public.fixture_match_participant enable row level security;
alter table public.fixture_match_participant force row level security;

create policy fixture_admin_all on public.fixture
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy fixture_round_admin_all on public.fixture_round
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy fixture_match_admin_all on public.fixture_match
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy fixture_match_participant_admin_all on public.fixture_match_participant
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.fixture to authenticated;
grant select, insert, update, delete on public.fixture_round to authenticated;
grant select, insert, update, delete on public.fixture_match to authenticated;
grant select, insert, update, delete on public.fixture_match_participant to authenticated;
