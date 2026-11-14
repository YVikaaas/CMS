-- Shot Put (existing fixture) + Long Jump (new fixture). Qualifying 3 attempts, final 2.

insert into public.team (competition_sport_category_map_id, name, org_name, gender)
select csc.id, v.name, v.org_name, 'male'
from public.competition c
join public.competition_sport_map csm on csm.competition_id = c.id and csm.deleted_at is null
join public.sport s on s.id = csm.sport_id
join public.competition_sport_category_map csc on csc.competition_sport_id = csm.id and csc.deleted_at is null
join public.category cat on cat.id = csc.category_id
join (
  values
    ('Shot Put', 'Delhi Club', 'Delhi'),
    ('Shot Put', 'Mumbai Club', 'Mumbai'),
    ('Shot Put', 'Pune Club', 'Pune'),
    ('Long Jump', 'Delhi Club', 'Delhi'),
    ('Long Jump', 'Mumbai Club', 'Mumbai'),
    ('Long Jump', 'Pune Club', 'Pune')
) as v(event_name, name, org_name)
  on v.event_name = cat.name
where c.deleted_at is null
  and c.name = 'BB Championship December'
  and s.name = 'Athletics'
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
join (
  values
    ('Shot Put', 'Delhi Club', 'Manav Gupta', '9876630101'),
    ('Shot Put', 'Delhi Club', 'Raghav Seth', '9876630102'),
    ('Shot Put', 'Delhi Club', 'Kunal Bansal', '9876630103'),
    ('Shot Put', 'Mumbai Club', 'Jay Mehta', '9876630201'),
    ('Shot Put', 'Mumbai Club', 'Parth Shah', '9876630202'),
    ('Shot Put', 'Mumbai Club', 'Nirav Joshi', '9876630203'),
    ('Shot Put', 'Pune Club', 'Sagar Patil', '9876630301'),
    ('Shot Put', 'Pune Club', 'Rohit Kulkarni', '9876630302'),
    ('Long Jump', 'Delhi Club', 'Avi Sharma', '9876640101'),
    ('Long Jump', 'Delhi Club', 'Kabir Lal', '9876640102'),
    ('Long Jump', 'Delhi Club', 'Dev Khurana', '9876640103'),
    ('Long Jump', 'Mumbai Club', 'Neil Kapoor', '9876640201'),
    ('Long Jump', 'Mumbai Club', 'Arhaan Sheikh', '9876640202'),
    ('Long Jump', 'Mumbai Club', 'Zayan Merchant', '9876640203'),
    ('Long Jump', 'Pune Club', 'Yash Jadhav', '9876640301'),
    ('Long Jump', 'Pune Club', 'Om Deshmukh', '9876640302')
) as m(event_name, team_name, name, phone)
  on m.event_name = cat.name and m.team_name = t.name
where t.deleted_at is null
  and s.name = 'Athletics'
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
select csc.id, 'field_attempts'::public.fixture_format_type,
  '{"active_rounds":["qualifying","final"],"participants_per_match":12,"scoring_style":"distance"}'::jsonb,
  'completed', '2026-12-05', '2026-12-07'
from public.competition c
join public.competition_sport_map csm on csm.competition_id = c.id and csm.deleted_at is null
join public.sport s on s.id = csm.sport_id
join public.competition_sport_category_map csc on csc.competition_sport_id = csm.id and csc.deleted_at is null
join public.category cat on cat.id = csc.category_id
where c.deleted_at is null
  and c.name = 'BB Championship December'
  and s.name = 'Athletics'
  and cat.name = 'Long Jump'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture f
    where f.competition_sport_category_map_id = csc.id
      and f.deleted_at is null
  );

insert into public.fixture_round (
  fixture_id, round_type, round_number, round_label, attempt_count, extra_attempt_count
)
select f.id, v.round_type, v.round_number, v.round_label,
  case when v.round_type = 'final' then 2 else 3 end,
  0
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join (
  values
    ('qualifying', 2, 'Qualifying'),
    ('final', 13, 'Final')
) as v(round_type, round_number, round_label) on true
where f.deleted_at is null
  and s.name = 'Athletics'
  and cat.name = 'Long Jump'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_round r
    where r.fixture_id = f.id and r.round_type = v.round_type and r.deleted_at is null
  );

