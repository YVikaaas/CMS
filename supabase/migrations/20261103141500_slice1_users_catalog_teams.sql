-- Slice 1: users + roles, sport/category masters, championships, teams.

create schema if not exists private;

create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('admin');
create type public.sport_event_mode as enum ('team', 'solo', 'both');
create type public.gender as enum ('male', 'female');
create type public.competition_status as enum ('draft', 'active', 'archived');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_lower check (email = lower(email))
);

create unique index users_email_idx on public.users (email);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.users (id) on delete set null,
  unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);
create index user_roles_granted_by_idx on public.user_roles (granted_by);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'::public.app_role
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, lower(coalesce(new.email, '')))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  if new.email is not null and lower(new.email) = 'vikaas4644@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_auth_user();

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Masters
-- ---------------------------------------------------------------------------

create table public.sport (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  event_mode public.sport_event_mode not null default 'team',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sport_code_len check (char_length(code) = 3),
  constraint sport_code_upper check (code = upper(code))
);

create unique index sport_code_live_idx on public.sport (code) where deleted_at is null;

create trigger sport_set_updated_at
  before update on public.sport
  for each row
  execute function private.set_updated_at();

create table public.category (
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

create index category_sport_id_idx on public.category (sport_id);
create unique index category_sport_gender_age_live_idx
  on public.category (sport_id, gender, age_group)
  where deleted_at is null;

create trigger category_set_updated_at
  before update on public.category
  for each row
  execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Championships
-- ---------------------------------------------------------------------------

create table public.competition (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  start_date date,
  end_date date,
  location text,
  status public.competition_status not null default 'active',
  created_by uuid references public.users (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index competition_slug_live_idx on public.competition (slug) where deleted_at is null;
create index competition_created_by_idx on public.competition (created_by);

create trigger competition_set_updated_at
  before update on public.competition
  for each row
  execute function private.set_updated_at();

create table public.competition_sport_map (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competition (id) on delete cascade,
  sport_id uuid not null references public.sport (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index competition_sport_map_competition_id_idx
  on public.competition_sport_map (competition_id);
create index competition_sport_map_sport_id_idx
  on public.competition_sport_map (sport_id);
create unique index competition_sport_map_live_idx
  on public.competition_sport_map (competition_id, sport_id)
  where deleted_at is null;

create trigger competition_sport_map_set_updated_at
  before update on public.competition_sport_map
  for each row
  execute function private.set_updated_at();

create table public.competition_sport_category_map (
  id uuid primary key default gen_random_uuid(),
  competition_sport_id uuid not null
    references public.competition_sport_map (id) on delete cascade,
  category_id uuid not null references public.category (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index competition_sport_category_map_csm_idx
  on public.competition_sport_category_map (competition_sport_id);
create index competition_sport_category_map_category_id_idx
  on public.competition_sport_category_map (category_id);
create unique index competition_sport_category_map_live_idx
  on public.competition_sport_category_map (competition_sport_id, category_id)
  where deleted_at is null;

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

create trigger csc_enforce_sport
  before insert or update on public.competition_sport_category_map
  for each row
  execute function private.enforce_csc_sport();

-- ---------------------------------------------------------------------------
-- Teams (sport-owned) + many CSC mappings
-- ---------------------------------------------------------------------------

create table public.team (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sport (id) on delete restrict,
  name text not null,
  org_name text,
  created_by uuid references public.users (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_sport_id_idx on public.team (sport_id);
create index team_created_by_idx on public.team (created_by);
create unique index team_sport_name_live_idx
  on public.team (sport_id, lower(name))
  where deleted_at is null;

create trigger team_set_updated_at
  before update on public.team
  for each row
  execute function private.set_updated_at();

create table public.team_csc_map (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team (id) on delete cascade,
  competition_sport_category_map_id uuid not null
    references public.competition_sport_category_map (id) on delete cascade,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_csc_map_team_id_idx on public.team_csc_map (team_id);
create index team_csc_map_csc_id_idx
  on public.team_csc_map (competition_sport_category_map_id);
create unique index team_csc_map_live_idx
  on public.team_csc_map (team_id, competition_sport_category_map_id)
  where deleted_at is null;

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

create trigger team_csc_enforce_sport
  before insert or update on public.team_csc_map
  for each row
  execute function private.enforce_team_csc_sport();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.users force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.sport enable row level security;
alter table public.sport force row level security;
alter table public.category enable row level security;
alter table public.category force row level security;
alter table public.competition enable row level security;
alter table public.competition force row level security;
alter table public.competition_sport_map enable row level security;
alter table public.competition_sport_map force row level security;
alter table public.competition_sport_category_map enable row level security;
alter table public.competition_sport_category_map force row level security;
alter table public.team enable row level security;
alter table public.team force row level security;
alter table public.team_csc_map enable row level security;
alter table public.team_csc_map force row level security;

create policy users_select on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_admin())
  );

create policy users_insert_own on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy users_update on public.users
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_admin())
  )
  with check (
    id = (select auth.uid())
    or (select private.is_admin())
  );

create policy user_roles_select on public.user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy user_roles_admin_write on public.user_roles
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy sport_admin_all on public.sport
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy category_admin_all on public.category
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy competition_admin_all on public.competition
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy csm_admin_all on public.competition_sport_map
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy csc_admin_all on public.competition_sport_category_map
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy team_admin_all on public.team
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy team_csc_admin_all on public.team_csc_map
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill Auth users + admin seed
-- ---------------------------------------------------------------------------

insert into public.users (id, email)
select id, lower(coalesce(email, ''))
from auth.users
on conflict (id) do update
  set email = excluded.email;

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = 'vikaas4644@gmail.com'
on conflict (user_id, role) do nothing;

-- ---------------------------------------------------------------------------
-- Basketball seed
-- ---------------------------------------------------------------------------

insert into public.sport (name, code, event_mode)
values ('Basketball', 'BKB', 'team');

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
where s.code = 'BKB' and s.deleted_at is null;
