-- Call Room loads in one round trip: fixtures, matches and attendance for a championship.
-- Row shapes mirror FIXTURE_SELECT / MATCH_SELECT in lib/services/fixtures.ts so the existing
-- toFixture / toMatch mappers read them unchanged. security invoker: caller's RLS still applies.

create or replace function public.call_room_board(p_championship_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with live_fixture as (
    select f.*
    from public.fixture f
    join public.competition_sport_category_map csc on csc.id = f.competition_sport_category_map_id
    join public.competition_sport_map csm on csm.id = csc.competition_sport_id
    join public.competition c on c.id = csm.competition_id
    where csm.competition_id = p_championship_id
      and f.deleted_at is null
      and csc.deleted_at is null
      and csm.deleted_at is null
      and c.deleted_at is null
  ),
  fixtures as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id,
      'competition_sport_category_map_id', f.competition_sport_category_map_id,
      'format_type', f.format_type,
      'config', f.config,
      'status', f.status,
      'rankings_locked_at', f.rankings_locked_at,
      'start_date', f.start_date,
      'end_date', f.end_date,
      'created_at', f.created_at,
      'csc', (
        select jsonb_build_object(
          'id', csc.id,
          'category_id', csc.category_id,
          'deleted_at', csc.deleted_at,
          'category', (
            select jsonb_build_object('id', cat.id, 'gender', cat.gender, 'age_group', cat.age_group, 'name', cat.name)
            from public.category cat where cat.id = csc.category_id
          ),
          'csm', (
            select jsonb_build_object(
              'sport_id', csm.sport_id,
              'sport', (select jsonb_build_object('name', s.name) from public.sport s where s.id = csm.sport_id),
              'competition', (
                select jsonb_build_object('id', c.id, 'name', c.name, 'deleted_at', c.deleted_at)
                from public.competition c where c.id = csm.competition_id
              )
            )
            from public.competition_sport_map csm where csm.id = csc.competition_sport_id
          )
        )
        from public.competition_sport_category_map csc where csc.id = f.competition_sport_category_map_id
      ),
      'fixture_round', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id,
          'fixture_id', r.fixture_id,
          'round_type', r.round_type,
          'round_number', r.round_number,
          'round_label', r.round_label,
          'attempt_count', r.attempt_count,
          'extra_attempt_count', r.extra_attempt_count,
          'deleted_at', r.deleted_at,
          'fixture_match', (
            select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'deleted_at', m.deleted_at)), '[]'::jsonb)
            from public.fixture_match m where m.fixture_round_id = r.id
          )
        )), '[]'::jsonb)
        from public.fixture_round r where r.fixture_id = f.id
      )
    ) order by f.created_at), '[]'::jsonb) as rows
    from live_fixture f
  ),
  live_match as (
    select m.*
    from public.fixture_match m
    join public.fixture_round r on r.id = m.fixture_round_id
    join live_fixture f on f.id = r.fixture_id
    where m.deleted_at is null
  ),
  matches as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id,
      'fixture_round_id', m.fixture_round_id,
      'match_number', m.match_number,
      'match_label', m.match_label,
      'venue', m.venue,
      'scheduled_at', m.scheduled_at,
      'status', m.status,
      'round', (
        select jsonb_build_object(
          'id', r.id, 'fixture_id', r.fixture_id, 'round_type', r.round_type, 'round_label', r.round_label,
          'attempt_count', r.attempt_count, 'extra_attempt_count', r.extra_attempt_count, 'deleted_at', r.deleted_at
        )
        from public.fixture_round r where r.id = m.fixture_round_id
      ),
      'sides', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id,
          'participant_label', p.participant_label,
          'team_id', p.team_id,
          'athlete_id', p.athlete_id,
          'score', p.score,
          'score_detail', p.score_detail,
          'result_status', p.result_status,
          'position', p.position,
          'attempts', p.attempts,
          'deleted_at', p.deleted_at,
          'team', (
            select jsonb_build_object('name', t.name, 'org_name', t.org_name, 'city', t.city)
            from public.team t where t.id = p.team_id
          ),
          'athlete', (
            select jsonb_build_object(
              'id', a.id, 'name', a.name, 'team_id', a.team_id,
              'team', (
                select jsonb_build_object('name', t.name, 'org_name', t.org_name, 'city', t.city)
                from public.team t where t.id = a.team_id
              )
            )
            from public.team_member a where a.id = p.athlete_id
          )
        )), '[]'::jsonb)
        from public.fixture_match_participant p where p.fixture_match_id = m.id
      )
    ) order by m.match_number), '[]'::jsonb) as rows
    from live_match m
  ),
  attendance as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'fixture_match_id', a.fixture_match_id,
      'team_id', a.team_id,
      'team_member_id', a.team_member_id,
      'status', a.status
    )), '[]'::jsonb) as rows
    from public.fixture_match_attendance a
    join live_match m on m.id = a.fixture_match_id
    where a.deleted_at is null
  )
  select jsonb_build_object(
    'fixtures', (select rows from fixtures),
    'matches', (select rows from matches),
    'attendance', (select rows from attendance)
  );
$$;

revoke all on function public.call_room_board(uuid) from public, anon;
grant execute on function public.call_room_board(uuid) to authenticated;