insert into public.fixture_match (
  fixture_round_id, match_number, match_label, venue, scheduled_at, status
)
select r.id, 1, case when r.round_type = 'qualifying' then 'Flight 1' else 'Final' end,
  'Pit 1',
  case when r.round_type = 'qualifying'
    then timestamptz '2026-12-05 15:00+05:30'
    else timestamptz '2026-12-07 15:00+05:30'
  end,
  'completed'
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.fixture_round r on r.fixture_id = f.id and r.deleted_at is null
where f.deleted_at is null
  and s.name = 'Athletics'
  and cat.name in ('Shot Put', 'Long Jump')
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_match m
    where m.fixture_round_id = r.id and m.match_number = 1 and m.deleted_at is null
  );

insert into public.fixture_match_participant (
  fixture_match_id, athlete_id, participant_label, score, score_detail, result_status, position, attempts
)
select m.id, tm.id, v.lane, v.best::text,
  jsonb_build_object(
    'mark', v.best, 'unit', 'm', 'place', v.place, 'time_ms', null,
    'attempts', v.attempts, 'qualified', v.qualified, 'result_code', 'ok', 'scoring_style', 'distance'
  ),
  case
    when v.round_type = 'final' and v.place = 1 then 'winner'::public.fixture_participant_result
    when v.qualified then 'qualified'::public.fixture_participant_result
    else 'pending'::public.fixture_participant_result
  end,
  v.place,
  v.attempts
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
    ('Shot Put', 'qualifying', '1', 'Manav Gupta', 14.20, 1, true,
      '[{"mark":13.4,"status":"ok"},{"mark":null,"status":"foul"},{"mark":14.2,"status":"ok"},{"mark":13.9,"status":"ok"},{"mark":14.05,"status":"ok"}]'::jsonb),
    ('Shot Put', 'qualifying', '2', 'Jay Mehta', 13.85, 2, true,
      '[{"mark":13.1,"status":"ok"},{"mark":13.85,"status":"ok"},{"mark":13.4,"status":"ok"},{"mark":null,"status":"foul"},{"mark":13.6,"status":"ok"}]'::jsonb),
    ('Shot Put', 'qualifying', '3', 'Sagar Patil', 13.50, 3, true,
      '[{"mark":12.8,"status":"ok"},{"mark":13.5,"status":"ok"},{"mark":13.2,"status":"ok"},{"mark":13.1,"status":"ok"},{"mark":null,"status":"foul"}]'::jsonb),
    ('Shot Put', 'qualifying', '4', 'Raghav Seth', 13.10, 4, true,
      '[{"mark":12.4,"status":"ok"},{"mark":13.1,"status":"ok"},{"mark":12.9,"status":"ok"},{"mark":12.7,"status":"ok"},{"mark":12.85,"status":"ok"}]'::jsonb),
    ('Shot Put', 'qualifying', '5', 'Parth Shah', 12.70, 5, true,
      '[{"mark":12.7,"status":"ok"},{"mark":null,"status":"foul"},{"mark":12.3,"status":"ok"},{"mark":12.55,"status":"ok"},{"mark":12.4,"status":"ok"}]'::jsonb),
    ('Shot Put', 'qualifying', '6', 'Kunal Bansal', 12.40, 6, true,
      '[{"mark":12.1,"status":"ok"},{"mark":12.4,"status":"ok"},{"mark":null,"status":"foul"},{"mark":12.2,"status":"ok"},{"mark":12.0,"status":"ok"}]'::jsonb),
    ('Shot Put', 'qualifying', '7', 'Nirav Joshi', 12.05, 7, true,
      '[{"mark":11.8,"status":"ok"},{"mark":12.05,"status":"ok"},{"mark":11.9,"status":"ok"},{"mark":null,"status":"foul"},{"mark":11.7,"status":"ok"}]'::jsonb),
    ('Shot Put', 'qualifying', '8', 'Rohit Kulkarni', 11.60, 8, true,
      '[{"mark":11.2,"status":"ok"},{"mark":11.6,"status":"ok"},{"mark":11.4,"status":"ok"},{"mark":11.1,"status":"ok"},{"mark":11.35,"status":"ok"}]'::jsonb),
    ('Shot Put', 'final', '1', 'Manav Gupta', 14.85, 1, false,
      '[{"mark":14.1,"status":"ok"},{"mark":14.6,"status":"ok"},{"mark":null,"status":"foul"},{"mark":14.85,"status":"ok"},{"mark":14.4,"status":"ok"}]'::jsonb),
    ('Shot Put', 'final', '2', 'Jay Mehta', 14.20, 2, false,
      '[{"mark":13.7,"status":"ok"},{"mark":14.2,"status":"ok"},{"mark":13.9,"status":"ok"},{"mark":14.0,"status":"ok"},{"mark":null,"status":"foul"}]'::jsonb),
    ('Shot Put', 'final', '3', 'Sagar Patil', 13.95, 3, false,
      '[{"mark":13.4,"status":"ok"},{"mark":13.95,"status":"ok"},{"mark":13.6,"status":"ok"},{"mark":13.7,"status":"ok"},{"mark":13.5,"status":"ok"}]'::jsonb),
    ('Shot Put', 'final', '4', 'Raghav Seth', 13.40, 4, false,
      '[{"mark":13.0,"status":"ok"},{"mark":null,"status":"foul"},{"mark":13.4,"status":"ok"},{"mark":13.2,"status":"ok"},{"mark":13.1,"status":"ok"}]'::jsonb),
    ('Shot Put', 'final', '5', 'Parth Shah', 13.05, 5, false,
      '[{"mark":12.8,"status":"ok"},{"mark":13.05,"status":"ok"},{"mark":12.9,"status":"ok"},{"mark":null,"status":"foul"},{"mark":12.7,"status":"ok"}]'::jsonb),
    ('Shot Put', 'final', '6', 'Kunal Bansal', 12.75, 6, false,
      '[{"mark":12.5,"status":"ok"},{"mark":12.75,"status":"ok"},{"mark":12.4,"status":"ok"},{"mark":12.6,"status":"ok"},{"mark":12.3,"status":"ok"}]'::jsonb),
    ('Shot Put', 'final', '7', 'Nirav Joshi', 12.30, 7, false,
      '[{"mark":12.0,"status":"ok"},{"mark":12.3,"status":"ok"},{"mark":null,"status":"foul"},{"mark":12.1,"status":"ok"},{"mark":11.9,"status":"ok"}]'::jsonb),
    ('Shot Put', 'final', '8', 'Rohit Kulkarni', 11.90, 8, false,
      '[{"mark":11.6,"status":"ok"},{"mark":11.9,"status":"ok"},{"mark":11.7,"status":"ok"},{"mark":11.5,"status":"ok"},{"mark":11.8,"status":"ok"}]'::jsonb),
    ('Long Jump', 'qualifying', '1', 'Avi Sharma', 6.85, 1, true,
      '[{"mark":6.4,"status":"ok"},{"mark":6.85,"status":"ok"},{"mark":null,"status":"foul"},{"mark":6.7,"status":"ok"},{"mark":6.6,"status":"ok"}]'::jsonb),
    ('Long Jump', 'qualifying', '2', 'Neil Kapoor', 6.62, 2, true,
      '[{"mark":6.3,"status":"ok"},{"mark":6.62,"status":"ok"},{"mark":6.5,"status":"ok"},{"mark":6.4,"status":"ok"},{"mark":null,"status":"foul"}]'::jsonb),
    ('Long Jump', 'qualifying', '3', 'Yash Jadhav', 6.48, 3, true,
      '[{"mark":6.2,"status":"ok"},{"mark":6.48,"status":"ok"},{"mark":6.3,"status":"ok"},{"mark":null,"status":"foul"},{"mark":6.35,"status":"ok"}]'::jsonb),
    ('Long Jump', 'qualifying', '4', 'Kabir Lal', 6.31, 4, true,
      '[{"mark":6.1,"status":"ok"},{"mark":6.31,"status":"ok"},{"mark":6.2,"status":"ok"},{"mark":6.15,"status":"ok"},{"mark":6.05,"status":"ok"}]'::jsonb),
    ('Long Jump', 'qualifying', '5', 'Arhaan Sheikh', 6.18, 5, true,
      '[{"mark":6.18,"status":"ok"},{"mark":null,"status":"foul"},{"mark":6.0,"status":"ok"},{"mark":5.95,"status":"ok"},{"mark":6.05,"status":"ok"}]'::jsonb),
    ('Long Jump', 'qualifying', '6', 'Dev Khurana', 6.02, 6, true,
      '[{"mark":5.9,"status":"ok"},{"mark":6.02,"status":"ok"},{"mark":5.85,"status":"ok"},{"mark":5.95,"status":"ok"},{"mark":null,"status":"foul"}]'::jsonb),
    ('Long Jump', 'qualifying', '7', 'Zayan Merchant', 5.88, 7, true,
      '[{"mark":5.7,"status":"ok"},{"mark":5.88,"status":"ok"},{"mark":5.8,"status":"ok"},{"mark":5.75,"status":"ok"},{"mark":5.82,"status":"ok"}]'::jsonb),
    ('Long Jump', 'qualifying', '8', 'Om Deshmukh', 5.70, 8, true,
      '[{"mark":5.5,"status":"ok"},{"mark":5.7,"status":"ok"},{"mark":null,"status":"foul"},{"mark":5.6,"status":"ok"},{"mark":5.55,"status":"ok"}]'::jsonb),
    ('Long Jump', 'final', '1', 'Avi Sharma', 7.12, 1, false,
      '[{"mark":6.9,"status":"ok"},{"mark":7.12,"status":"ok"},{"mark":6.95,"status":"ok"},{"mark":null,"status":"foul"},{"mark":7.0,"status":"ok"}]'::jsonb),
    ('Long Jump', 'final', '2', 'Neil Kapoor', 6.90, 2, false,
      '[{"mark":6.7,"status":"ok"},{"mark":6.9,"status":"ok"},{"mark":6.8,"status":"ok"},{"mark":6.75,"status":"ok"},{"mark":6.85,"status":"ok"}]'::jsonb),
    ('Long Jump', 'final', '3', 'Yash Jadhav', 6.71, 3, false,
      '[{"mark":6.5,"status":"ok"},{"mark":6.71,"status":"ok"},{"mark":null,"status":"foul"},{"mark":6.6,"status":"ok"},{"mark":6.55,"status":"ok"}]'::jsonb),
    ('Long Jump', 'final', '4', 'Kabir Lal', 6.52, 4, false,
      '[{"mark":6.4,"status":"ok"},{"mark":6.52,"status":"ok"},{"mark":6.35,"status":"ok"},{"mark":6.45,"status":"ok"},{"mark":null,"status":"foul"}]'::jsonb),
    ('Long Jump', 'final', '5', 'Arhaan Sheikh', 6.38, 5, false,
      '[{"mark":6.2,"status":"ok"},{"mark":6.38,"status":"ok"},{"mark":6.25,"status":"ok"},{"mark":6.3,"status":"ok"},{"mark":6.22,"status":"ok"}]'::jsonb),
    ('Long Jump', 'final', '6', 'Dev Khurana', 6.20, 6, false,
      '[{"mark":6.05,"status":"ok"},{"mark":6.2,"status":"ok"},{"mark":6.1,"status":"ok"},{"mark":null,"status":"foul"},{"mark":6.0,"status":"ok"}]'::jsonb),
    ('Long Jump', 'final', '7', 'Zayan Merchant', 6.05, 7, false,
      '[{"mark":5.9,"status":"ok"},{"mark":6.05,"status":"ok"},{"mark":5.95,"status":"ok"},{"mark":5.88,"status":"ok"},{"mark":5.98,"status":"ok"}]'::jsonb),
    ('Long Jump', 'final', '8', 'Om Deshmukh', 5.86, 8, false,
      '[{"mark":5.7,"status":"ok"},{"mark":5.86,"status":"ok"},{"mark":null,"status":"foul"},{"mark":5.75,"status":"ok"},{"mark":5.8,"status":"ok"}]'::jsonb)
) as v(event_name, round_type, lane, athlete_name, best, place, qualified, attempts)
  on v.event_name = cat.name
 and v.round_type = r.round_type
 and v.athlete_name = tm.name
