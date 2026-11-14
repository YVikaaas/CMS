-- Podium: lock 1st–3rd on the fixture, then mark medal delivery on those ranking rows.

alter table public.fixture
  add column if not exists rankings_locked_at timestamptz;

alter table public.fixture_ranking
  add column if not exists medal_delivered_at timestamptz;

create or replace function private.fixture_ranking_locked_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_at timestamptz;
  fixture_id uuid;
begin
  fixture_id := coalesce(new.fixture_id, old.fixture_id);
  select f.rankings_locked_at into locked_at
  from public.fixture f
  where f.id = fixture_id;

  if locked_at is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Ranking is locked.';
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Ranking is locked.';
  end if;

  if new.rank is distinct from old.rank
     or new.team_id is distinct from old.team_id
     or new.athlete_id is distinct from old.athlete_id
     or new.deleted_at is distinct from old.deleted_at
     or new.fixture_id is distinct from old.fixture_id then
    raise exception 'Ranking is locked.';
  end if;

  return new;
end;
$$;

drop trigger if exists fixture_ranking_locked_guard on public.fixture_ranking;
create trigger fixture_ranking_locked_guard
  before insert or update or delete on public.fixture_ranking
  for each row
  execute function private.fixture_ranking_locked_guard();
