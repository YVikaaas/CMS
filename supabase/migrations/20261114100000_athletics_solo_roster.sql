-- Athletics: every event except relays is a solo athlete (roster 1).
-- Relays are teams of 4. Existing solo clubs become one team-of-1 per athlete
-- so heat athlete_id rows keep their team_member ids.

update public.category c
set
  team_size = case
    when regexp_replace(lower(c.name), '\s+', '', 'g') ~ '^4x[0-9]'
      or position('relay' in lower(c.name)) > 0 then 4
    else 1
  end,
  max_team_size = case
    when regexp_replace(lower(c.name), '\s+', '', 'g') ~ '^4x[0-9]'
      or position('relay' in lower(c.name)) > 0 then 4
    else 1
  end
from public.sport s
where c.sport_id = s.id
  and c.deleted_at is null
  and s.deleted_at is null
  and (s.code = 'ATH' or s.event_mode = 'solo');

do $$
declare
  club record;
  first_id uuid;
  extra record;
  new_team_id uuid;
  candidate text;
  base_name text;
  n int;
begin
  for club in
    select
      t.id,
      t.competition_sport_category_map_id as csc_id,
      t.org_name,
      t.gender
    from public.team t
    join public.competition_sport_category_map csc
      on csc.id = t.competition_sport_category_map_id
    join public.category c on c.id = csc.category_id
    join public.sport s on s.id = c.sport_id
    where t.deleted_at is null
      and csc.deleted_at is null
      and c.deleted_at is null
      and s.deleted_at is null
      and (s.code = 'ATH' or s.event_mode = 'solo')
      and not (
        regexp_replace(lower(c.name), '\s+', '', 'g') ~ '^4x[0-9]'
        or position('relay' in lower(c.name)) > 0
      )
  loop
    select m.id into first_id
    from public.team_member m
    where m.team_id = club.id
      and m.deleted_at is null
    order by m.name, m.id
    limit 1;

    if first_id is null then
      continue;
    end if;

    select m.name into base_name
    from public.team_member m
    where m.id = first_id;

    candidate := base_name;
    n := 0;
    while exists (
      select 1
      from public.team other
      where other.competition_sport_category_map_id = club.csc_id
        and other.deleted_at is null
        and other.id <> club.id
        and lower(other.name) = lower(candidate)
    ) loop
      n := n + 1;
      candidate := base_name || ' ' || chr(64 + n);
    end loop;

    update public.team
    set name = candidate
    where id = club.id;

    for extra in
      select m.id, m.name
      from public.team_member m
      where m.team_id = club.id
        and m.deleted_at is null
        and m.id <> first_id
      order by m.name, m.id
    loop
      candidate := extra.name;
      n := 0;
      while exists (
        select 1
        from public.team other
        where other.competition_sport_category_map_id = club.csc_id
          and other.deleted_at is null
          and lower(other.name) = lower(candidate)
      ) loop
        n := n + 1;
        candidate := extra.name || ' ' || chr(64 + n);
      end loop;

      insert into public.team (
        name,
        org_name,
        gender,
        competition_sport_category_map_id
      )
      values (
        candidate,
        club.org_name,
        club.gender,
        club.csc_id
      )
      returning id into new_team_id;

      update public.team_member
      set team_id = new_team_id
      where id = extra.id;
    end loop;
  end loop;
end $$;
