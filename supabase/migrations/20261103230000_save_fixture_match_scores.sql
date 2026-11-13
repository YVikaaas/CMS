-- Admin scoring RPC: write participant score / score_detail / result_status.
-- Does not change fixture_match.status.

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

    update public.fixture_match_participant
    set
      score = v_score,
      score_detail = v_score_detail,
      result_status = v_result_status::public.fixture_participant_result
    where id = v_participant_id;
  end loop;
end;
$$;

revoke all on function public.save_fixture_match_scores(uuid, jsonb) from public;
revoke all on function public.save_fixture_match_scores(uuid, jsonb) from anon;
grant execute on function public.save_fixture_match_scores(uuid, jsonb) to authenticated;
