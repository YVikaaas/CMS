-- Restore category (no code column) and team CSC mapping.
-- Drop the short-lived team_csm_map path.

drop trigger if exists team_csm_enforce_sport on public.team_csm_map;
drop trigger if exists team_csm_map_set_updated_at on public.team_csm_map;
drop table if exists public.team_csm_map;
drop function if exists private.enforce_team_csm_sport();

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'gender'
  ) then
    create type public.gender as enum ('male', 'female');
  end if;
end
$$;

create table if not exists public.category (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sport (id) on delete restrict,
  name text not null,
  gender public.gender not null,
  age_group text not null,
  age_min integer not null default 4,
  age_max integer not null,
  team_size integer not null default 1,
  max_team_size integer not null default 1,
  fixture_config jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists category_sport_id_idx on public.category (sport_id);
create unique index if not exists category_sport_gender_age_live_idx
  on public.category (sport_id, gender, age_group)
  where deleted_at is null;

drop trigger if exists category_set_updated_at on public.category;
create trigger category_set_updated_at
  before update on public.category
  for each row
  execute function private.set_updated_at();

create table if not exists public.competition_sport_category_map (
  id uuid primary key default gen_random_uuid(),
  competition_sport_id uuid not null
    references public.competition_sport_map (id) on delete cascade,
  category_id uuid not null references public.category (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competition_sport_category_map_csm_idx
  on public.competition_sport_category_map (competition_sport_id);
create index if not exists competition_sport_category_map_category_id_idx
  on public.competition_sport_category_map (category_id);
create unique index if not exists competition_sport_category_map_live_idx
  on public.competition_sport_category_map (competition_sport_id, category_id)
  where deleted_at is null;

drop trigger if exists competition_sport_category_map_set_updated_at
  on public.competition_sport_category_map;
create trigger competition_sport_category_map_set_updated_at
  before update on public.competition_sport_category_map
  for each row
  execute function private.set_updated_at();

create or replace function private.enforce_csc_sport()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  csm_sport uuid;
  cat_sport uuid;
begin
  select sport_id into csm_sport
  from public.competition_sport_map
  where id = new.competition_sport_id;

  select sport_id into cat_sport
  from public.category
  where id = new.category_id;

  if csm_sport is distinct from cat_sport then
    raise exception 'Category sport must match the championship sport offering';
  end if;

  return new;
end;
$$;

drop trigger if exists csc_enforce_sport on public.competition_sport_category_map;
create trigger csc_enforce_sport
  before insert or update on public.competition_sport_category_map
  for each row
  execute function private.enforce_csc_sport();

create table if not exists public.team_csc_map (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team (id) on delete cascade,
  competition_sport_category_map_id uuid not null
    references public.competition_sport_category_map (id) on delete cascade,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_csc_map_team_id_idx on public.team_csc_map (team_id);
create index if not exists team_csc_map_csc_id_idx
  on public.team_csc_map (competition_sport_category_map_id);
create unique index if not exists team_csc_map_live_idx
  on public.team_csc_map (team_id, competition_sport_category_map_id)
  where deleted_at is null;

drop trigger if exists team_csc_map_set_updated_at on public.team_csc_map;
create trigger team_csc_map_set_updated_at
  before update on public.team_csc_map
  for each row
  execute function private.set_updated_at();

create or replace function private.enforce_team_csc_sport()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_sport uuid;
  csc_sport uuid;
begin
  select sport_id into team_sport
  from public.team
  where id = new.team_id;

  select csm.sport_id into csc_sport
  from public.competition_sport_category_map csc
  join public.competition_sport_map csm on csm.id = csc.competition_sport_id
  where csc.id = new.competition_sport_category_map_id;

  if team_sport is distinct from csc_sport then
    raise exception 'Team sport must match the championship sport category';
  end if;

  return new;
end;
$$;

drop trigger if exists team_csc_enforce_sport on public.team_csc_map;
create trigger team_csc_enforce_sport
  before insert or update on public.team_csc_map
  for each row
  execute function private.enforce_team_csc_sport();

alter table public.category enable row level security;
alter table public.category force row level security;
alter table public.competition_sport_category_map enable row level security;
alter table public.competition_sport_category_map force row level security;
alter table public.team_csc_map enable row level security;
alter table public.team_csc_map force row level security;

drop policy if exists category_admin_all on public.category;
create policy category_admin_all on public.category
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists csc_admin_all on public.competition_sport_category_map;
create policy csc_admin_all on public.competition_sport_category_map
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists team_csc_admin_all on public.team_csc_map;
create policy team_csc_admin_all on public.team_csc_map
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.category to authenticated;
grant select, insert, update, delete on public.competition_sport_category_map to authenticated;
grant select, insert, update, delete on public.team_csc_map to authenticated;

insert into public.category (
  sport_id, name, gender, age_group, age_min, age_max,
  team_size, max_team_size, fixture_config
)
select
  s.id,
  'Basketball',
  v.gender,
  v.age_group,
  4,
  v.age_max,
  5,
  v.max_team_size,
  jsonb_build_object(
    'format', 'league_knockout',
    'scoring_style', 'simple',
    'available_rounds', jsonb_build_array(
      'league', 'quarter_final', 'semi_final', 'final', 'third_place'
    ),
    'participants_per_match', 2
  )
from public.sport s
cross join (
  values
    ('male'::public.gender, 'U11', 10, 6),
    ('female'::public.gender, 'U11', 10, 6),
    ('male'::public.gender, 'U14', 13, 6),
    ('female'::public.gender, 'U14', 13, 6),
    ('male'::public.gender, 'U16', 15, 6),
    ('female'::public.gender, 'U16', 15, 6),
    ('male'::public.gender, 'U17', 16, 15),
    ('female'::public.gender, 'U17', 16, 15),
    ('male'::public.gender, 'U18', 17, 6),
    ('female'::public.gender, 'U18', 17, 6),
    ('male'::public.gender, 'U19', 18, 15),
    ('female'::public.gender, 'U19', 18, 15)
) as v(gender, age_group, age_max, max_team_size)
where s.code = 'BKB' and s.deleted_at is null
  and not exists (
    select 1
    from public.category c
    where c.sport_id = s.id
      and c.gender = v.gender
      and c.age_group = v.age_group
      and c.deleted_at is null
  );