where f.deleted_at is null
  and s.name = 'Athletics'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and m.match_number = 1
  and not exists (
    select 1 from public.fixture_match_participant p
    where p.fixture_match_id = m.id
      and p.participant_label = v.lane
      and p.deleted_at is null
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
    ('Shot Put', 1, 'Manav Gupta'),
    ('Shot Put', 2, 'Jay Mehta'),
    ('Shot Put', 3, 'Sagar Patil'),
    ('Shot Put', 4, 'Raghav Seth'),
    ('Shot Put', 5, 'Parth Shah'),
    ('Shot Put', 6, 'Kunal Bansal'),
    ('Shot Put', 7, 'Nirav Joshi'),
    ('Shot Put', 8, 'Rohit Kulkarni'),
    ('Long Jump', 1, 'Avi Sharma'),
    ('Long Jump', 2, 'Neil Kapoor'),
    ('Long Jump', 3, 'Yash Jadhav'),
    ('Long Jump', 4, 'Kabir Lal'),
    ('Long Jump', 5, 'Arhaan Sheikh'),
    ('Long Jump', 6, 'Dev Khurana'),
    ('Long Jump', 7, 'Zayan Merchant'),
    ('Long Jump', 8, 'Om Deshmukh')
) as v(event_name, rank, athlete_name)
  on v.event_name = cat.name and v.athlete_name = tm.name
where f.deleted_at is null
  and s.name = 'Athletics'
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
  and cat.name in ('Shot Put', 'Long Jump', '100m')
  and cat.gender = 'male'
  and cat.age_group = 'U16';
