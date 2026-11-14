-- Athletics Boys U16: 100m (all track rounds), Shot Put + Long Jump (qualifying + final).

insert into public.team_member (team_id, name, phone, gender)
select t.id, m.name, m.phone, 'male'
from public.team t
join public.competition_sport_category_map csc on csc.id = t.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join (
  values
    ('Delhi Club', 'Neel Kapoor', '9876620101'),
    ('Delhi Club', 'Yash Malhotra', '9876620102'),
    ('Delhi Club', 'Veer Khanna', '9876620103'),
    ('Delhi Club', 'Arnav Bhatia', '9876620104'),
    ('Delhi Club', 'Kabir Anand', '9876620105'),
    ('Mumbai Club', 'Ishan Deshmukh', '9876620201'),
    ('Mumbai Club', 'Rehan Qureshi', '9876620202'),
    ('Mumbai Club', 'Sahil Banerjee', '9876620203'),
    ('Mumbai Club', 'Ayaan Kulkarni', '9876620204'),
    ('Mumbai Club', 'Dhruv Iyer', '9876620205'),
    ('Pune Club', 'Harsh Joshi', '9876620301'),
    ('Pune Club', 'Tanishq More', '9876620302'),
    ('Pune Club', 'Aditya Kale', '9876620303')
) as m(team_name, name, phone) on m.team_name = t.name
where t.deleted_at is null
  and s.name = 'Athletics'
  and cat.name = '100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.team_member existing
    where lower(existing.name) = lower(m.name)
      and existing.phone = m.phone
      and existing.deleted_at is null
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
    ('heat', 2, 'Heat 2', timestamptz '2026-12-05 09:20+05:30'),
    ('quarter_final', 1, 'QF 1', timestamptz '2026-12-05 11:00+05:30'),
    ('quarter_final', 2, 'QF 2', timestamptz '2026-12-05 11:15+05:30'),
    ('semi_final', 1, 'Semi 1', timestamptz '2026-12-06 10:00+05:30'),
    ('final', 1, 'Final', timestamptz '2026-12-07 17:00+05:30')
) as v(round_type, match_number, match_label, scheduled_at)
  on v.round_type = r.round_type
where f.deleted_at is null
  and s.name = 'Athletics'
  and cat.name = '100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_match m
    where m.fixture_round_id = r.id
      and m.match_number = v.match_number
      and m.deleted_at is null
  );

update public.fixture_match m
set scheduled_at = timestamptz '2026-12-05 09:00+05:30', status = 'completed'
from public.fixture_round r
join public.fixture f on f.id = r.fixture_id
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
where m.fixture_round_id = r.id
  and r.round_type = 'heat'
  and m.match_number = 1
  and m.deleted_at is null
  and s.name = 'Athletics'
  and cat.name = '100m';

