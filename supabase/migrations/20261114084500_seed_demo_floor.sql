-- Demo floor data: complete basketball + athletics fixtures with scores and rankings.
-- Championship: BB Championship December.

-- ---------------------------------------------------------------------------
-- Basketball Boys U16: 4 extra teams, remaining rounds, ranking
-- ---------------------------------------------------------------------------
with csc as (
  select csc.id
  from public.competition c
  join public.competition_sport_map csm
    on csm.competition_id = c.id and csm.deleted_at is null
  join public.sport s on s.id = csm.sport_id
  join public.competition_sport_category_map csc
    on csc.competition_sport_id = csm.id and csc.deleted_at is null
  join public.category cat on cat.id = csc.category_id
  where c.deleted_at is null
    and c.name = 'BB Championship December'
    and s.name = 'Basketball'
    and cat.gender = 'male'
    and cat.age_group = 'U16'
  limit 1
),
ins_teams as (
  insert into public.team (competition_sport_category_map_id, name, org_name, gender)
  select csc.id, v.name, v.org_name, 'male'
  from csc
  cross join (
    values
      ('Bengaluru Blasters', 'Bengaluru Basketball Club'),
      ('Chennai Chargers', 'Chennai Basketball Club'),
      ('Hyderabad Hawks', 'Hyderabad Basketball Club'),
      ('Kolkata Knights', 'Kolkata Basketball Club')
  ) as v(name, org_name)
  where not exists (
    select 1 from public.team t
    where t.competition_sport_category_map_id = csc.id
      and lower(t.name) = lower(v.name)
      and t.deleted_at is null
  )
  returning id, name
)
insert into public.team_member (team_id, name, phone, gender)
select t.id, m.name, m.phone, 'male'
from public.team t
join csc on csc.id = t.competition_sport_category_map_id
join (
  values
    ('Bengaluru Blasters', 'Nikhil Reddy', '9876611501'),
    ('Bengaluru Blasters', 'Aditya Rao', '9876611502'),
    ('Bengaluru Blasters', 'Kiran Shetty', '9876611503'),
    ('Bengaluru Blasters', 'Pranav Hegde', '9876611504'),
    ('Bengaluru Blasters', 'Varun Gowda', '9876611505'),
    ('Chennai Chargers', 'Arun Krishnan', '9876611601'),
    ('Chennai Chargers', 'Sanjay Iyer', '9876611602'),
    ('Chennai Chargers', 'Rahul Natarajan', '9876611603'),
    ('Chennai Chargers', 'Vignesh Kumar', '9876611604'),
    ('Chennai Chargers', 'Hari Prasad', '9876611605'),
    ('Hyderabad Hawks', 'Faizan Ali', '9876611701'),
    ('Hyderabad Hawks', 'Rohit Reddy', '9876611702'),
    ('Hyderabad Hawks', 'Samar Khan', '9876611703'),
    ('Hyderabad Hawks', 'Anirudh Rao', '9876611704'),
    ('Hyderabad Hawks', 'Tejas Naidu', '9876611705'),
    ('Kolkata Knights', 'Ayan Banerjee', '9876611801'),
    ('Kolkata Knights', 'Ritwik Sen', '9876611802'),
    ('Kolkata Knights', 'Soumya Ghosh', '9876611803'),
    ('Kolkata Knights', 'Debanjan Roy', '9876611804'),
    ('Kolkata Knights', 'Arindam Bose', '9876611805')
) as m(team_name, name, phone) on m.team_name = t.name
where t.deleted_at is null
  and not exists (
    select 1 from public.team_member existing
    where lower(existing.name) = lower(m.name)
      and existing.phone = m.phone
      and existing.deleted_at is null
  );

insert into public.fixture_match (
  fixture_round_id, match_number, match_label, venue, scheduled_at, status
)
select r.id, v.match_number, v.match_label, 'Court 1', v.scheduled_at, 'completed'
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.fixture_round r on r.fixture_id = f.id and r.deleted_at is null
join (
  values
    ('league', 2, '2', timestamptz '2026-12-05 10:00+05:30'),
    ('league', 3, '3', timestamptz '2026-12-05 11:30+05:30'),
    ('league', 4, '4', timestamptz '2026-12-05 13:00+05:30'),
    ('league', 5, '5', timestamptz '2026-12-05 14:30+05:30'),
    ('league', 6, '6', timestamptz '2026-12-05 16:00+05:30'),
    ('league', 7, '7', timestamptz '2026-12-06 09:00+05:30'),
    ('league', 8, '8', timestamptz '2026-12-06 10:30+05:30'),
    ('quarter_final', 1, 'QF 1', timestamptz '2026-12-06 16:00+05:30'),
    ('quarter_final', 2, 'QF 2', timestamptz '2026-12-06 17:30+05:30'),
    ('quarter_final', 3, 'QF 3', timestamptz '2026-12-06 19:00+05:30'),
    ('quarter_final', 4, 'QF 4', timestamptz '2026-12-06 20:30+05:30'),
    ('semi_final', 1, 'SF 1', timestamptz '2026-12-07 16:00+05:30'),
    ('semi_final', 2, 'SF 2', timestamptz '2026-12-07 18:00+05:30'),
    ('final', 1, 'Final', timestamptz '2026-12-08 18:00+05:30'),
    ('third_place', 1, '3rd Place', timestamptz '2026-12-08 16:00+05:30')
) as v(round_type, match_number, match_label, scheduled_at)
  on v.round_type = r.round_type
