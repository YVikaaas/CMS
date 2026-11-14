import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/utils/labels";
import {
  clampAttemptCount,
  clampHeatLanes,
  defaultFieldAttemptPlan,
  defaultHeatLabel,
  defaultParticipantsPerMatch,
  defaultScoringStyle,
  defaultVenue,
  heatScoreLine,
  isAthleticsFormat,
  isRelayEvent,
  parseAthleticsDetail,
  parseFieldAttempts,
  parseLane,
  qualifyCountForRound,
  rankAthletics,
  statusForAthletics,
  athleticsScoreText,
  autoQualify,
} from "@/lib/utils/athletics";
import {
  formatScoreLine,
  isBasketPoints,
  isFixtureRoundType,
  isLeagueRound,
  MATCH_STATUSES,
  officialTeamPoints,
  parseFixtureConfig,
  parseParticipantResult,
  parseScoreDetail,
  parseScoringMode,
  roundLabel,
  roundNumber,
  roundsForFormat,
  sortRoundTypes,
  sumPlayerPoints,
  detectWinnerFromPoints,
  validateFixtureRounds,
  winnerFromResults,
} from "@/lib/utils/fixtures";
import type {
  AthleticsResultCode,
  BasketPoints,
  FieldAttempt,
  Fixture,
  FixtureFormatType,
  FixtureMatch,
  FixtureMatchStatus,
  FixtureParticipantResult,
  FixtureRound,
  FixtureRoundType,
  FixtureStatus,
  Gender,
  FixtureRankingEntry,
  HeatParticipant,
  MatchScoreEvent,
  MatchWinner,
  ScoringMode,
  ServiceError,
  ServiceResult,
} from "@/lib/types/cms";
import { isPodiumRank, rankingLocksPodium } from "@/lib/utils/podium";
import { toServiceError } from "./errors";
import { listCscAthletes, listCscOptions, listTeams } from "./teams";

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
  attempt_count?: number | null;
  extra_attempt_count?: number | null;
  deleted_at: string | null;
  fixture_match?: Array<{ id: string; deleted_at: string | null }> | null;
};

type FixtureRow = {
  id: string;
  competition_sport_category_map_id: string;
  format_type: FixtureFormatType;
  config: unknown;
  status: FixtureStatus;
  rankings_locked_at?: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  csc: CscNested | CscNested[] | null;
  fixture_round?: RoundNested[] | null;
};

