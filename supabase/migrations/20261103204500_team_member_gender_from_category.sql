-- Team members inherit gender from the team, which is synced from the category.

create or replace function private.sync_team_member_gender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_gender public.gender;
begin
  select gender into team_gender
  from public.team
  where id = new.team_id;

  if team_gender is null then
    raise exception 'Team was not found';
  end if;

  new.gender := team_gender;
  return new;
end;
$$;

drop trigger if exists team_member_sync_gender on public.team_member;
create trigger team_member_sync_gender
  before insert or update of team_id, gender
  on public.team_member
  for each row
  execute function private.sync_team_member_gender();

update public.team_member m
set gender = t.gender
from public.team t
where t.id = m.team_id
  and m.gender is distinct from t.gender;
