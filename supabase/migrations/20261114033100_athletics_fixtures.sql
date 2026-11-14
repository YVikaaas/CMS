-- Athletics heats / flights: N athletes, track times or field marks.
-- Basketball two-team matches stay on league_knockout / bracket_elimination.

alter table public.fixture_round
  drop constraint if exists fixture_round_type_check;

alter table public.fixture_round
  add constraint fixture_round_type_check check (
    round_type in (
      'league',
      'quarter_final',
      'semi_final',
      'final',
      'third_place',
      'heat',
      'qualifying'
    )
  );

alter table public.fixture_match_participant
  drop constraint if exists fixture_match_participant_label_check;

alter table public.fixture_match_participant
  add constraint fixture_match_participant_label_check
    check (participant_label ~ '^[1-9][0-9]?$');

alter table public.fixture_match_participant
  drop constraint if exists fixture_match_participant_athlete_fk;

alter table public.fixture_match_participant
  add constraint fixture_match_participant_athlete_fk
    foreign key (athlete_id) references public.team_member (id) on delete restrict;

create unique index if not exists fixture_match_participant_athlete_live_idx
  on public.fixture_match_participant (fixture_match_id, athlete_id)
  where deleted_at is null and athlete_id is not null;

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
      if not has_league or knockout_count < 1 then
        raise exception 'League + bracket needs a league round and at least one knockout round.';
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
      count(*) filter (where round_type in ('heat', 'semi_final', 'final')),
      count(*) filter (where round_type not in ('heat', 'semi_final', 'final'))
    into track_count, other_count
    from jsonb_array_elements_text(rounds) as round_type;

    if track_count < 1 or other_count > 0 then
      raise exception 'Track rounds use heat, semi, and/or final.';
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

create or replace function private.fixture_participant_athlete_csc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_team uuid;
  member_deleted timestamptz;
  team_csc uuid;
  team_deleted timestamptz;
  fixture_csc uuid;
begin
  if new.athlete_id is null then
    return new;
  end if;

  select team_id, deleted_at
    into member_team, member_deleted
  from public.team_member
  where id = new.athlete_id;

  if not found or member_deleted is not null then
    raise exception 'Athlete was not found.';
  end if;

  select competition_sport_category_map_id, deleted_at
    into team_csc, team_deleted
  from public.team
  where id = member_team;

  if not found or team_deleted is not null then
    raise exception 'Athlete team was not found.';
  end if;

  select f.competition_sport_category_map_id into fixture_csc
  from public.fixture_match m
  join public.fixture_round r on r.id = m.fixture_round_id
  join public.fixture f on f.id = r.fixture_id
  where m.id = new.fixture_match_id;

  if fixture_csc is null or fixture_csc is distinct from team_csc then
    raise exception 'Athlete is not in this championship category.';
  end if;

  return new;
end;
$$;

drop trigger if exists fixture_participant_athlete_csc on public.fixture_match_participant;

create trigger fixture_participant_athlete_csc
  before insert or update of athlete_id, fixture_match_id
  on public.fixture_match_participant
  for each row
  execute function private.fixture_participant_athlete_csc();

create or replace function public.save_fixture_match_scores(
  p_match_id uuid,
  p_scores jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec jsonb;
  v_participant_id uuid;
  v_score text;
  v_score_detail jsonb;
  v_result_status text;
  v_match_deleted timestamptz;
  v_belongs boolean;
  v_position integer;
  v_attempts jsonb;
begin
  if not private.is_admin() then
    raise exception 'Not allowed.';
  end if;

  if p_match_id is null then
    raise exception 'Match is required.';
  end if;

  if p_scores is null or jsonb_typeof(p_scores) <> 'array' then
    raise exception 'Scores must be a JSON array.';
  end if;

  select deleted_at into v_match_deleted
  from public.fixture_match
  where id = p_match_id;

  if not found or v_match_deleted is not null then
    raise exception 'Match was not found.';
  end if;

  for rec in select value from jsonb_array_elements(p_scores)
  loop
    begin
      v_participant_id := nullif(rec->>'participant_id', '')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'participant_id is required.';
    end;

    if v_participant_id is null then
      raise exception 'participant_id is required.';
    end if;

    select exists (
      select 1
      from public.fixture_match_participant
      where id = v_participant_id
        and fixture_match_id = p_match_id
        and deleted_at is null
    ) into v_belongs;

    if not v_belongs then
      raise exception 'Participant does not belong to this match.';
    end if;

    v_result_status := coalesce(nullif(rec->>'result_status', ''), 'pending');
    if v_result_status not in (
      'winner',
      'loser',
      'draw',
      'dns',
      'dnf',
      'dq',
      'bye',
      'pending',
      'no_show',
      'qualified'
    ) then
      raise exception 'Invalid result status.';
    end if;

    v_score := coalesce(rec->>'score', '');
    if rec ? 'score_detail' and rec->'score_detail' is not null
      and jsonb_typeof(rec->'score_detail') <> 'null' then
      v_score_detail := rec->'score_detail';
    else
      v_score_detail := '{}'::jsonb;
    end if;

    v_position := null;
    if rec ? 'position' and rec->>'position' is not null and rec->>'position' <> '' then
      begin
        v_position := (rec->>'position')::integer;
      exception
        when others then
          raise exception 'Invalid position.';
      end;
    end if;

    if rec ? 'attempts' and rec->'attempts' is not null
      and jsonb_typeof(rec->'attempts') = 'array' then
      v_attempts := rec->'attempts';
    else
      v_attempts := null;
    end if;

    update public.fixture_match_participant
    set
      score = v_score,
      score_detail = v_score_detail,
      result_status = v_result_status::public.fixture_participant_result,
      position = case when rec ? 'position' then v_position else position end,
      attempts = case when v_attempts is not null then v_attempts else attempts end
    where id = v_participant_id;
  end loop;
end;
$$;

revoke all on function public.save_fixture_match_scores(uuid, jsonb) from public;
revoke all on function public.save_fixture_match_scores(uuid, jsonb) from anon;
grant execute on function public.save_fixture_match_scores(uuid, jsonb) to authenticated;

insert into public.sport (name, code, event_mode)
select 'Athletics', 'ATH', 'solo'::public.sport_event_mode
where not exists (
  select 1 from public.sport where code = 'ATH' and deleted_at is null
);

insert into public.category (
  sport_id, name, gender, age_group, age_min, age_max,
  team_size, max_team_size, fixture_config
)
select
  s.id,
  'Athletics',
  v.gender,
  v.age_group,
  4,
  v.age_max,
  1,
  12,
  jsonb_build_object(
    'format', 'track_rounds',
    'scoring_style', 'time',
    'available_rounds', jsonb_build_array(
      'heat', 'semi_final', 'final', 'qualifying'
    ),
    'available_formats', jsonb_build_array('track_rounds', 'field_attempts'),
    'participants_per_match', 8
  )
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
where s.code = 'ATH' and s.deleted_at is null
  and not exists (
    select 1
    from public.category c
    where c.sport_id = s.id
      and c.gender = v.gender
      and c.age_group = v.age_group
      and c.deleted_at is null
  );
