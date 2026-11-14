-- Athletics categories are an event (100m, Long Jump, …) plus gender and age.
-- Basketball stays unique on sport + gender + age because names stay "Basketball".

drop index if exists public.category_sport_gender_age_live_idx;

create unique index category_sport_gender_age_name_live_idx
  on public.category (sport_id, gender, age_group, lower(name))
  where deleted_at is null;

update public.category c
set
  name = '100m',
  fixture_config = jsonb_build_object(
    'format', 'track_rounds',
    'scoring_style', 'time',
    'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
    'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
    'participants_per_match', 8
  )
from public.sport s
where s.id = c.sport_id
  and s.code = 'ATH'
  and s.deleted_at is null
  and c.deleted_at is null
  and c.name = 'Athletics';

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
  1,
  12,
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
      '200m',
      jsonb_build_object(
        'format', 'track_rounds',
        'scoring_style', 'time',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 8
      )
    ),
    (
      '400m',
      jsonb_build_object(
        'format', 'track_rounds',
        'scoring_style', 'time',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 8
      )
    ),
    (
      '800m',
      jsonb_build_object(
        'format', 'track_rounds',
        'scoring_style', 'time',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 8
      )
    ),
    (
      '1500m',
      jsonb_build_object(
        'format', 'track_rounds',
        'scoring_style', 'time',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 8
      )
    ),
    (
      'Long Jump',
      jsonb_build_object(
        'format', 'field_attempts',
        'scoring_style', 'distance',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 12
      )
    ),
    (
      'High Jump',
      jsonb_build_object(
        'format', 'field_attempts',
        'scoring_style', 'height',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 12
      )
    ),
    (
      'Shot Put',
      jsonb_build_object(
        'format', 'field_attempts',
        'scoring_style', 'distance',
        'available_rounds', jsonb_build_array('heat', 'semi_final', 'final', 'qualifying'),
        'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
        'participants_per_match', 12
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

-- Championships that already offer an athletics age/gender also get the sibling events.
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
  and sibling.id <> offered.id
  and not exists (
    select 1
    from public.competition_sport_category_map existing
    where existing.competition_sport_id = csc.competition_sport_id
      and existing.category_id = sibling.id
      and existing.deleted_at is null
  );
