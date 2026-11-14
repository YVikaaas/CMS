-- Complete Boys U16 4x100m relay: 8 teams of 4, heats + semi + final, times, ranking.

insert into public.competition_sport_category_map (competition_sport_id, category_id)
select csm.id, cat.id
from public.competition c
join public.competition_sport_map csm
  on csm.competition_id = c.id and csm.deleted_at is null
join public.sport s on s.id = csm.sport_id
join public.category cat
  on cat.sport_id = s.id
 and cat.deleted_at is null
where c.deleted_at is null
  and c.name = 'BB Championship December'
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.competition_sport_category_map existing
    where existing.competition_sport_id = csm.id
      and existing.category_id = cat.id
      and existing.deleted_at is null
  );

insert into public.team (
  competition_sport_category_map_id, name, org_name, city, gender
)
select csc.id, v.name, v.org_name, v.city, 'male'
from public.competition c
join public.competition_sport_map csm on csm.competition_id = c.id and csm.deleted_at is null
join public.sport s on s.id = csm.sport_id
join public.competition_sport_category_map csc on csc.competition_sport_id = csm.id and csc.deleted_at is null
join public.category cat on cat.id = csc.category_id
join (
  values
    ('Delhi Racers', 'Delhi Athletics Club', 'Delhi'),
    ('Mumbai Flyers', 'Mumbai Athletics Club', 'Mumbai'),
    ('Pune Sprinters', 'Pune Athletics Club', 'Pune'),
    ('Jaipur Jets', 'Jaipur Athletics Club', 'Jaipur'),
    ('Bengaluru Bolts', 'Bengaluru Athletics Club', 'Bengaluru'),
    ('Chennai Cheetahs', 'Chennai Athletics Club', 'Chennai'),
    ('Hyderabad Hounds', 'Hyderabad Athletics Club', 'Hyderabad'),
    ('Kolkata Kings', 'Kolkata Athletics Club', 'Kolkata')
) as v(name, org_name, city) on true
where c.deleted_at is null
  and c.name = 'BB Championship December'
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.team t
    where t.competition_sport_category_map_id = csc.id
      and lower(t.name) = lower(v.name)
      and t.deleted_at is null
  );

insert into public.team_member (team_id, name, phone, gender)
select t.id, m.name, m.phone, 'male'
from public.team t
join public.competition_sport_category_map csc on csc.id = t.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.competition c on c.id = csm.competition_id
join (
  values
    ('Delhi Racers', 'Arjun Nair', '9876650101'),
    ('Delhi Racers', 'Kabir Sethi', '9876650102'),
    ('Delhi Racers', 'Rohan Bansal', '9876650103'),
    ('Delhi Racers', 'Vihaan Kapur', '9876650104'),
    ('Mumbai Flyers', 'Devansh Rao', '9876650201'),
    ('Mumbai Flyers', 'Ishaan Kulkarni', '9876650202'),
    ('Mumbai Flyers', 'Rehaan Sheikh', '9876650203'),
    ('Mumbai Flyers', 'Yug Mehta', '9876650204'),
    ('Pune Sprinters', 'Atharv Jadhav', '9876650301'),
    ('Pune Sprinters', 'Omkar Patil', '9876650302'),
    ('Pune Sprinters', 'Soham Deshmukh', '9876650303'),
    ('Pune Sprinters', 'Tushar More', '9876650304'),
    ('Jaipur Jets', 'Aarav Singh', '9876650401'),
    ('Jaipur Jets', 'Lakshya Rathore', '9876650402'),
    ('Jaipur Jets', 'Naman Sharma', '9876650403'),
    ('Jaipur Jets', 'Pratyush Jain', '9876650404'),
    ('Bengaluru Bolts', 'Advaith Rao', '9876650501'),
    ('Bengaluru Bolts', 'Kushal Hegde', '9876650502'),
    ('Bengaluru Bolts', 'Nithin Gowda', '9876650503'),
    ('Bengaluru Bolts', 'Samarth Shetty', '9876650504'),
    ('Chennai Cheetahs', 'Arvind Iyer', '9876650601'),
    ('Chennai Cheetahs', 'Karthik Raman', '9876650602'),
    ('Chennai Cheetahs', 'Pranav Krishnan', '9876650603'),
    ('Chennai Cheetahs', 'Siddharth Nair', '9876650604'),
    ('Hyderabad Hounds', 'Farhan Ali', '9876650701'),
    ('Hyderabad Hounds', 'Nikhil Reddy', '9876650702'),
    ('Hyderabad Hounds', 'Rishi Naidu', '9876650703'),
    ('Hyderabad Hounds', 'Vivaan Rao', '9876650704'),
    ('Kolkata Kings', 'Anirban Ghosh', '9876650801'),
    ('Kolkata Kings', 'Ritwik Bose', '9876650802'),
    ('Kolkata Kings', 'Sourav Sen', '9876650803'),
    ('Kolkata Kings', 'Tuhin Roy', '9876650804')
) as m(team_name, name, phone) on m.team_name = t.name
where t.deleted_at is null
  and c.deleted_at is null
  and c.name = 'BB Championship December'
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.team_member existing
    where lower(existing.name) = lower(m.name)
      and existing.phone = m.phone
      and existing.deleted_at is null
  );

