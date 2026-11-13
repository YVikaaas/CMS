-- Teams map to championship sport offerings.

create table if not exists public.team_csm_map (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team (id) on delete cascade,
  competition_sport_id uuid not null
    references public.competition_sport_map (id) on delete cascade,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_csm_map_team_id_idx on public.team_csm_map (team_id);
create index if not exists team_csm_map_csm_id_idx on public.team_csm_map (competition_sport_id);
create unique index if not exists team_csm_map_live_idx
  on public.team_csm_map (team_id, competition_sport_id)
  where deleted_at is null;

drop trigger if exists team_csm_map_set_updated_at on public.team_csm_map;
create trigger team_csm_map_set_updated_at
  before update on public.team_csm_map
  for each row
  execute function private.set_updated_at();

create or replace function private.enforce_team_csm_sport()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_sport uuid;
  csm_sport uuid;
begin
  select sport_id into team_sport
  from public.team
  where id = new.team_id;

  select sport_id into csm_sport
  from public.competition_sport_map
  where id = new.competition_sport_id;

  if team_sport is distinct from csm_sport then
    raise exception 'Team sport must match the championship sport offering';
  end if;

  return new;
end;
$$;

drop trigger if exists team_csm_enforce_sport on public.team_csm_map;
create trigger team_csm_enforce_sport
  before insert or update on public.team_csm_map
  for each row
  execute function private.enforce_team_csm_sport();

alter table public.team_csm_map enable row level security;
alter table public.team_csm_map force row level security;

drop policy if exists team_csm_admin_all on public.team_csm_map;
create policy team_csm_admin_all on public.team_csm_map
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.team_csm_map to authenticated;