function nestedRounds(rounds: RoundNested[] | null | undefined, fixtureId: string): FixtureRound[] {
  return (rounds ?? [])
    .filter((round) => !round.deleted_at && isFixtureRoundType(round.round_type))
    .sort((a, b) => {
      const left = a.round_type as FixtureRoundType;
      const right = b.round_type as FixtureRoundType;
      return roundNumber(left) - roundNumber(right) || a.round_number - b.round_number;
    })
    .map((round) => {
      const plan = defaultFieldAttemptPlan(round.round_type as FixtureRoundType);
      return {
        id: round.id,
        fixtureId,
        roundType: round.round_type as FixtureRoundType,
        roundNumber: round.round_number,
        roundLabel: round.round_label,
        attemptCount: clampAttemptCount(round.attempt_count ?? plan.attemptCount),
        extraAttemptCount: 0,
      };
    });
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
    categoryName: category.name,
    categoryAgeGroup: category.age_group,
    formatType: row.format_type,
    scoringStyle: parseFixtureConfig(row.config).scoringStyle,
    participantsPerMatch: parseFixtureConfig(row.config).participantsPerMatch,
    status: row.status,
    rankingLockedAt: row.rankings_locked_at ?? null,
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
  config,
  status,
  rankings_locked_at,
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
  fixture_round (id, fixture_id, round_type, round_number, round_label, attempt_count, extra_attempt_count, deleted_at, fixture_match (id, deleted_at))
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
  formatType?: FixtureFormatType;
  rounds: FixtureRoundType[];
  participantsPerMatch?: number;
  roundAttempts?: Partial<
    Record<FixtureRoundType, { attemptCount: number; extraAttemptCount: number }>
  >;
  startDate: string | null;
  endDate: string | null;
}): Promise<ServiceResult<Fixture>> {
  const cscs = await listCscOptions();
  if (cscs.error) return { data: null, error: cscs.error };
  const csc = (cscs.data ?? []).find((item) => item.id === input.cscId);
  if (!csc) return { data: null, error: { message: "Championship category was not found." } };
  const athletics = isAthleticsFormat(csc.defaultFormat);
  const formatType = athletics
    ? csc.defaultFormat
    : input.formatType && csc.availableFormats.includes(input.formatType)
      ? input.formatType
      : csc.defaultFormat;
  const roundsErr = validateFixtureRounds(formatType, input.rounds);
  if (roundsErr) return { data: null, error: { message: roundsErr } };
  const allowed = new Set(roundsForFormat(formatType, csc.availableRounds));
  if (input.rounds.some((round) => !allowed.has(round))) {
    return { data: null, error: { message: "One of the selected rounds is not available." } };
  }

  const ordered = sortRoundTypes([...new Set(input.rounds)]);
  const participants =
    formatType === "track_rounds"
      ? clampHeatLanes(input.participantsPerMatch ?? csc.participantsPerMatch)
      : formatType === "field_attempts"
        ? defaultParticipantsPerMatch(formatType)
        : 2;
  const scoringStyle = athletics
    ? csc.scoringStyle || defaultScoringStyle(formatType)
    : defaultScoringStyle(formatType);
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
      format_type: formatType,
      config: {
        active_rounds: ordered,
        participants_per_match: participants,
        scoring_style: scoringStyle,
      },
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };

  for (const round of ordered) {
    const plan = defaultFieldAttemptPlan(round);
    const custom = input.roundAttempts?.[round];
    const { error: roundError } = await supabase.from("fixture_round").insert({
      fixture_id: data.id,
      round_type: round,
      round_number: roundNumber(round),
      round_label: roundLabel(round),
      attempt_count: clampAttemptCount(custom?.attemptCount ?? plan.attemptCount),
      extra_attempt_count: 0,
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
      const attendanceError = await archiveAttendanceForMatches(matchIds, now);
      if (attendanceError) return { data: null, error: attendanceError };
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
  const { error: rankingError } = await supabase
    .from("fixture_ranking")
    .update({ deleted_at: now })
    .eq("fixture_id", id)
    .is("deleted_at", null);
  if (rankingError) return { data: null, error: toServiceError(rankingError) };
  const { error } = await supabase.from("fixture").update({ deleted_at: now }).eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}

type TeamNameRow = { name: string; org_name?: string | null; city?: string | null };

type AthleteNested = {
  id: string;
  name: string;
  team_id: string;
  team: TeamNameRow | TeamNameRow[] | null;
};

type MatchSideRow = {
  id: string;
  participant_label: string;
  team_id: string | null;
  athlete_id: string | null;
  score: string | null;
  score_detail: unknown;
  result_status: string;
  position: number | null;
  attempts: unknown;
  deleted_at: string | null;
  team: TeamNameRow | TeamNameRow[] | null;
  athlete: AthleteNested | AthleteNested[] | null;
};

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
    attempt_count?: number | null;
    extra_attempt_count?: number | null;
    deleted_at: string | null;
  } | {
    id: string;
    fixture_id: string;
    round_type: string;
    round_label: string;
    attempt_count?: number | null;
    extra_attempt_count?: number | null;
    deleted_at: string | null;
  }[] | null;
  sides?: MatchSideRow[] | null;
};

const MATCH_SELECT = `
  id,
  fixture_round_id,
  match_number,
  match_label,
  venue,
  scheduled_at,
  status,
  round:fixture_round_id (id, fixture_id, round_type, round_label, attempt_count, extra_attempt_count, deleted_at),
  sides:fixture_match_participant (
    id,
    participant_label,
    team_id,
    athlete_id,
    score,
    score_detail,
    result_status,
    position,
    attempts,
    deleted_at,
    team:team_id (name, org_name, city),
    athlete:athlete_id (id, name, team_id, team:team_id (name, org_name, city))
  )
`;