insert into public.fixture (
  competition_sport_category_map_id, format_type, config, status, start_date, end_date
)
select csc.id, 'track_rounds'::public.fixture_format_type,
  '{"active_rounds":["heat","semi_final","final"],"participants_per_match":8,"scoring_style":"time"}'::jsonb,
  'completed', '2026-12-05', '2026-12-07'
from public.competition c
join public.competition_sport_map csm on csm.competition_id = c.id and csm.deleted_at is null
join public.sport s on s.id = csm.sport_id
join public.competition_sport_category_map csc on csc.competition_sport_id = csm.id and csc.deleted_at is null
join public.category cat on cat.id = csc.category_id
where c.deleted_at is null
  and c.name = 'BB Championship December'
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture f
    where f.competition_sport_category_map_id = csc.id
      and f.deleted_at is null
  );

insert into public.fixture_round (fixture_id, round_type, round_number, round_label)
select f.id, v.round_type, v.round_number, v.round_label
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join (
  values
    ('heat', 1, 'Heats'),
    ('semi_final', 12, 'Semi Finals'),
    ('final', 13, 'Final')
) as v(round_type, round_number, round_label) on true
where f.deleted_at is null
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_round r
    where r.fixture_id = f.id and r.round_type = v.round_type and r.deleted_at is null
  );

insert into public.fixture_match (
  fixture_round_id, match_number, match_label, venue, scheduled_at, status
)
select r.id, v.match_number, v.match_label, 'Track 1', v.scheduled_at, 'completed'
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.fixture_round r on r.fixture_id = f.id and r.deleted_at is null
join (
  values
    ('heat', 1, 'Heat 1', timestamptz '2026-12-05 09:00+05:30'),
    ('heat', 2, 'Heat 2', timestamptz '2026-12-05 09:20+05:30'),
    ('semi_final', 1, 'Semi 1', timestamptz '2026-12-06 10:00+05:30'),
    ('final', 1, 'Final', timestamptz '2026-12-07 17:00+05:30')
) as v(round_type, match_number, match_label, scheduled_at)
  on v.round_type = r.round_type
where f.deleted_at is null
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_match m
    where m.fixture_round_id = r.id
      and m.match_number = v.match_number
      and m.deleted_at is null
  );

