-- Team gender + members (name + phone unique). Members are sport-squad people.

alter table public.team
  add column if not exists gender public.gender not null default 'male';

drop index if exists public.team_sport_name_live_idx;

create unique index if not exists team_sport_gender_name_live_idx
  on public.team (sport_id, gender, lower(name))
  where deleted_at is null;

create table if not exists public.team_member (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team (id) on delete cascade,
  name text not null,
  phone text not null,
  gender public.gender not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_member_name_alpha check (name ~ '^[A-Za-z]+( [A-Za-z]+)*$'),
  constraint team_member_phone_in check (phone ~ '^[6-9][0-9]{9}$')
);

create index if not exists team_member_team_id_idx on public.team_member (team_id);
create unique index if not exists team_member_name_phone_live_idx
  on public.team_member (lower(name), phone)
  where deleted_at is null;

drop trigger if exists team_member_set_updated_at on public.team_member;
create trigger team_member_set_updated_at
  before update on public.team_member
  for each row
  execute function private.set_updated_at();

alter table public.team_member enable row level security;
alter table public.team_member force row level security;

drop policy if exists team_member_admin_all on public.team_member;
create policy team_member_admin_all on public.team_member
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.team_member to authenticated;
