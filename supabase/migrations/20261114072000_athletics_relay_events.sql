-- Athletics relays: 4x100m and 4x400m. Roster is 4 runners (max 6). Track times.

insert into public.category (
  sport_id, name, gender, age_group, age_min, age_max,
  team_size, max_team_size, fixture_config
)
select
  s.id,
  e.event_name,
  v.gender,
  v.age_group,
  4,
  v.age_max,
  4,
  6,
  e.config
from public.sport s
cross join (
  values
    ('male'::public.gender, 'U14', 13),
    ('female'::public.gender, 'U14', 13),
    ('male'::public.gender, 'U16', 15),
    ('female'::public.gender, 'U16', 15),
    ('male'::public.gender, 'U18', 17),
    ('female'::public.gender, 'U18', 17)
) as v(gender, age_group, age_max)
cross join (
  values
    (
      '4x100m',
      jsonb_build_object(
        'format', 'track_rounds',
        'scoring_style', 'time',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 8
      )
    ),
    (
      '4x400m',
      jsonb_build_object(
        'format', 'track_rounds',
        'scoring_style', 'time',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 8
      )
    )
) as e(event_name, config)
where s.code = 'ATH' and s.deleted_at is null
  and not exists (
    select 1
    from public.category c
    where c.sport_id = s.id
      and c.gender = v.gender
      and c.age_group = v.age_group
      and lower(c.name) = lower(e.event_name)
      and c.deleted_at is null
  );

-- Championships that already offer an athletics age/gender also get the relay events.
insert into public.competition_sport_category_map (competition_sport_id, category_id)
select distinct csc.competition_sport_id, sibling.id
from public.competition_sport_category_map csc
join public.category offered
  on offered.id = csc.category_id
join public.sport s
  on s.id = offered.sport_id
join public.category sibling
  on sibling.sport_id = offered.sport_id
 and sibling.gender = offered.gender
 and sibling.age_group = offered.age_group
 and sibling.deleted_at is null
where s.code = 'ATH'
  and s.deleted_at is null
  and csc.deleted_at is null
  and offered.deleted_at is null
  and lower(sibling.name) in ('4x100m', '4x400m')
  and sibling.id <> offered.id
  and not exists (
    select 1
    from public.competition_sport_category_map existing
    where existing.competition_sport_id = csc.competition_sport_id
      and existing.category_id = sibling.id
      and existing.deleted_at is null
  );
