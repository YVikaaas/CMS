-- Organization and city are separate. Existing city-only org values move to city.

alter table public.team
  add column if not exists city text;

alter table public.team
  drop constraint if exists team_city_alpha;
alter table public.team
  add constraint team_city_alpha check (
    city is null or city ~ '^[A-Za-z]+( [A-Za-z]+)*$'
  );

update public.team
set city = org_name, org_name = null
where org_name is not null
  and city is null
  and org_name !~* '(club|school|academy|college|university)';

update public.team
set city = split_part(org_name, ' ', 1)
where org_name is not null
  and city is null
  and org_name ~* '(club|school|academy|college|university)';
