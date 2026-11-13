-- A team belongs to one championship + sport + category (CSC).
-- Roster size is enforced in the app against category.team_size / max_team_size.

delete from public.team_member
where team_id in (
  select t.id
  from public.team t
  where not exists (
    select 1
    from public.team_csc_map m
    where m.team_id = t.id
      and m.deleted_at is null
  )
);

delete from public.team t
where not exists (
  select 1
  from public.team_csc_map m
  where m.team_id = t.id
    and m.deleted_at is null
);

alter table public.team
  add column if not exists competition_sport_category_map_id uuid
    references public.competition_sport_category_map (id) on delete restrict;

update public.team t
set competition_sport_category_map_id = m.competition_sport_category_map_id
from (
  select distinct on (team_id)
    team_id,
    competition_sport_category_map_id
  from public.team_csc_map
  where deleted_at is null
  order by team_id, created_at
) m
where t.id = m.team_id;

drop trigger if exists team_csc_enforce_sport on public.team_csc_map;
drop function if exists private.enforce_team_csc_sport();
drop table if exists public.team_csc_map;

alter table public.team
  alter column competition_sport_category_map_id set not null;

drop index if exists public.team_sport_gender_name_live_idx;
drop index if exists public.team_sport_name_live_idx;
drop index if exists public.team_sport_id_idx;

alter table public.team drop constraint if exists team_sport_id_fkey;
alter table public.team drop column if exists sport_id;

create index if not exists team_csc_id_idx
  on public.team (competition_sport_category_map_id);

create unique index if not exists team_csc_name_live_idx
  on public.team (competition_sport_category_map_id, lower(name))
  where deleted_at is null;

create or replace function private.sync_team_from_csc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cat_gender public.gender;
begin
  select c.gender into cat_gender
  from public.competition_sport_category_map csc
  join public.category c on c.id = csc.category_id
  where csc.id = new.competition_sport_category_map_id;

  if cat_gender is null then
    raise exception 'Championship sport category was not found';
  end if;

  new.gender := cat_gender;
  return new;
end;
$$;

drop trigger if exists team_sync_from_csc on public.team;
create trigger team_sync_from_csc
  before insert or update of competition_sport_category_map_id, gender
  on public.team
  for each row
  execute function private.sync_team_from_csc();