const EMPTY_DUAL = {
  team1Id: "",
  team1Name: "",
  team1ParticipantId: "",
  team1Points: null as number | null,
  team1Fouls: null as number | null,
  team1ResultStatus: "pending" as FixtureParticipantResult,
  team2Id: "",
  team2Name: "",
  team2ParticipantId: "",
  team2Points: null as number | null,
  team2Fouls: null as number | null,
  team2ResultStatus: "pending" as FixtureParticipantResult,
  scoringMode: "totals" as ScoringMode,
};

function toHeatParticipant(side: MatchSideRow): HeatParticipant | null {
  if (!side.athlete_id && !side.team_id) return null;
  const athlete = unwrap(side.athlete);
  const athleteTeam = unwrap(athlete?.team);
  const team = unwrap(side.team);
  const detail = parseAthleticsDetail(side.score_detail);
  const attempts =
    detail.attempts.length > 0 ? detail.attempts : parseFieldAttempts(side.attempts);
  const place = side.position ?? detail.place;
  return {
    id: side.id,
    athleteId: side.athlete_id ?? "",
    teamId: side.team_id ?? athlete?.team_id ?? "",
    name: athlete?.name || team?.name || "",
    orgName: athleteTeam?.org_name ?? team?.org_name ?? null,
    city: athleteTeam?.city ?? team?.city ?? null,
    lane: parseLane(side.participant_label),
    score: (side.score ?? "").trim(),
    timeMs: detail.timeMs,
    mark: detail.mark,
    unit: detail.unit,
    place,
    qualified: detail.qualified || parseParticipantResult(side.result_status) === "qualified",
    resultStatus: parseParticipantResult(side.result_status),
    resultCode: detail.resultCode,
    attempts,
  };
}

function toMatch(row: MatchRow, fixture?: Fixture | null): FixtureMatch | null {
  const round = unwrap(row.round);
  if (!round || round.deleted_at || !isFixtureRoundType(round.round_type)) return null;
  const liveSides = (row.sides ?? []).filter((side) => !side.deleted_at);
  const formatType = fixture?.formatType ?? "league_knockout";
  const heat = fixture
    ? isAthleticsFormat(fixture.formatType)
    : liveSides.some((side) => Boolean(side.athlete_id));
  const plan = defaultFieldAttemptPlan(round.round_type as FixtureRoundType);
  const attemptCount = clampAttemptCount(round.attempt_count ?? plan.attemptCount);
  const extraAttemptCount = 0;

  const base = {
    id: row.id,
    fixtureId: round.fixture_id,
    championshipId: fixture?.championshipId ?? "",
    roundId: round.id,
    roundType: round.round_type as FixtureRoundType,
    roundLabel: round.round_label,
    matchNumber: row.match_number,
    matchLabel: row.match_label,
    venue: row.venue,
    scheduledAt: row.scheduled_at,
    status: row.status,
    categoryLabel: fixture?.categoryLabel ?? "",
    sportName: fixture?.sportName ?? "",
    formatType,
    attemptCount,
    extraAttemptCount,
  };

  if (heat) {
    const participants = liveSides
      .map(toHeatParticipant)
      .filter((side): side is HeatParticipant => Boolean(side))
      .sort((a, b) => a.lane - b.lane);
    return {
      ...base,
      ...EMPTY_DUAL,
      scoreLine: heatScoreLine(participants),
      kind: "heat",
      participants,
    };
  }

  const side1 = liveSides.find((side) => side.participant_label === "1");
  const side2 = liveSides.find((side) => side.participant_label === "2");
  if (!side1?.id || !side1.team_id || !side2?.id || !side2.team_id) return null;
  const detail1 = parseScoreDetail(side1.score_detail);
  const detail2 = parseScoreDetail(side2.score_detail);
  return {
    ...base,
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
    kind: "dual",
    participants: [],
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
      .filter((row): row is FixtureMatch => Boolean(row))
      .sort(
        (a, b) => roundNumber(a.roundType) - roundNumber(b.roundType) || a.matchNumber - b.matchNumber,
      ),
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
        const round = unwrap(row.round);
        const fixture = round ? byId.get(round.fixture_id) : undefined;
        if (!fixture) return null;
        return toMatch(row, fixture);
      })
      .filter((row): row is FixtureMatch => Boolean(row))
      .sort(
        (a, b) => roundNumber(a.roundType) - roundNumber(b.roundType) || a.matchNumber - b.matchNumber,
      ),
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