insert into public.fixture_match_participant (
  fixture_match_id, athlete_id, participant_label, score, score_detail, result_status, position, attempts
)
select m.id, tm.id, v.lane, to_char(v.time_ms / 1000.0, 'FM99.00'),
  jsonb_build_object(
    'mark', null, 'unit', 'm', 'place', v.place, 'time_ms', v.time_ms,
    'attempts', '[]'::jsonb, 'qualified', v.qualified, 'result_code', 'ok', 'scoring_style', 'time'
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
join public.team_member tm on tm.team_id = t.id and tm.deleted_at is null
join (
  values
    ('heat', 1, '4', 'Neel Kapoor', 12410, 4, true),
    ('heat', 1, '5', 'Yash Malhotra', 12580, 5, false),
    ('heat', 1, '6', 'Veer Khanna', 12720, 6, false),
    ('heat', 1, '7', 'Arnav Bhatia', 12890, 7, false),
    ('heat', 1, '8', 'Kabir Anand', 13050, 8, false),
    ('heat', 2, '1', 'Ishan Deshmukh', 11880, 1, true),
    ('heat', 2, '2', 'Rehan Qureshi', 12110, 2, true),
    ('heat', 2, '3', 'Sahil Banerjee', 12240, 3, true),
    ('heat', 2, '4', 'Ayaan Kulkarni', 12390, 4, true),
    ('heat', 2, '5', 'Dhruv Iyer', 12510, 5, false),
    ('heat', 2, '6', 'Harsh Joshi', 12670, 6, false),
    ('heat', 2, '7', 'Tanishq More', 12820, 7, false),
    ('heat', 2, '8', 'Aditya Kale', 13140, 8, false),
    ('quarter_final', 1, '1', 'Ishan Deshmukh', 11790, 1, true),
    ('quarter_final', 1, '2', 'Karan Mehta', 11860, 2, true),
    ('quarter_final', 1, '3', 'Amit Patel', 11980, 3, true),
    ('quarter_final', 1, '4', 'Rehan Qureshi', 12070, 4, true),
    ('quarter_final', 1, '5', 'Sahil Banerjee', 12210, 5, false),
    ('quarter_final', 1, '6', 'Rohan Sharma', 12300, 6, false),
    ('quarter_final', 1, '7', 'Neel Kapoor', 12450, 7, false),
    ('quarter_final', 1, '8', 'Ayaan Kulkarni', 12520, 8, false),
    ('quarter_final', 2, '1', 'Dhruv Iyer', 12400, 1, true),
    ('quarter_final', 2, '2', 'Yash Malhotra', 12480, 2, true),
    ('quarter_final', 2, '3', 'Harsh Joshi', 12590, 3, true),
    ('quarter_final', 2, '4', 'Veer Khanna', 12680, 4, true),
    ('quarter_final', 2, '5', 'Tanishq More', 12790, 5, false),
    ('quarter_final', 2, '6', 'Arnav Bhatia', 12870, 6, false),
    ('quarter_final', 2, '7', 'Kabir Anand', 13010, 7, false),
    ('quarter_final', 2, '8', 'Aditya Kale', 13200, 8, false),
    ('semi_final', 1, '1', 'Ishan Deshmukh', 11680, 1, true),
    ('semi_final', 1, '2', 'Karan Mehta', 11750, 2, true),
    ('semi_final', 1, '3', 'Amit Patel', 11890, 3, true),
    ('semi_final', 1, '4', 'Rehan Qureshi', 11970, 4, true),
    ('semi_final', 1, '5', 'Dhruv Iyer', 12140, 5, true),
    ('semi_final', 1, '6', 'Yash Malhotra', 12280, 6, true),
    ('semi_final', 1, '7', 'Harsh Joshi', 12420, 7, true),
    ('semi_final', 1, '8', 'Veer Khanna', 12560, 8, true),
    ('final', 1, '1', 'Ishan Deshmukh', 11540, 1, false),
    ('final', 1, '2', 'Karan Mehta', 11620, 2, false),
    ('final', 1, '3', 'Amit Patel', 11710, 3, false),
    ('final', 1, '4', 'Rehan Qureshi', 11800, 4, false),
    ('final', 1, '5', 'Dhruv Iyer', 11950, 5, false),
    ('final', 1, '6', 'Yash Malhotra', 12100, 6, false),
    ('final', 1, '7', 'Harsh Joshi', 12240, 7, false),
    ('final', 1, '8', 'Veer Khanna', 12380, 8, false)
) as v(round_type, match_number, lane, athlete_name, time_ms, place, qualified)
  on v.round_type = r.round_type
 and v.match_number = m.match_number
 and v.athlete_name = tm.name
where f.deleted_at is null
  and s.name = 'Athletics'
  and cat.name = '100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_match_participant p
    where p.fixture_match_id = m.id
      and p.participant_label = v.lane
      and p.deleted_at is null
  );

update public.fixture_match_participant p
set
  score = v.score,
  score_detail = jsonb_build_object(
    'mark', null, 'unit', 'm', 'place', v.place, 'time_ms', v.time_ms,
    'attempts', '[]'::jsonb, 'qualified', true, 'result_code', 'ok', 'scoring_style', 'time'
  ),
  result_status = 'qualified',
  position = v.place
from (
  values
    ('Amit Patel', '12.05', 12050, 2),
    ('Karan Mehta', '11.92', 11920, 1),
    ('Rohan Sharma', '12.34', 12340, 3)
) as v(name, score, time_ms, place)
join public.team_member tm on tm.name = v.name and tm.deleted_at is null
where p.athlete_id = tm.id
  and p.deleted_at is null
  and p.participant_label in ('1', '2', '3')
  and exists (
    select 1
    from public.fixture_match m
    join public.fixture_round r on r.id = m.fixture_round_id
    join public.fixture f on f.id = r.fixture_id
    join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
    join public.category cat on cat.id = csc.category_id
    join public.competition_sport_map csm on csm.id = csc.competition_sport_id
    join public.sport s on s.id = csm.sport_id
    where m.id = p.fixture_match_id
      and r.round_type = 'heat'
      and m.match_number = 1
      and s.name = 'Athletics'
      and cat.name = '100m'
  );

insert into public.fixture_ranking (fixture_id, rank, athlete_id)
select f.id, v.rank, tm.id
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.team t on t.competition_sport_category_map_id = csc.id and t.deleted_at is null
join public.team_member tm on tm.team_id = t.id and tm.deleted_at is null
join (
  values
    (1, 'Ishan Deshmukh'),
    (2, 'Karan Mehta'),
    (3, 'Amit Patel'),
    (4, 'Rehan Qureshi'),
    (5, 'Dhruv Iyer'),
    (6, 'Yash Malhotra'),
    (7, 'Harsh Joshi'),
    (8, 'Veer Khanna')
) as v(rank, athlete_name) on v.athlete_name = tm.name
where f.deleted_at is null
  and s.name = 'Athletics'
  and cat.name = '100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_ranking r
    where r.fixture_id = f.id and r.rank = v.rank and r.deleted_at is null
  );

update public.fixture f
set status = 'completed'
from public.competition_sport_category_map csc
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
where f.competition_sport_category_map_id = csc.id
  and f.deleted_at is null
  and s.name = 'Athletics'
  and cat.name = '100m'
  and cat.gender = 'male'
  and cat.age_group = 'U16';
