-- Field 3+2 means 3 attempts in qualifying and 2 in the final, not extras.

alter table public.fixture_round
  alter column extra_attempt_count set default 0;

update public.fixture_round r
set
  attempt_count = case when r.round_type = 'final' then 2 else 3 end,
  extra_attempt_count = 0
from public.fixture f
where f.id = r.fixture_id
  and f.format_type = 'field_attempts'
  and r.deleted_at is null;

update public.fixture_match_participant p
set
  attempts = trimmed.attempts,
  score = coalesce(trimmed.best::text, p.score),
  score_detail = jsonb_set(
    jsonb_set(
      coalesce(p.score_detail, '{}'::jsonb),
      '{attempts}',
      trimmed.attempts,
      true
    ),
    '{mark}',
    to_jsonb(trimmed.best),
    true
  )
from (
  select
    p2.id,
    (
      select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
      from jsonb_array_elements(
        case
          when jsonb_typeof(p2.attempts) = 'array' and jsonb_array_length(p2.attempts) > 0
            then p2.attempts
          when jsonb_typeof(p2.score_detail->'attempts') = 'array'
            then p2.score_detail->'attempts'
          else '[]'::jsonb
        end
      ) with ordinality as t(elem, ord)
      where t.ord <= r.attempt_count
    ) as attempts,
    (
      select max((elem->>'mark')::numeric)
      from jsonb_array_elements(
        case
          when jsonb_typeof(p2.attempts) = 'array' and jsonb_array_length(p2.attempts) > 0
            then p2.attempts
          when jsonb_typeof(p2.score_detail->'attempts') = 'array'
            then p2.score_detail->'attempts'
          else '[]'::jsonb
        end
      ) with ordinality as t(elem, ord)
      where t.ord <= r.attempt_count
        and elem->>'status' = 'ok'
        and elem->>'mark' is not null
        and elem->>'mark' <> ''
    ) as best
  from public.fixture_match_participant p2
  join public.fixture_match m on m.id = p2.fixture_match_id
  join public.fixture_round r on r.id = m.fixture_round_id
  join public.fixture f on f.id = r.fixture_id
  where p2.deleted_at is null
    and m.deleted_at is null
    and f.format_type = 'field_attempts'
) as trimmed
where p.id = trimmed.id;