async function archiveAttendanceForMatches(
  matchIds: string[],
  now: string,
): Promise<ServiceError | null> {
  if (matchIds.length === 0) return null;
  const supabase = createClient();
  const { error } = await supabase
    .from("fixture_match_attendance")
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

async function assertHeatEntries(
  fixture: Fixture,
  ids: string[],
  asTeams: boolean,
): Promise<string | null> {
  const noun = asTeams ? "teams" : "athletes";
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length < 2) return `Pick at least two ${noun}.`;
  if (unique.length !== ids.length) return `Each ${noun.slice(0, -1)} can only be in this heat once.`;
  if (unique.length > fixture.participantsPerMatch) {
    return `This heat allows up to ${fixture.participantsPerMatch} ${noun}.`;
  }
  if (asTeams) {
    const teams = await listTeams({ cscId: fixture.cscId });
    if (teams.error) return teams.error.message;
    const allowed = new Set((teams.data ?? []).map((item) => item.id));
    if (unique.some((id) => !allowed.has(id))) {
      return "Every team must belong to this championship category.";
    }
    return null;
  }
  const athletes = await listCscAthletes(fixture.cscId);
  if (athletes.error) return athletes.error.message;
  const allowed = new Set((athletes.data ?? []).map((item) => item.id));
  if (unique.some((id) => !allowed.has(id))) {
    return "Every athlete must belong to this championship category.";
  }
  return null;
}

async function insertHeatSides(
  matchId: string,
  slots: Array<{ id: string; lane: number }>,
  asTeams: boolean,
): Promise<ServiceError | null> {
  const supabase = createClient();
  const { error } = await supabase.from("fixture_match_participant").insert(
    slots.map((slot) =>
      asTeams
        ? {
            fixture_match_id: matchId,
            team_id: slot.id,
            participant_label: String(slot.lane),
          }
        : {
            fixture_match_id: matchId,
            athlete_id: slot.id,
            participant_label: String(slot.lane),
          },
    ),
  );
  return error ? toServiceError(error) : null;
}

function heatLaneSlots(input: { athleteIds?: string[]; teamIds?: string[] }): {
  slots: Array<{ id: string; lane: number }>;
  asTeams: boolean;
} {
  const teamIds = input.teamIds ?? [];
  const asTeams = teamIds.some(Boolean);
  const source = asTeams ? teamIds : (input.athleteIds ?? []);
  const slots = source
    .map((id, index) => ({ id: (id ?? "").trim(), lane: index + 1 }))
    .filter((row) => Boolean(row.id));
  return { slots, asTeams };
}

export async function createHeat(input: {
  fixtureId: string;
  roundId: string;
  matchLabel: string;
  venue: string;
  scheduledAt: string | null;
  status: FixtureMatchStatus;
  athleteIds?: string[];
  teamIds?: string[];
}): Promise<ServiceResult<FixtureMatch>> {
  if (!MATCH_STATUSES.includes(input.status)) {
    return { data: null, error: { message: "Match status is not allowed." } };
  }
  const fixture = await getFixture(input.fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  if (!isAthleticsFormat(fixture.data.formatType)) {
    return { data: null, error: { message: "This fixture does not use heats." } };
  }
  const round = fixture.data.rounds.find((item) => item.id === input.roundId);
  if (!round) return { data: null, error: { message: "Round was not found." } };
  const entry = heatLaneSlots(input);
  const athletesErr = await assertHeatEntries(
    fixture.data,
    entry.slots.map((slot) => slot.id),
    entry.asTeams,
  );
  if (athletesErr) return { data: null, error: { message: athletesErr } };

  const number = await nextMatchNumber(input.roundId);
  if (number.error || number.data == null) return { data: null, error: number.error };
  const label = input.matchLabel.trim() || defaultHeatLabel(fixture.data.formatType, number.data);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_match")
    .insert({
      fixture_round_id: input.roundId,
      match_number: number.data,
      match_label: label,
      venue: input.venue.trim() || defaultVenue(fixture.data.formatType),
      scheduled_at: input.scheduledAt,
      status: input.status,
    })
    .select("id")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };

  const sideError = await insertHeatSides(data.id, entry.slots, entry.asTeams);
  if (sideError) {
    await archiveMatch(data.id);
    return { data: null, error: sideError };
  }

  return getFixtureMatch(data.id);
}