insert into public.fixture_match_participant (
  fixture_match_id, team_id, participant_label, score, score_detail, result_status, position, attempts
)
select m.id, t.id, v.lane,
  to_char(v.time_ms / 1000.0, 'FM99.00'),
  jsonb_build_object(
    'mark', null,
    'unit', 'm',
    'place', v.place,
    'time_ms', v.time_ms,
    'time_seconds', v.time_ms / 1000.0,
    'attempts', '[]'::jsonb,
    'qualified', v.qualified,
    'result_code', 'ok',
    'scoring_style', 'time'
  ),
  case
    when v.round_type = 'final' and v.place = 1 then 'winner'::public.fixture_participant_result
    when v.qualified then 'qualified'::public.fixture_participant_result
    else 'pending'::public.fixture_participant_result
  end,
  v.place,
  '[]'::jsonb
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.fixture_round r on r.fixture_id = f.id and r.deleted_at is null
join public.fixture_match m on m.fixture_round_id = r.id and m.deleted_at is null
join public.team t on t.competition_sport_category_map_id = csc.id and t.deleted_at is null
join (
  values
    ('heat', 1, '1', 'Delhi Racers', 45120, 1, true),
    ('heat', 1, '2', 'Mumbai Flyers', 45480, 2, true),
    ('heat', 1, '3', 'Pune Sprinters', 46050, 3, true),
    ('heat', 1, '4', 'Jaipur Jets', 46800, 4, true),
    ('heat', 2, '1', 'Bengaluru Bolts', 44900, 1, true),
    ('heat', 2, '2', 'Chennai Cheetahs', 45550, 2, true),
    ('heat', 2, '3', 'Hyderabad Hounds', 46220, 3, true),
    ('heat', 2, '4', 'Kolkata Kings', 47100, 4, true),
    ('semi_final', 1, '1', 'Bengaluru Bolts', 44620, 1, true),
    ('semi_final', 1, '2', 'Delhi Racers', 44880, 2, true),
    ('semi_final', 1, '3', 'Mumbai Flyers', 45210, 3, true),
    ('semi_final', 1, '4', 'Chennai Cheetahs', 45400, 4, true),
    ('semi_final', 1, '5', 'Pune Sprinters', 45750, 5, true),
    ('semi_final', 1, '6', 'Hyderabad Hounds', 46020, 6, true),
    ('semi_final', 1, '7', 'Jaipur Jets', 46550, 7, true),
    ('semi_final', 1, '8', 'Kolkata Kings', 46900, 8, true),
    ('final', 1, '1', 'Bengaluru Bolts', 44280, 1, false),
    ('final', 1, '2', 'Delhi Racers', 44510, 2, false),
    ('final', 1, '3', 'Mumbai Flyers', 44960, 3, false),
    ('final', 1, '4', 'Chennai Cheetahs', 45180, 4, false),
    ('final', 1, '5', 'Pune Sprinters', 45600, 5, false),
    ('final', 1, '6', 'Hyderabad Hounds', 45920, 6, false),
    ('final', 1, '7', 'Jaipur Jets', 46310, 7, false),
    ('final', 1, '8', 'Kolkata Kings', 46740, 8, false)
) as v(round_type, match_number, lane, team_name, time_ms, place, qualified)
  on v.round_type = r.round_type
 and v.match_number = m.match_number
 and v.team_name = t.name
where f.deleted_at is null
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_match_participant p
    where p.fixture_match_id = m.id
      and p.participant_label = v.lane
      and p.deleted_at is null
  );

insert into public.fixture_ranking (fixture_id, rank, team_id)
select f.id, v.rank, t.id
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.team t on t.competition_sport_category_map_id = csc.id and t.deleted_at is null
join (
  values
    (1, 'Bengaluru Bolts'),
    (2, 'Delhi Racers'),
    (3, 'Mumbai Flyers'),
    (4, 'Chennai Cheetahs'),
    (5, 'Pune Sprinters'),
    (6, 'Hyderabad Hounds'),
    (7, 'Jaipur Jets'),
    (8, 'Kolkata Kings')
) as v(rank, team_name) on v.team_name = t.name
where f.deleted_at is null
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_ranking r
    where r.fixture_id = f.id and r.rank = v.rank and r.deleted_at is null
  );

update public.fixture f
set
  status = 'completed',
  rankings_locked_at = coalesce(f.rankings_locked_at, now())
from public.competition_sport_category_map csc
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.competition c on c.id = csm.competition_id
where f.competition_sport_category_map_id = csc.id
  and f.deleted_at is null
  and c.deleted_at is null
  and c.name = 'BB Championship December'
  and s.code = 'ATH'
  and cat.name = '4x100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16';
