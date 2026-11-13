-- Team and organization names: letters (and spaces) only, matching member names.

alter table public.team
  drop constraint if exists team_name_alpha;
alter table public.team
  add constraint team_name_alpha check (name ~ '^[A-Za-z]+( [A-Za-z]+)*$');

alter table public.team
  drop constraint if exists team_org_name_alpha;
alter table public.team
  add constraint team_org_name_alpha check (
    org_name is null or org_name ~ '^[A-Za-z]+( [A-Za-z]+)*$'
  );
