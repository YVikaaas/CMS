import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/utils/labels";
import {
  formatScoreLine,
  isBasketPoints,
  isFixtureRoundType,
  isLeagueRound,
  MATCH_STATUSES,
  officialTeamPoints,
  parseParticipantResult,
  parseScoreDetail,
  parseScoringMode,
  roundLabel,
  roundNumber,
  sortRoundTypes,
  sumPlayerPoints,
  detectWinnerFromPoints,
  validateFixtureRounds,
  winnerFromResults,
} from "@/lib/utils/fixtures";
import type {
  BasketPoints,
  Fixture,
  FixtureFormatType,
  FixtureMatch,
  FixtureMatchStatus,
  FixtureParticipantResult,
  FixtureRound,
  FixtureRoundType,
  FixtureStatus,
  Gender,
  MatchScoreEvent,
  MatchWinner,
  ScoringMode,
  ServiceError,
  ServiceResult,
} from "@/lib/types/cms";
import { toServiceError } from "./errors";
import { listCscOptions, listTeams } from "./teams";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type CategoryFields = {
  id: string;
  gender: Gender;
  age_group: string;
  name: string;
};

type CscNested = {
  id: string;
  category_id: string;
  deleted_at: string | null;
  category: CategoryFields | CategoryFields[] | null;
  csm: {
    sport_id: string;
    sport: { name: string } | { name: string }[] | null;
    competition:
      | { id: string; name: string; deleted_at: string | null }
      | { id: string; name: string; deleted_at: string | null }[]
      | null;
  } | null;
};

type RoundNested = {
  id: string;
  fixture_id: string;
  round_type: string;
  round_number: number;
  round_label: string;
  deleted_at: string | null;
  fixture_match?: Array<{ id: string; deleted_at: string | null }> | null;
};

type FixtureRow = {
  id: string;
  competition_sport_category_map_id: string;
  format_type: FixtureFormatType;
  status: FixtureStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  csc: CscNested | CscNested[] | null;
  fixture_round?: RoundNested[] | null;
};

function nestedRounds(rounds: RoundNested[] | null | undefined, fixtureId: string): FixtureRound[] {
  return (rounds ?? [])
    .filter((round) => !round.deleted_at && isFixtureRoundType(round.round_type))
    .sort((a, b) => a.round_number - b.round_number)
    .map((round) => ({
      id: round.id,
      fixtureId,
      roundType: round.round_type as FixtureRoundType,
      roundNumber: round.round_number,
      roundLabel: round.round_label,
    }));
}

function liveMatchCount(rounds: RoundNested[] | null | undefined): number {
  return (rounds ?? [])
    .filter((round) => !round.deleted_at)
    .reduce(
      (sum, round) =>
        sum + (round.fixture_match ?? []).filter((match) => !match.deleted_at).length,
      0,
    );
}

function toFixture(row: FixtureRow): Fixture | null {
  const csc = unwrap(row.csc);
  const category = unwrap(csc?.category);
  const csm = unwrap(csc?.csm);
  const competition = unwrap(csm?.competition);
  const sport = unwrap(csm?.sport);
  if (!csc || csc.deleted_at || !category || !csm || !competition || competition.deleted_at) {
    return null;
  }
  return {
    id: row.id,
    cscId: row.competition_sport_category_map_id,
    championshipId: competition.id,
    championshipName: competition.name,
    sportId: csm.sport_id,
    sportName: sport?.name ?? "",
    categoryId: category.id,
    categoryLabel: categoryLabel({
      gender: category.gender,
      ageGroup: category.age_group,
      name: category.name,
    }),
    formatType: row.format_type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    matchCount: liveMatchCount(row.fixture_round),
    rounds: nestedRounds(row.fixture_round, row.id),
    createdAt: row.created_at,
  };
}

const FIXTURE_SELECT = `
  id,
  competition_sport_category_map_id,
  format_type,
  status,
  start_date,
  end_date,
  created_at,
  csc:competition_sport_category_map_id (
    id,
    category_id,
    deleted_at,
    category:category_id (id, gender, age_group, name),
    csm:competition_sport_id (
      sport_id,
      sport:sport_id (name),
      competition:competition_id (id, name, deleted_at)
    )
  ),
  fixture_round (id, fixture_id, round_type, round_number, round_label, deleted_at, fixture_match (id, deleted_at))
`;

