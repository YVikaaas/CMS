-- Global athletes (unique live phone). team_member is a roster slot that
-- points at an athlete so the same person can enter many categories.

create table if not exists public.athlete (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  gender public.gender not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_name_alpha check (name ~ '^[A-Za-z]+( [A-Za-z]+)*$'),
  constraint athlete_phone_in check (phone ~ '^[6-9][0-9]{9}$')
);

create unique index if not exists athlete_phone_live_idx
  on public.athlete (phone)
  where deleted_at is null;

drop trigger if exists athlete_set_updated_at on public.athlete;
create trigger athlete_set_updated_at
  before update on public.athlete
  for each row
  execute function private.set_updated_at();

alter table public.athlete enable row level security;
alter table public.athlete force row level security;

drop policy if exists athlete_admin_all on public.athlete;
create policy athlete_admin_all on public.athlete
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.athlete to authenticated;

-- Same phone on one live team would collide after merge.
with ranked as (
  select
    id,
    row_number() over (
      partition by team_id, phone
      order by (deleted_at is null) desc, updated_at desc, created_at desc
    ) as rn
  from public.team_member
)
update public.team_member m
set deleted_at = now()
from ranked
where m.id = ranked.id
  and ranked.rn > 1
  and m.deleted_at is null;

insert into public.athlete (name, phone, gender, created_at, updated_at)
select distinct on (phone) name, phone, gender, created_at, updated_at
from public.team_member
order by phone, (deleted_at is null) desc, updated_at desc, created_at desc;

alter table public.team_member
  add column if not exists athlete_id uuid references public.athlete (id) on delete restrict;

update public.team_member m
set athlete_id = a.id
from public.athlete a
where a.phone = m.phone
  and m.athlete_id is null;

alter table public.team_member
  alter column athlete_id set not null;

create index if not exists team_member_athlete_id_idx on public.team_member (athlete_id);

drop index if exists public.team_member_name_phone_live_idx;

create unique index if not exists team_member_athlete_team_live_idx
  on public.team_member (team_id, athlete_id)
  where deleted_at is null;

drop trigger if exists team_member_sync_gender on public.team_member;

create or replace function private.sync_team_member_from_athlete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete_name text;
  athlete_phone text;
  athlete_gender public.gender;
  athlete_deleted timestamptz;
begin
  if new.athlete_id is null then
    raise exception 'Athlete is required';
  end if;

  select a.name, a.phone, a.gender, a.deleted_at
    into athlete_name, athlete_phone, athlete_gender, athlete_deleted
  from public.athlete a
  where a.id = new.athlete_id;

  if athlete_name is null then
    raise exception 'Athlete was not found';
  end if;
  if athlete_deleted is not null then
    raise exception 'Athlete was not found';
  end if;

  new.name := athlete_name;
  new.phone := athlete_phone;
  new.gender := athlete_gender;
  return new;
end;
$$;

drop trigger if exists team_member_sync_from_athlete on public.team_member;
create trigger team_member_sync_from_athlete
  before insert or update of athlete_id on public.team_member
  for each row
  execute function private.sync_team_member_from_athlete();

create or replace function private.sync_athlete_to_team_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name
    or new.phone is distinct from old.phone
    or new.gender is distinct from old.gender
  then
    update public.team_member
    set
      name = new.name,
      phone = new.phone,
      gender = new.gender
    where athlete_id = new.id
      and (
        name is distinct from new.name
        or phone is distinct from new.phone
        or gender is distinct from new.gender
      );
  end if;
  return new;
end;
$$;

drop trigger if exists athlete_sync_team_members on public.athlete;
create trigger athlete_sync_team_members
  after update of name, phone, gender on public.athlete
  for each row
  execute function private.sync_athlete_to_team_members();