export async function updateHeat(
  id: string,
  input: {
    fixtureId: string;
    roundId: string;
    matchLabel: string;
    venue: string;
    scheduledAt: string | null;
    status: FixtureMatchStatus;
    athleteIds?: string[];
    teamIds?: string[];
  },
): Promise<ServiceResult<FixtureMatch>> {
  if (!MATCH_STATUSES.includes(input.status)) {
    return { data: null, error: { message: "Match status is not allowed." } };
  }
  const fixture = await getFixture(input.fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  if (!isAthleticsFormat(fixture.data.formatType)) {
    return { data: null, error: { message: "This fixture does not use heats." } };
  }
  const round = fixture.data.rounds.find((item) => item.id === input.roundId);
  if (!round) return { data: null, error: { message: "Round was not found." } };
  const entry = heatLaneSlots(input);
  const athletesErr = await assertHeatEntries(
    fixture.data,
    entry.slots.map((slot) => slot.id),
    entry.asTeams,
  );
  if (athletesErr) return { data: null, error: { message: athletesErr } };

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
      match_label: input.matchLabel.trim() || defaultHeatLabel(fixture.data.formatType, matchNumber),
      venue: input.venue.trim() || defaultVenue(fixture.data.formatType),
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
  const sideError = await insertHeatSides(id, entry.slots, entry.asTeams);
  if (sideError) return { data: null, error: sideError };

  return getFixtureMatch(id);
}

export async function saveHeatScore(input: {
  matchId: string;
  complete: boolean;
  rows: Array<{
    participantId: string;
    resultCode: AthleticsResultCode;
    timeMs: number | null;
    mark: number | null;
    unit?: string;
    attempts?: FieldAttempt[];
    qualified?: boolean;
  }>;
}): Promise<ServiceResult<FixtureMatch>> {
  const current = await getFixtureMatch(input.matchId);
  if (current.error || !current.data) return current;
  const match = current.data;
  if (match.kind !== "heat") {
    return { data: null, error: { message: "This match is not an athletics heat." } };
  }
  if (match.status === "cancelled") {
    return { data: null, error: { message: "Cancelled matches cannot be scored." } };
  }

  const style = match.formatType === "track_rounds" ? "time" : "distance";
  const byId = new Map(match.participants.map((row) => [row.id, row]));
  const prepared = input.rows.map((row) => {
    const existing = byId.get(row.participantId);
    const unit = row.unit ?? existing?.unit ?? "m";
    const attempts = row.attempts ?? existing?.attempts ?? [];
    return { ...row, unit, attempts };
  });

  if (prepared.some((row) => !byId.has(row.participantId))) {
    return { data: null, error: { message: "Participant does not belong to this match." } };
  }
  if (prepared.length !== match.participants.length) {
    return { data: null, error: { message: "Score every lane in this heat." } };
  }

  for (const row of prepared) {
    if (input.complete && row.resultCode === "ok" && style === "time" && row.timeMs == null) {
      return { data: null, error: { message: "Enter a time for every finishing athlete." } };
    }
    if (input.complete && row.resultCode === "ok" && style !== "time" && row.mark == null) {
      return { data: null, error: { message: "Enter a mark for every finishing athlete." } };
    }
    if (row.timeMs != null && (row.timeMs < 0 || !Number.isFinite(row.timeMs))) {
      return { data: null, error: { message: "Times must be valid." } };
    }
    if (row.mark != null && (row.mark < 0 || !Number.isFinite(row.mark))) {
      return { data: null, error: { message: "Marks must be valid." } };
    }
  }

  const places = rankAthletics(prepared, style);
  const finalRound = match.roundType === "final";
  const qualifyCount = qualifyCountForRound(match.roundType);
  const autoFlags = autoQualify(places, qualifyCount);
  const scored = prepared.map((row, index) => {
    const place = places[index] ?? null;
    const qualified =
      typeof row.qualified === "boolean" ? row.qualified : Boolean(autoFlags[index]);
    return { ...row, place, qualified: finalRound ? false : qualified };
  });

  const supabase = createClient();
  const { error } = await supabase.rpc("save_fixture_match_scores", {
    p_match_id: input.matchId,
    p_scores: scored.map((row) => ({
      participant_id: row.participantId,
      score: athleticsScoreText({
        resultCode: row.resultCode,
        timeMs: row.timeMs,
        mark: row.mark,
        unit: row.unit,
        style,
      }),
      score_detail: {
        scoring_style: style,
        result_code: row.resultCode,
        time_ms: row.timeMs,
        mark: row.mark,
        unit: row.unit,
        place: row.place,
        qualified: row.qualified,
        attempts: row.attempts,
      },
      result_status: statusForAthletics({
        resultCode: row.resultCode,
        qualified: row.qualified,
        place: row.place,
        finalRound,
      }),
      position: row.place,
      attempts: row.attempts,
    })),
  });
  if (error) return { data: null, error: toServiceError(error) };

  const { error: statusError } = await supabase
    .from("fixture_match")
    .update({ status: input.complete ? "completed" : "in_progress" })
    .eq("id", input.matchId);
  if (statusError) return { data: null, error: toServiceError(statusError) };

  return getFixtureMatch(input.matchId);
}

export async function archiveMatch(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const eventsError = await archiveScoreEventsForMatches([id], now);
  if (eventsError) return { data: null, error: eventsError };
  const attendanceError = await archiveAttendanceForMatches([id], now);
  if (attendanceError) return { data: null, error: attendanceError };
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

type RankingRow = {
  id: string;
  fixture_id: string;
  rank: number;
  team_id: string | null;
  athlete_id: string | null;
  medal_delivered_at?: string | null;
  team: { name: string; org_name: string | null; city: string | null } | { name: string; org_name: string | null; city: string | null }[] | null;
  athlete:
    | {
        name: string;
        team: { name: string; org_name: string | null; city: string | null } | { name: string; org_name: string | null; city: string | null }[] | null;
      }
    | {
        name: string;
        team: { name: string; org_name: string | null; city: string | null } | { name: string; org_name: string | null; city: string | null }[] | null;
      }[]
    | null;
};

function toRankingEntry(row: RankingRow): FixtureRankingEntry | null {
  const team = unwrap(row.team);
  const athlete = unwrap(row.athlete);
  const athleteTeam = unwrap(athlete?.team);
  const name = athlete?.name || team?.name || "";
  if (!name) return null;
  return {
    id: row.id,
    fixtureId: row.fixture_id,
    rank: row.rank,
    teamId: row.team_id ?? "",
    athleteId: row.athlete_id ?? "",
    name,
    orgName: athleteTeam?.org_name ?? team?.org_name ?? null,
    city: athleteTeam?.city ?? team?.city ?? null,
    medalDeliveredAt: row.medal_delivered_at ?? null,
  };
}

const RANKING_SELECT = `
  id,
  fixture_id,
  rank,
  team_id,
  athlete_id,
  medal_delivered_at,
  team:team_id (name, org_name, city),
  athlete:athlete_id (name, team:team_id (name, org_name, city))
`;

export async function listFixtureRanking(
  fixtureId: string,
): Promise<ServiceResult<FixtureRankingEntry[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_ranking")
    .select(RANKING_SELECT)
    .eq("fixture_id", fixtureId)
    .is("deleted_at", null)
    .order("rank");
  if (error) return { data: null, error: toServiceError(error) };
  return {
    data: ((data ?? []) as unknown as RankingRow[])
      .map(toRankingEntry)
      .filter((row): row is FixtureRankingEntry => Boolean(row)),
    error: null,
  };
}

export async function saveFixtureRanking(
  fixtureId: string,
  rows: Array<{ rank: number; teamId?: string; athleteId?: string }>,
): Promise<ServiceResult<FixtureRankingEntry[]>> {
  const fixture = await getFixture(fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  if (fixture.data.rankingLockedAt) {
    return { data: null, error: { message: "Ranking is locked. Unlock it on scoring before changing places." } };
  }

  const prepared: Array<{ rank: number; teamId: string | null; athleteId: string | null }> = [];
  const usedRanks = new Set<number>();
  const usedKeys = new Set<string>();
  for (const row of rows) {
    const rank = Math.trunc(row.rank);
    if (!Number.isFinite(rank) || rank < 1 || rank > 999) {
      return { data: null, error: { message: "Ranks must be 1 or higher." } };
    }
    if (usedRanks.has(rank)) {
      return { data: null, error: { message: "Each rank can only be used once." } };
    }
    const teamId = row.teamId?.trim() || null;
    const athleteId = row.athleteId?.trim() || null;
    if ((teamId && athleteId) || (!teamId && !athleteId)) {
      return { data: null, error: { message: "Each ranking row is a team or an athlete." } };
    }
    const key = teamId ? `t:${teamId}` : `a:${athleteId}`;
    if (usedKeys.has(key)) {
      return { data: null, error: { message: "Each team or athlete can only be ranked once." } };
    }
    usedRanks.add(rank);
    usedKeys.add(key);
    prepared.push({ rank, teamId, athleteId });
  }

  const relay = isRelayEvent(fixture.data.categoryName);
  if (isAthleticsFormat(fixture.data.formatType) && !relay) {
    const athletes = await listCscAthletes(fixture.data.cscId);
    if (athletes.error) return { data: null, error: athletes.error };
    const allowed = new Set((athletes.data ?? []).map((item) => item.id));
    if (prepared.some((row) => !row.athleteId || !allowed.has(row.athleteId))) {
      return { data: null, error: { message: "Every ranked athlete must belong to this category." } };
    }
  } else {
    const teams = await listTeams({ cscId: fixture.data.cscId });
    if (teams.error) return { data: null, error: teams.error };
    const allowed = new Set((teams.data ?? []).map((item) => item.id));
    if (prepared.some((row) => !row.teamId || !allowed.has(row.teamId))) {
      return { data: null, error: { message: "Every ranked team must belong to this category." } };
    }
  }

  const supabase = createClient();
  const now = new Date().toISOString();
  const { error: clearError } = await supabase
    .from("fixture_ranking")
    .update({ deleted_at: now })
    .eq("fixture_id", fixtureId)
    .is("deleted_at", null);
  if (clearError) return { data: null, error: toServiceError(clearError) };

  if (prepared.length > 0) {
    const { error } = await supabase.from("fixture_ranking").insert(
      prepared.map((row) => ({
        fixture_id: fixtureId,
        rank: row.rank,
        team_id: row.teamId,
        athlete_id: row.athleteId,
      })),
    );
    if (error) return { data: null, error: toServiceError(error) };
  }

  return listFixtureRanking(fixtureId);
}

export async function setFixtureRankingLocked(
  fixtureId: string,
  locked: boolean,
): Promise<ServiceResult<Fixture>> {
  const fixture = await getFixture(fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };

  const ranking = await listFixtureRanking(fixtureId);
  if (ranking.error || !ranking.data) return { data: null, error: ranking.error };

  if (locked) {
    if (!rankingLocksPodium(ranking.data.map((row) => row.rank))) {
      return { data: null, error: { message: "Set 1st, 2nd and 3rd before locking ranking." } };
    }
  } else if (ranking.data.some((row) => isPodiumRank(row.rank) && row.medalDeliveredAt)) {
    return {
      data: null,
      error: { message: "Undo medal delivery on the podium before unlocking ranking." },
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("fixture")
    .update({ rankings_locked_at: locked ? new Date().toISOString() : null })
    .eq("id", fixtureId);
  if (error) return { data: null, error: toServiceError(error) };
  return getFixture(fixtureId);
}