export async function listFixtures(
  championshipId: string,
): Promise<ServiceResult<Fixture[]>> {
  const cscs = await listCscOptions({ championshipId });
  if (cscs.error) return { data: null, error: cscs.error };
  const cscIds = (cscs.data ?? []).map((item) => item.id);
  if (cscIds.length === 0) return { data: [], error: null };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture")
    .select(FIXTURE_SELECT)
    .in("competition_sport_category_map_id", cscIds)
    .is("deleted_at", null)
    .order("created_at");
  if (error) return { data: null, error: toServiceError(error) };

  return {
    data: (data ?? [])
      .map((row) => toFixture(row as unknown as FixtureRow))
      .filter((row): row is Fixture => Boolean(row)),
    error: null,
  };
}

export async function getFixture(id: string): Promise<ServiceResult<Fixture>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture")
    .select(FIXTURE_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  if (!data) return { data: null, error: { message: "Fixture was not found." } };
  const fixture = toFixture(data as unknown as FixtureRow);
  if (!fixture) return { data: null, error: { message: "Fixture was not found." } };
  return { data: fixture, error: null };
}

export async function createFixture(input: {
  cscId: string;
  formatType: FixtureFormatType;
  rounds: FixtureRoundType[];
  startDate: string | null;
  endDate: string | null;
}): Promise<ServiceResult<Fixture>> {
  const roundsErr = validateFixtureRounds(input.formatType, input.rounds);
  if (roundsErr) return { data: null, error: { message: roundsErr } };
  const cscs = await listCscOptions();
  if (cscs.error) return { data: null, error: cscs.error };
  const csc = (cscs.data ?? []).find((item) => item.id === input.cscId);
  if (!csc) return { data: null, error: { message: "Championship category was not found." } };
  const allowed = new Set(csc.availableRounds);
  if (input.rounds.some((round) => !allowed.has(round))) {
    return { data: null, error: { message: "One of the selected rounds is not available." } };
  }

  const ordered = sortRoundTypes([...new Set(input.rounds)]);
  const supabase = createClient();
  const { data: existing, error: existingError } = await supabase
    .from("fixture")
    .select("id")
    .eq("competition_sport_category_map_id", input.cscId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingError) return { data: null, error: toServiceError(existingError) };
  if (existing) {
    return { data: null, error: { message: "This category already has a fixture." } };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("fixture")
    .insert({
      competition_sport_category_map_id: input.cscId,
      format_type: input.formatType,
      config: {
        active_rounds: ordered,
        participants_per_match: 2,
        scoring_style: "simple",
      },
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };

  for (const round of ordered) {
    const { error: roundError } = await supabase.from("fixture_round").insert({
      fixture_id: data.id,
      round_type: round,
      round_number: roundNumber(round),
      round_label: roundLabel(round),
    });
    if (roundError) {
      await archiveFixture(data.id);
      return { data: null, error: toServiceError(roundError) };
    }
  }

  return getFixture(data.id);
}

export async function updateFixture(
  id: string,
  input: {
    status: FixtureStatus;
    startDate: string | null;
    endDate: string | null;
  },
): Promise<ServiceResult<Fixture>> {
  const current = await getFixture(id);
  if (current.error || !current.data) return current;
  const supabase = createClient();
  const { error } = await supabase
    .from("fixture")
    .update({
      status: input.status,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
    })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return getFixture(id);
}

export async function archiveFixture(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data: rounds, error: roundsError } = await supabase
    .from("fixture_round")
    .select("id")
    .eq("fixture_id", id)
    .is("deleted_at", null);
  if (roundsError) return { data: null, error: toServiceError(roundsError) };
  const roundIds = (rounds ?? []).map((row) => row.id);
  if (roundIds.length > 0) {
    const { data: matches, error: matchesError } = await supabase
      .from("fixture_match")
      .select("id")
      .in("fixture_round_id", roundIds)
      .is("deleted_at", null);
    if (matchesError) return { data: null, error: toServiceError(matchesError) };
    const matchIds = (matches ?? []).map((row) => row.id);
    if (matchIds.length > 0) {
      const eventsError = await archiveScoreEventsForMatches(matchIds, now);
      if (eventsError) return { data: null, error: eventsError };
      const { error: sidesError } = await supabase
        .from("fixture_match_participant")
        .update({ deleted_at: now })
        .in("fixture_match_id", matchIds)
        .is("deleted_at", null);
      if (sidesError) return { data: null, error: toServiceError(sidesError) };
      const { error: matchError } = await supabase
        .from("fixture_match")
        .update({ deleted_at: now })
        .in("id", matchIds);
      if (matchError) return { data: null, error: toServiceError(matchError) };
    }
    const { error: roundError } = await supabase
      .from("fixture_round")
      .update({ deleted_at: now })
      .in("id", roundIds);
    if (roundError) return { data: null, error: toServiceError(roundError) };
  }
  const { error } = await supabase.from("fixture").update({ deleted_at: now }).eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}

type MatchRow = {
  id: string;
  fixture_round_id: string;
  match_number: number;
  match_label: string;
  venue: string | null;
  scheduled_at: string | null;
  status: FixtureMatchStatus;
  round: {
    id: string;
    fixture_id: string;
    round_type: string;
    round_label: string;
    deleted_at: string | null;
  } | {
    id: string;
    fixture_id: string;
    round_type: string;
    round_label: string;
    deleted_at: string | null;
  }[] | null;
  sides?: Array<{
    id: string;
    participant_label: string;
    team_id: string | null;
    score: string | null;
    score_detail: unknown;
    result_status: string;
    deleted_at: string | null;
    team: { name: string } | { name: string }[] | null;
  }> | null;
};

const MATCH_SELECT = `
  id,
  fixture_round_id,
  match_number,
  match_label,
  venue,
  scheduled_at,
  status,
  round:fixture_round_id (id, fixture_id, round_type, round_label, deleted_at),
  sides:fixture_match_participant (
    id,
    participant_label,
    team_id,
    score,
    score_detail,
    result_status,
    deleted_at,
    team:team_id (name)
  )
`;

function toMatch(row: MatchRow, fixture?: Fixture | null): FixtureMatch | null {
  const round = unwrap(row.round);
  if (!round || round.deleted_at || !isFixtureRoundType(round.round_type)) return null;
  const liveSides = (row.sides ?? []).filter((side) => !side.deleted_at);
  const side1 = liveSides.find((side) => side.participant_label === "1");
  const side2 = liveSides.find((side) => side.participant_label === "2");
  if (!side1?.id || !side1.team_id || !side2?.id || !side2.team_id) return null;
  const detail1 = parseScoreDetail(side1.score_detail);
  const detail2 = parseScoreDetail(side2.score_detail);
  return {
    id: row.id,
    fixtureId: round.fixture_id,
    championshipId: fixture?.championshipId ?? "",
    roundId: round.id,
    roundType: round.round_type,
    roundLabel: round.round_label,
    matchNumber: row.match_number,
    matchLabel: row.match_label,
    venue: row.venue,
    scheduledAt: row.scheduled_at,
    status: row.status,
    categoryLabel: fixture?.categoryLabel ?? "",
    sportName: fixture?.sportName ?? "",
    team1Id: side1.team_id,
    team1Name: unwrap(side1.team)?.name ?? "",
    team1ParticipantId: side1.id,
    team1Points: detail1.score,
    team1Fouls: detail1.fouls,
    team1ResultStatus: parseParticipantResult(side1.result_status),
    team2Id: side2.team_id,
    team2Name: unwrap(side2.team)?.name ?? "",
    team2ParticipantId: side2.id,
    team2Points: detail2.score,
    team2Fouls: detail2.fouls,
    team2ResultStatus: parseParticipantResult(side2.result_status),
    scoreLine: (side1.score ?? "").trim(),
    scoringMode: parseScoringMode(side1.score_detail),
  };
}

async function queryMatches(roundIds: string[]): Promise<ServiceResult<MatchRow[]>> {
  if (roundIds.length === 0) return { data: [], error: null };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_match")
    .select(MATCH_SELECT)
    .in("fixture_round_id", roundIds)
    .is("deleted_at", null)
    .order("match_number");
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data ?? []) as unknown as MatchRow[], error: null };
}