where f.deleted_at is null
  and s.name = 'Basketball'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_match m
    where m.fixture_round_id = r.id
      and m.match_number = v.match_number
      and m.deleted_at is null
  );

insert into public.fixture_match_participant (
  fixture_match_id, team_id, participant_label, score, score_detail, result_status
)
select m.id, t.id, v.side, v.s1::text || '-' || v.s2::text,
  jsonb_build_object(
    'score', case when v.side = '1' then v.s1 else v.s2 end,
    'fouls', v.fouls,
    'sport', 'Basketball',
    'scoring_mode', 'both'
  ),
  v.result_status::public.fixture_participant_result
from public.fixture f
join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
join public.category cat on cat.id = csc.category_id
join public.competition_sport_map csm on csm.id = csc.competition_sport_id
join public.sport s on s.id = csm.sport_id
join public.fixture_round r on r.fixture_id = f.id and r.deleted_at is null
join public.fixture_match m
  on m.fixture_round_id = r.id and m.deleted_at is null
join public.team t
  on t.competition_sport_category_map_id = csc.id and t.deleted_at is null
join (
  values
    ('league', 2, '1', 'Mumbai Mavericks', 61, 58, 4, 'winner'),
    ('league', 2, '2', 'Pune Panthers', 61, 58, 5, 'loser'),
    ('league', 3, '1', 'Bengaluru Blasters', 55, 52, 3, 'winner'),
    ('league', 3, '2', 'Chennai Chargers', 55, 52, 6, 'loser'),
    ('league', 4, '1', 'Hyderabad Hawks', 49, 64, 7, 'loser'),
    ('league', 4, '2', 'Kolkata Knights', 49, 64, 2, 'winner'),
    ('league', 5, '1', 'Delhi Dynamos', 70, 63, 4, 'winner'),
    ('league', 5, '2', 'Mumbai Mavericks', 70, 63, 5, 'loser'),
    ('league', 6, '1', 'Pune Panthers', 58, 54, 3, 'winner'),
    ('league', 6, '2', 'Jaipur Jaguars', 58, 54, 4, 'loser'),
    ('league', 7, '1', 'Bengaluru Blasters', 51, 57, 6, 'loser'),
    ('league', 7, '2', 'Hyderabad Hawks', 51, 57, 3, 'winner'),
    ('league', 8, '1', 'Chennai Chargers', 60, 62, 5, 'loser'),
    ('league', 8, '2', 'Kolkata Knights', 60, 62, 4, 'winner'),
    ('quarter_final', 1, '1', 'Delhi Dynamos', 68, 51, 3, 'winner'),
    ('quarter_final', 1, '2', 'Kolkata Knights', 68, 51, 6, 'loser'),
    ('quarter_final', 2, '1', 'Mumbai Mavericks', 59, 55, 4, 'winner'),
    ('quarter_final', 2, '2', 'Hyderabad Hawks', 59, 55, 5, 'loser'),
    ('quarter_final', 3, '1', 'Pune Panthers', 63, 50, 2, 'winner'),
    ('quarter_final', 3, '2', 'Chennai Chargers', 63, 50, 7, 'loser'),
    ('quarter_final', 4, '1', 'Jaipur Jaguars', 66, 61, 4, 'winner'),
    ('quarter_final', 4, '2', 'Bengaluru Blasters', 66, 61, 5, 'loser'),
    ('semi_final', 1, '1', 'Delhi Dynamos', 71, 64, 3, 'winner'),
    ('semi_final', 1, '2', 'Mumbai Mavericks', 71, 64, 4, 'loser'),
    ('semi_final', 2, '1', 'Pune Panthers', 58, 55, 5, 'winner'),
    ('semi_final', 2, '2', 'Jaipur Jaguars', 58, 55, 6, 'loser'),
    ('final', 1, '1', 'Delhi Dynamos', 74, 69, 4, 'winner'),
    ('final', 1, '2', 'Pune Panthers', 74, 69, 5, 'loser'),
    ('third_place', 1, '1', 'Mumbai Mavericks', 62, 57, 3, 'winner'),
    ('third_place', 1, '2', 'Jaipur Jaguars', 62, 57, 4, 'loser')
) as v(round_type, match_number, side, team_name, s1, s2, fouls, result_status)
  on v.round_type = r.round_type
 and v.match_number = m.match_number
 and v.team_name = t.name
where f.deleted_at is null
  and s.name = 'Basketball'
  and cat.gender = 'male'
  and cat.age_group = 'U16'
  and not exists (
    select 1 from public.fixture_match_participant p
    where p.fixture_match_id = m.id
      and p.participant_label = v.side
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
    (1, 'Delhi Dynamos'),
    (2, 'Pune Panthers'),
    (3, 'Mumbai Mavericks'),
    (4, 'Jaipur Jaguars'),
    (5, 'Kolkata Knights'),
    (6, 'Hyderabad Hawks'),
    (7, 'Bengaluru Blasters'),
    (8, 'Chennai Chargers')
) as v(rank, team_name) on v.team_name = t.name
where f.deleted_at is null
  and s.name = 'Basketball'
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
  and s.name = 'Basketball'
  and cat.gender = 'male'
  and cat.age_group = 'U16';
