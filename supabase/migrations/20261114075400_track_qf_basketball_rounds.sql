-- Track rounds may include quarter-finals.
-- Basketball league configs keep league + QF + SF + final + 3rd (SF/final were
-- dropped in the UI because they shared names with track rounds).

create or replace function private.fixture_validate_config()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rounds jsonb;
  has_league boolean;
  knockout_count integer;
  track_count integer;
  field_count integer;
  other_count integer;
  scoring text;
  participants integer;
begin
  new.config := coalesce(new.config, '{}'::jsonb);
  rounds := coalesce(new.config->'active_rounds', '[]'::jsonb);
  if jsonb_typeof(rounds) <> 'array' or jsonb_array_length(rounds) = 0 then
    raise exception 'Pick at least one round.';
  end if;

  if new.format_type::text in ('league_knockout', 'bracket_elimination') then
    new.config := jsonb_set(new.config, '{scoring_style}', '"simple"'::jsonb, true);
    new.config := jsonb_set(new.config, '{participants_per_match}', '2'::jsonb, true);

    has_league := rounds @> '"league"'::jsonb;
    select count(*) into knockout_count
    from jsonb_array_elements_text(rounds) as round_type
    where round_type in ('quarter_final', 'semi_final', 'final', 'third_place');

    if new.format_type::text = 'league_knockout' then
      if not has_league
        or not (rounds @> '"semi_final"'::jsonb)
        or not (rounds @> '"final"'::jsonb)
      then
        raise exception 'League + bracket needs league, semi, and final.';
      end if;
    else
      if has_league then
        raise exception 'Bracket elimination cannot include a league round.';
      end if;
      if knockout_count < 1 then
        raise exception 'Pick at least one knockout round.';
      end if;
    end if;

    return new;
  end if;

  if new.format_type::text = 'track_rounds' then
    scoring := coalesce(nullif(new.config->>'scoring_style', ''), 'time');
    if scoring <> 'time' then
      raise exception 'Track rounds use time scoring.';
    end if;
    new.config := jsonb_set(new.config, '{scoring_style}', to_jsonb(scoring), true);
    begin
      participants := coalesce((new.config->>'participants_per_match')::integer, 8);
    exception
      when others then
        participants := 8;
    end;
    if participants < 2 or participants > 24 then
      participants := 8;
    end if;
    new.config := jsonb_set(new.config, '{participants_per_match}', to_jsonb(participants), true);

    select
      count(*) filter (where round_type in ('heat', 'quarter_final', 'semi_final', 'final')),
      count(*) filter (where round_type not in ('heat', 'quarter_final', 'semi_final', 'final'))
    into track_count, other_count
    from jsonb_array_elements_text(rounds) as round_type;

    if track_count < 1 or other_count > 0 then
      raise exception 'Track rounds use heat, quarter-final, semi, and/or final.';
    end if;
    return new;
  end if;

  if new.format_type::text = 'field_attempts' then
    scoring := coalesce(nullif(new.config->>'scoring_style', ''), 'distance');
    if scoring not in ('distance', 'height') then
      raise exception 'Field attempts use distance or height scoring.';
    end if;
    new.config := jsonb_set(new.config, '{scoring_style}', to_jsonb(scoring), true);
    begin
      participants := coalesce((new.config->>'participants_per_match')::integer, 12);
    exception
      when others then
        participants := 12;
    end;
    if participants < 2 or participants > 24 then
      participants := 12;
    end if;
    new.config := jsonb_set(new.config, '{participants_per_match}', to_jsonb(participants), true);

    select
      count(*) filter (where round_type in ('qualifying', 'final')),
      count(*) filter (where round_type not in ('qualifying', 'final'))
    into field_count, other_count
    from jsonb_array_elements_text(rounds) as round_type;

    if field_count < 1 or other_count > 0 then
      raise exception 'Field attempts use qualifying and/or final.';
    end if;
    return new;
  end if;

  raise exception 'Unsupported fixture format.';
end;
$$;

update public.category c
set fixture_config = jsonb_set(
  c.fixture_config,
  '{available_rounds}',
  '["heat", "quarter_final", "semi_final", "final"]'::jsonb
)
from public.sport s
where s.id = c.sport_id
  and s.code = 'ATH'
  and s.deleted_at is null
  and c.deleted_at is null
  and c.fixture_config->>'format' = 'track_rounds';

update public.category c
set fixture_config = jsonb_set(
  c.fixture_config,
  '{available_rounds}',
  '["qualifying", "final"]'::jsonb
)
from public.sport s
where s.id = c.sport_id
  and s.code = 'ATH'
  and s.deleted_at is null
  and c.deleted_at is null
  and c.fixture_config->>'format' = 'field_attempts';

update public.category c
set fixture_config = c.fixture_config || jsonb_build_object(
  'available_rounds', '["league", "quarter_final", "semi_final", "final", "third_place"]'::jsonb,
  'available_formats', '["league_knockout", "bracket_elimination"]'::jsonb
)
from public.sport s
where s.id = c.sport_id
  and s.code = 'BKB'
  and s.deleted_at is null
  and c.deleted_at is null;

update public.fixture f
set config = jsonb_set(
  f.config,
  '{active_rounds}',
  coalesce(f.config->'active_rounds', '[]'::jsonb) || '["quarter_final"]'::jsonb
)
where f.deleted_at is null
  and f.format_type = 'track_rounds'
  and not (coalesce(f.config->'active_rounds', '[]'::jsonb) @> '"quarter_final"'::jsonb);

insert into public.fixture_round (fixture_id, round_type, round_number, round_label)
select f.id, 'quarter_final', 11, 'Quarter Finals'
from public.fixture f
where f.deleted_at is null
  and f.format_type = 'track_rounds'
  and not exists (
    select 1
    from public.fixture_round r
    where r.fixture_id = f.id
      and r.round_type = 'quarter_final'
      and r.deleted_at is null
  );

update public.fixture f
set config = jsonb_set(
  f.config,
  '{active_rounds}',
  (
    select jsonb_agg(to_jsonb(x.round) order by x.ord)
    from (
      values
        ('league', 1),
        ('quarter_final', 2),
        ('semi_final', 3),
        ('final', 4),
        ('third_place', 5)
    ) as x(round, ord)
  )
)
where f.deleted_at is null
  and f.format_type = 'league_knockout'
  and (
    not (coalesce(f.config->'active_rounds', '[]'::jsonb) @> '"semi_final"'::jsonb)
    or not (coalesce(f.config->'active_rounds', '[]'::jsonb) @> '"final"'::jsonb)
  );

insert into public.fixture_round (fixture_id, round_type, round_number, round_label)
select f.id, x.round_type, x.round_number, x.round_label
from public.fixture f
cross join (
  values
    ('quarter_final'::text, 11, 'Quarter Finals'),
    ('semi_final'::text, 12, 'Semi Finals'),
    ('final'::text, 13, 'Final'),
    ('third_place'::text, 14, '3rd Place')
) as x(round_type, round_number, round_label)
where f.deleted_at is null
  and f.format_type = 'league_knockout'
  and not exists (
    select 1
    from public.fixture_round r
    where r.fixture_id = f.id
      and r.round_type = x.round_type
      and r.deleted_at is null
  );