export async function listFixtureMatches(
  fixtureId: string,
): Promise<ServiceResult<FixtureMatch[]>> {
  const fixture = await getFixture(fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  const queried = await queryMatches(fixture.data.rounds.map((round) => round.id));
  if (queried.error || !queried.data) return { data: null, error: queried.error };
  return {
    data: queried.data
      .map((row) => toMatch(row, fixture.data))
      .filter((row): row is FixtureMatch => Boolean(row)),
    error: null,
  };
}

export async function listChampionshipMatches(
  championshipId: string,
): Promise<ServiceResult<FixtureMatch[]>> {
  const fixtures = await listFixtures(championshipId);
  if (fixtures.error || !fixtures.data) return { data: null, error: fixtures.error };
  const byId = new Map(fixtures.data.map((item) => [item.id, item]));
  const roundIds = fixtures.data.flatMap((item) => item.rounds.map((round) => round.id));
  const queried = await queryMatches(roundIds);
  if (queried.error || !queried.data) return { data: null, error: queried.error };
  return {
    data: queried.data
      .map((row) => {
        const draft = toMatch(row);
        if (!draft) return null;
        const fixture = byId.get(draft.fixtureId);
        if (!fixture) return null;
        return {
          ...draft,
          championshipId: fixture.championshipId,
          categoryLabel: fixture.categoryLabel,
          sportName: fixture.sportName,
        };
      })
      .filter((row): row is FixtureMatch => Boolean(row)),
    error: null,
  };
}

export async function getFixtureMatch(id: string): Promise<ServiceResult<FixtureMatch>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_match")
    .select(MATCH_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  if (!data) return { data: null, error: { message: "Match was not found." } };
  const draft = toMatch(data as unknown as MatchRow);
  if (!draft) return { data: null, error: { message: "Match was not found." } };
  const fixture = await getFixture(draft.fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  const match = toMatch(data as unknown as MatchRow, fixture.data);
  if (!match) return { data: null, error: { message: "Match was not found." } };
  return { data: match, error: null };
}

function resultsForWinner(
  winner: MatchWinner | null,
): [FixtureParticipantResult, FixtureParticipantResult] {
  if (winner === "1") return ["winner", "loser"];
  if (winner === "2") return ["loser", "winner"];
  if (winner === "draw") return ["draw", "draw"];
  return ["pending", "pending"];
}

type ScoreEventRow = {
  id: string;
  fixture_match_id: string;
  team_id: string;
  team_member_id: string;
  points: number;
  created_at: string;
  member: { name: string } | { name: string }[] | null;
};

function toScoreEvent(row: ScoreEventRow): MatchScoreEvent | null {
  if (!isBasketPoints(row.points)) return null;
  return {
    id: row.id,
    matchId: row.fixture_match_id,
    teamId: row.team_id,
    teamMemberId: row.team_member_id,
    teamMemberName: unwrap(row.member)?.name ?? "",
    points: row.points,
    createdAt: row.created_at,
  };
}

async function archiveScoreEventsForMatches(
  matchIds: string[],
  now: string,
): Promise<ServiceError | null> {
  if (matchIds.length === 0) return null;
  const supabase = createClient();
  const { error } = await supabase
    .from("fixture_match_score_event")
    .update({ deleted_at: now })
    .in("fixture_match_id", matchIds)
    .is("deleted_at", null);
  return error ? toServiceError(error) : null;
}

export async function listMatchScoreEvents(
  matchId: string,
): Promise<ServiceResult<MatchScoreEvent[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_match_score_event")
    .select(
      "id, fixture_match_id, team_id, team_member_id, points, created_at, member:team_member_id (name)",
    )
    .eq("fixture_match_id", matchId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: toServiceError(error) };
  return {
    data: (data ?? [])
      .map((row) => toScoreEvent(row as unknown as ScoreEventRow))
      .filter((row): row is MatchScoreEvent => Boolean(row)),
    error: null,
  };
}

async function refreshTotalsFromEvents(
  match: FixtureMatch,
  scoringMode: ScoringMode,
  fouls?: { team1Fouls: number; team2Fouls: number },
): Promise<ServiceResult<FixtureMatch>> {
  const events = await listMatchScoreEvents(match.id);
  if (events.error || !events.data) return { data: null, error: events.error };
  return saveMatchScore({
    matchId: match.id,
    team1Points: officialTeamPoints({
      mode: scoringMode,
      typed: match.team1Points ?? 0,
      eventSum: sumPlayerPoints(events.data, match.team1Id),
      hasEvents: events.data.some((event) => event.teamId === match.team1Id),
    }),
    team2Points: officialTeamPoints({
      mode: scoringMode,
      typed: match.team2Points ?? 0,
      eventSum: sumPlayerPoints(events.data, match.team2Id),
      hasEvents: events.data.some((event) => event.teamId === match.team2Id),
    }),
    team1Fouls: fouls?.team1Fouls ?? match.team1Fouls ?? 0,
    team2Fouls: fouls?.team2Fouls ?? match.team2Fouls ?? 0,
    winner: winnerFromMatch(match),
    scoringMode,
    complete: false,
  });
}

function winnerFromMatch(match: FixtureMatch): MatchWinner | null {
  return winnerFromResults(match.team1ResultStatus, match.team2ResultStatus);
}

export async function addMatchScoreEvent(input: {
  matchId: string;
  teamId: string;
  teamMemberId: string;
  points: BasketPoints;
  scoringMode: ScoringMode;
  team1Fouls?: number;
  team2Fouls?: number;
}): Promise<ServiceResult<FixtureMatch>> {
  if (!isBasketPoints(input.points)) {
    return { data: null, error: { message: "Points must be 1, 2, or 3." } };
  }
  const current = await getFixtureMatch(input.matchId);
  if (current.error || !current.data) return current;
  const match = current.data;
  if (match.status === "cancelled") {
    return { data: null, error: { message: "Cancelled matches cannot be scored." } };
  }
  if (input.teamId !== match.team1Id && input.teamId !== match.team2Id) {
    return { data: null, error: { message: "Team is not in this match." } };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("fixture_match_score_event").insert({
    fixture_match_id: input.matchId,
    team_id: input.teamId,
    team_member_id: input.teamMemberId,
    points: input.points,
    created_by: user?.id ?? null,
  });
  if (error) return { data: null, error: toServiceError(error) };
  return refreshTotalsFromEvents(match, input.scoringMode, {
    team1Fouls: input.team1Fouls ?? match.team1Fouls ?? 0,
    team2Fouls: input.team2Fouls ?? match.team2Fouls ?? 0,
  });
}

export async function archiveMatchScoreEvent(
  id: string,
  scoringMode: ScoringMode,
  fouls?: { team1Fouls: number; team2Fouls: number },
): Promise<ServiceResult<FixtureMatch>> {
  const supabase = createClient();
  const { data: row, error: currentError } = await supabase
    .from("fixture_match_score_event")
    .select("id, fixture_match_id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (currentError) return { data: null, error: toServiceError(currentError) };
  if (!row || row.deleted_at) {
    return { data: null, error: { message: "Score entry was not found." } };
  }
  const { error } = await supabase
    .from("fixture_match_score_event")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  const current = await getFixtureMatch(row.fixture_match_id as string);
  if (current.error || !current.data) return current;
  return refreshTotalsFromEvents(current.data, scoringMode, fouls);
}

export async function saveMatchScore(input: {
  matchId: string;
  team1Points: number;
  team2Points: number;
  team1Fouls: number;
  team2Fouls: number;
  winner: MatchWinner | null;
  scoringMode?: ScoringMode;
  complete: boolean;
}): Promise<ServiceResult<FixtureMatch>> {
  const current = await getFixtureMatch(input.matchId);
  if (current.error || !current.data) return current;
  const match = current.data;
  if (match.status === "cancelled") {
    return { data: null, error: { message: "Cancelled matches cannot be scored." } };
  }

  const scoringMode = input.scoringMode ?? match.scoringMode ?? "both";
  const events = await listMatchScoreEvents(match.id);
  if (events.error || !events.data) return { data: null, error: events.error };
  const team1Points = officialTeamPoints({
    mode: scoringMode,
    typed: input.team1Points,
    eventSum: sumPlayerPoints(events.data, match.team1Id),
    hasEvents: events.data.some((event) => event.teamId === match.team1Id),
  });
  const team2Points = officialTeamPoints({
    mode: scoringMode,
    typed: input.team2Points,
    eventSum: sumPlayerPoints(events.data, match.team2Id),
    hasEvents: events.data.some((event) => event.teamId === match.team2Id),
  });

  const points = [team1Points, team2Points, input.team1Fouls, input.team2Fouls];
  if (points.some((value) => !Number.isInteger(value) || value < 0)) {
    return { data: null, error: { message: "Points and fouls must be whole numbers." } };
  }

  const league = isLeagueRound(match.roundType);
  let winner = input.winner;
  if (input.complete && !winner) {
    winner = detectWinnerFromPoints(team1Points, team2Points, league);
  }
  if (winner === "draw" && !league) {
    return { data: null, error: { message: "Knockout matches cannot be a draw." } };
  }
  if (input.complete && !winner) {
    return {
      data: null,
      error: {
        message: league
          ? "Pick a winner or draw before completing."
          : "Scores are tied. Pick a winner before completing a knockout match.",
      },
    };
  }

  const [result1, result2] = resultsForWinner(winner);
  const score = formatScoreLine(team1Points, team2Points);
  const supabase = createClient();
  const { error } = await supabase.rpc("save_fixture_match_scores", {
    p_match_id: input.matchId,
    p_scores: [
      {
        participant_id: match.team1ParticipantId,
        score,
        score_detail: {
          score: team1Points,
          fouls: input.team1Fouls,
          sport: "Basketball",
          scoring_mode: scoringMode,
        },
        result_status: result1,
      },
      {
        participant_id: match.team2ParticipantId,
        score,
        score_detail: {
          score: team2Points,
          fouls: input.team2Fouls,
          sport: "Basketball",
          scoring_mode: scoringMode,
        },
        result_status: result2,
      },
    ],
  });
  if (error) return { data: null, error: toServiceError(error) };

  const { error: statusError } = await supabase
    .from("fixture_match")
    .update({ status: input.complete ? "completed" : "in_progress" })
    .eq("id", input.matchId);
  if (statusError) return { data: null, error: toServiceError(statusError) };

  return getFixtureMatch(input.matchId);
}

async function nextMatchNumber(roundId: string): Promise<ServiceResult<number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_match")
    .select("match_number")
    .eq("fixture_round_id", roundId)
    .is("deleted_at", null)
    .order("match_number", { ascending: false })
    .limit(1);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data?.[0]?.match_number ?? 0) + 1, error: null };
}

async function assertMatchSides(
  fixture: Fixture,
  team1Id: string,
  team2Id: string,
): Promise<string | null> {
  if (team1Id === team2Id) return "Pick two different teams.";
  const teams = await listTeams({ cscId: fixture.cscId });
  if (teams.error) return teams.error.message;
  const ids = new Set((teams.data ?? []).map((team) => team.id));
  if (!ids.has(team1Id) || !ids.has(team2Id)) {
    return "Both teams must belong to this championship category.";
  }
  return null;
}

export async function createMatch(input: {
  fixtureId: string;
  roundId: string;
  matchLabel: string;
  venue: string;
  scheduledAt: string | null;
  status: FixtureMatchStatus;
  team1Id: string;
  team2Id: string;
}): Promise<ServiceResult<FixtureMatch>> {
  if (!MATCH_STATUSES.includes(input.status)) {
    return { data: null, error: { message: "Match status is not allowed." } };
  }
  const fixture = await getFixture(input.fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  const round = fixture.data.rounds.find((item) => item.id === input.roundId);
  if (!round) return { data: null, error: { message: "Round was not found." } };
  const sidesErr = await assertMatchSides(fixture.data, input.team1Id, input.team2Id);
  if (sidesErr) return { data: null, error: { message: sidesErr } };

  const number = await nextMatchNumber(input.roundId);
  if (number.error || number.data == null) return { data: null, error: number.error };
  const label = input.matchLabel.trim() || `Match ${number.data}`;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_match")
    .insert({
      fixture_round_id: input.roundId,
      match_number: number.data,
      match_label: label,
      venue: input.venue.trim() || "Court 1",
      scheduled_at: input.scheduledAt,
      status: input.status,
    })
    .select("id")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };

  const { error: sideError } = await supabase.from("fixture_match_participant").insert([
    {
      fixture_match_id: data.id,
      team_id: input.team1Id,
      participant_label: "1",
    },
    {
      fixture_match_id: data.id,
      team_id: input.team2Id,
      participant_label: "2",
    },
  ]);
  if (sideError) {
    await archiveMatch(data.id);
    return { data: null, error: toServiceError(sideError) };
  }

  const matches = await listFixtureMatches(input.fixtureId);
  if (matches.error) return { data: null, error: matches.error };
  const created = (matches.data ?? []).find((item) => item.id === data.id);
  if (!created) return { data: null, error: { message: "Match was not found." } };
  return { data: created, error: null };
}

export async function updateMatch(
  id: string,
  input: {
    fixtureId: string;
    roundId: string;
    matchLabel: string;
    venue: string;
    scheduledAt: string | null;
    status: FixtureMatchStatus;
    team1Id: string;
    team2Id: string;
  },
): Promise<ServiceResult<FixtureMatch>> {
  if (!MATCH_STATUSES.includes(input.status)) {
    return { data: null, error: { message: "Match status is not allowed." } };
  }
  const fixture = await getFixture(input.fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  const round = fixture.data.rounds.find((item) => item.id === input.roundId);
  if (!round) return { data: null, error: { message: "Round was not found." } };
  const sidesErr = await assertMatchSides(fixture.data, input.team1Id, input.team2Id);
  if (sidesErr) return { data: null, error: { message: sidesErr } };

  const supabase = createClient();
  const { data: current, error: currentError } = await supabase
    .from("fixture_match")
    .select("id, fixture_round_id, match_number, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (currentError) return { data: null, error: toServiceError(currentError) };
  if (!current || current.deleted_at) {
    return { data: null, error: { message: "Match was not found." } };
  }

  let matchNumber = current.match_number as number;
  if (current.fixture_round_id !== input.roundId) {
    const next = await nextMatchNumber(input.roundId);
    if (next.error || next.data == null) return { data: null, error: next.error };
    matchNumber = next.data;
  }

  const { error } = await supabase
    .from("fixture_match")
    .update({
      fixture_round_id: input.roundId,
      match_number: matchNumber,
      match_label: input.matchLabel.trim() || `Match ${matchNumber}`,
      venue: input.venue.trim() || "Court 1",
      scheduled_at: input.scheduledAt,
      status: input.status,
    })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };

  const now = new Date().toISOString();
  const { error: clearError } = await supabase
    .from("fixture_match_participant")
    .update({ deleted_at: now })
    .eq("fixture_match_id", id)
    .is("deleted_at", null);
  if (clearError) return { data: null, error: toServiceError(clearError) };
  const { error: sideError } = await supabase.from("fixture_match_participant").insert([
    {
      fixture_match_id: id,
      team_id: input.team1Id,
      participant_label: "1",
    },
    {
      fixture_match_id: id,
      team_id: input.team2Id,
      participant_label: "2",
    },
  ]);
  if (sideError) return { data: null, error: toServiceError(sideError) };

  const matches = await listFixtureMatches(input.fixtureId);
  if (matches.error) return { data: null, error: matches.error };
  const updated = (matches.data ?? []).find((item) => item.id === id);
  if (!updated) return { data: null, error: { message: "Match was not found." } };
  return { data: updated, error: null };
}

export async function archiveMatch(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const eventsError = await archiveScoreEventsForMatches([id], now);
  if (eventsError) return { data: null, error: eventsError };
  const { error: sidesError } = await supabase
    .from("fixture_match_participant")
    .update({ deleted_at: now })
    .eq("fixture_match_id", id)
    .is("deleted_at", null);
  if (sidesError) return { data: null, error: toServiceError(sidesError) };
  const { error } = await supabase.from("fixture_match").update({ deleted_at: now }).eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}
