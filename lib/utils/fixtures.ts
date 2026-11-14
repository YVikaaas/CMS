import type {
  BasketPoints,
  CategoryFixtureConfig,
  FixtureFormatType,
  FixtureMatch,
  FixtureMatchStatus,
  FixtureParticipantResult,
  FixtureRoundType,
  MatchScoreEvent,
  MatchWinner,
  ScoringMode,
  Sport,
} from "@/lib/types/cms";
import {
  ATHLETICS_ONLY_ROUNDS,
  BASKETBALL_FORMATS,
  FIELD_ROUND_TYPES,
  TRACK_ROUND_TYPES,
  defaultParticipantsPerMatch,
  defaultScoringStyle,
  inferAthleticsEvent,
  isAthleticsFormat,
} from "@/lib/utils/athletics";

export const FIXTURE_ROUND_TYPES: FixtureRoundType[] = [
  "league",
  "quarter_final",
  "semi_final",
  "final",
  "third_place",
  "heat",
  "qualifying",
];

export const KNOCKOUT_ROUND_TYPES: FixtureRoundType[] = [
  "quarter_final",
  "semi_final",
  "final",
  "third_place",
];

const ROUND_ORDER: Record<FixtureRoundType, number> = {
  heat: 1,
  qualifying: 2,
  league: 10,
  quarter_final: 11,
  semi_final: 12,
  final: 13,
  third_place: 14,
};

const ROUND_LABELS: Record<FixtureRoundType, string> = {
  league: "League",
  quarter_final: "Quarter Finals",
  semi_final: "Semi Finals",
  final: "Final",
  third_place: "3rd Place",
  heat: "Heats",
  qualifying: "Qualifying",
};

export function isFixtureRoundType(value: string): value is FixtureRoundType {
  return (FIXTURE_ROUND_TYPES as string[]).includes(value);
}

export function parseAvailableRounds(config: unknown): FixtureRoundType[] {
  const raw =
    config && typeof config === "object" && "available_rounds" in config
      ? (config as { available_rounds?: unknown }).available_rounds
      : null;
  const basketballDefault: FixtureRoundType[] = [
    "league",
    "quarter_final",
    "semi_final",
    "final",
    "third_place",
  ];
  if (!Array.isArray(raw)) return basketballDefault;
  const rounds = raw.filter(
    (item): item is FixtureRoundType =>
      typeof item === "string" && isFixtureRoundType(item),
  );
  return rounds.length > 0 ? rounds : basketballDefault;
}

export function roundLabel(type: FixtureRoundType): string {
  return ROUND_LABELS[type];
}

export function roundNumber(type: FixtureRoundType): number {
  return ROUND_ORDER[type];
}

export function sortRoundTypes(rounds: FixtureRoundType[]): FixtureRoundType[] {
  return [...rounds].sort((a, b) => ROUND_ORDER[a] - ROUND_ORDER[b]);
}

export function sortByRoundOrder<T extends { roundType: FixtureRoundType }>(
  rows: T[],
  thenBy?: (a: T, b: T) => number,
): T[] {
  return [...rows].sort((a, b) => {
    const round = ROUND_ORDER[a.roundType] - ROUND_ORDER[b.roundType];
    if (round !== 0) return round;
    return thenBy ? thenBy(a, b) : 0;
  });
}

export function uniqueRoundLabelsInOrder(
  matches: Array<{ roundType: FixtureRoundType; roundLabel: string }>,
): string[] {
  const labels = new Map<FixtureRoundType, string>();
  for (const match of matches) {
    if (!labels.has(match.roundType)) {
      labels.set(match.roundType, match.roundLabel.trim() || roundLabel(match.roundType));
    }
  }
  return sortRoundTypes([...labels.keys()]).map((type) => labels.get(type)!);
}

export function formatLabel(format: FixtureFormatType): string {
  if (format === "league_knockout") return "League + bracket";
  if (format === "bracket_elimination") return "Bracket elimination";
  if (format === "track_rounds") return "Track rounds";
  return "Field attempts";
}

export function roundsForFormat(
  format: FixtureFormatType,
  available: FixtureRoundType[],
): FixtureRoundType[] {
  if (format === "bracket_elimination") {
    return available.filter(
      (round) => round !== "league" && !ATHLETICS_ONLY_ROUNDS.includes(round),
    );
  }
  if (format === "track_rounds") {
    return available.filter((round) => TRACK_ROUND_TYPES.includes(round));
  }
  if (format === "field_attempts") {
    return available.filter((round) => FIELD_ROUND_TYPES.includes(round));
  }
  return available.filter((round) => !ATHLETICS_ONLY_ROUNDS.includes(round));
}

export function formatsForConfig(format: FixtureFormatType): FixtureFormatType[] {
  if (isAthleticsFormat(format)) return ["track_rounds", "field_attempts"];
  return [...BASKETBALL_FORMATS];
}

export function isAthleticsSport(sport?: Pick<Sport, "code" | "eventMode"> | null): boolean {
  return sport?.eventMode === "solo" || sport?.code === "ATH";
}

export function formatsForSport(sport?: Pick<Sport, "code" | "eventMode"> | null): FixtureFormatType[] {
  return isAthleticsSport(sport) ? ["track_rounds", "field_attempts"] : [...BASKETBALL_FORMATS];
}

export function roundsForFormatFamily(format: FixtureFormatType): FixtureRoundType[] {
  if (format === "track_rounds") return [...TRACK_ROUND_TYPES];
  if (format === "field_attempts") return [...FIELD_ROUND_TYPES];
  return ["league", "quarter_final", "semi_final", "final", "third_place"];
}

export function fixtureConfigLabel(config: Pick<CategoryFixtureConfig, "format" | "scoringStyle">): string {
  const format = formatLabel(config.format);
  if (!config.scoringStyle || config.scoringStyle === "simple") return format;
  return `${format} · ${config.scoringStyle}`;
}

export function basketballFixtureConfig(): CategoryFixtureConfig {
  return {
    format: "league_knockout",
    scoringStyle: "simple",
    participantsPerMatch: 2,
    availableRounds: ["league", "quarter_final", "semi_final", "final", "third_place"],
    availableFormats: [...BASKETBALL_FORMATS],
  };
}

export function defaultCategoryFixtureConfig(
  sport: Pick<Sport, "code" | "eventMode"> | null | undefined,
  eventName = "",
): CategoryFixtureConfig {
  if (isAthleticsSport(sport)) {
    const event = inferAthleticsEvent(eventName);
    return normalizeCategoryFixtureConfig({
      format: event.format,
      scoringStyle: event.scoringStyle,
      sport,
    });
  }
  return basketballFixtureConfig();
}

export function serializeFixtureConfig(config: CategoryFixtureConfig) {
  return {
    format: config.format,
    scoring_style: config.scoringStyle,
    available_rounds: config.availableRounds,
    available_formats: config.availableFormats,
    participants_per_match: config.participantsPerMatch,
  };
}

export function normalizeCategoryFixtureConfig(input: {
  format: FixtureFormatType;
  scoringStyle?: string;
  participantsPerMatch?: number;
  availableRounds?: FixtureRoundType[];
  sport?: Pick<Sport, "code" | "eventMode"> | null;
}): CategoryFixtureConfig {
  const allowed = formatsForSport(input.sport);
  const format = allowed.includes(input.format) ? input.format : allowed[0];
  let scoringStyle = input.scoringStyle?.trim() || defaultScoringStyle(format);
  if (!isAthleticsFormat(format)) scoringStyle = "simple";
  else if (format === "track_rounds") scoringStyle = "time";
  else if (scoringStyle !== "distance" && scoringStyle !== "height") scoringStyle = "distance";
  const familyRounds = roundsForFormatFamily(format);
  let availableRounds = (input.availableRounds ?? familyRounds).filter((round) =>
    familyRounds.includes(round),
  );
  if (format === "league_knockout") {
    for (const required of ["league", "semi_final", "final"] as FixtureRoundType[]) {
      if (!availableRounds.includes(required)) availableRounds = [...availableRounds, required];
    }
    availableRounds = sortRoundTypes(availableRounds);
  }
  const participants =
    typeof input.participantsPerMatch === "number" && Number.isFinite(input.participantsPerMatch)
      ? Math.trunc(input.participantsPerMatch)
      : defaultParticipantsPerMatch(format);
  return {
    format,
    scoringStyle,
    participantsPerMatch: participants > 0 ? participants : defaultParticipantsPerMatch(format),
    availableRounds: availableRounds.length > 0 ? availableRounds : familyRounds,
    availableFormats: allowed,
  };
}

export function parseFixtureConfig(config: unknown): CategoryFixtureConfig {
  const rec = config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
  const formatRaw = typeof rec.format === "string" ? rec.format : "";
  const format: FixtureFormatType =
    formatRaw === "track_rounds" ||
    formatRaw === "field_attempts" ||
    formatRaw === "league_knockout" ||
    formatRaw === "bracket_elimination"
      ? formatRaw
      : "league_knockout";
  let availableRounds = parseAvailableRounds(config);
  if (format === "league_knockout") {
    for (const required of ["league", "semi_final", "final"] as FixtureRoundType[]) {
      if (!availableRounds.includes(required)) availableRounds = [...availableRounds, required];
    }
    availableRounds = sortRoundTypes(availableRounds);
  }
  const participantsRaw = rec.participants_per_match;
  const participants =
    typeof participantsRaw === "number" && Number.isFinite(participantsRaw)
      ? Math.trunc(participantsRaw)
      : defaultParticipantsPerMatch(format);
  const scoringStyle =
    typeof rec.scoring_style === "string" && rec.scoring_style.trim()
      ? rec.scoring_style
      : defaultScoringStyle(format);
  return {
    format,
    scoringStyle,
    participantsPerMatch: participants > 0 ? participants : defaultParticipantsPerMatch(format),
    availableRounds,
    availableFormats: formatsForConfig(format),
  };
}

export const PRESET_QF_FINAL: FixtureRoundType[] = [
  "quarter_final",
  "semi_final",
  "final",
  "third_place",
];

export const PRESET_SF_FINAL: FixtureRoundType[] = [
  "semi_final",
  "final",
  "third_place",
];

export function applyKnockoutPreset(
  format: FixtureFormatType,
  preset: FixtureRoundType[],
  available: FixtureRoundType[],
): FixtureRoundType[] {
  const allowed = new Set(roundsForFormat(format, available));
  const knockout = preset.filter((round) => allowed.has(round));
  if (format === "league_knockout" && allowed.has("league")) {
    return ["league", ...knockout];
  }
  return knockout;
}

export function validateFixtureRounds(
  format: FixtureFormatType,
  rounds: FixtureRoundType[],
): string | null {
  const unique = [...new Set(rounds)];
  const hasLeague = unique.includes("league");
  const knockoutCount = unique.filter((round) =>
    KNOCKOUT_ROUND_TYPES.includes(round),
  ).length;
  if (format === "track_rounds") {
    if (unique.length === 0) return "Pick at least one track round.";
    if (unique.some((round) => !TRACK_ROUND_TYPES.includes(round))) {
      return "Track rounds use heat, quarter-final, semi, and/or final.";
    }
    return null;
  }
  if (format === "field_attempts") {
    if (unique.length === 0) return "Pick at least one field round.";
    if (unique.some((round) => !FIELD_ROUND_TYPES.includes(round))) {
      return "Field attempts use qualifying and/or final.";
    }
    return null;
  }
  if (format === "league_knockout") {
    if (!hasLeague || !unique.includes("semi_final") || !unique.includes("final")) {
      return "League + bracket needs league, semi, and final.";
    }
    return null;
  }
  if (hasLeague) return "Bracket elimination cannot include a league round.";
  if (knockoutCount < 1) return "Pick at least one knockout round.";
  return null;
}

export const MATCH_STATUSES: FixtureMatchStatus[] = [
  "draft",
  "scheduled",
  "cancelled",
];

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const PARTICIPANT_RESULTS: FixtureParticipantResult[] = [
  "winner",
  "loser",
  "draw",
  "dns",
  "dnf",
  "dq",
  "bye",
  "pending",
  "no_show",
  "qualified",
];

export function isLeagueRound(roundType: FixtureRoundType): boolean {
  return roundType === "league";
}

export function parseParticipantResult(value: string | null | undefined): FixtureParticipantResult {
  if (value && (PARTICIPANT_RESULTS as string[]).includes(value)) {
    return value as FixtureParticipantResult;
  }
  return "pending";
}

function toNonNegInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

export function parseScoreDetail(detail: unknown): { score: number | null; fouls: number | null } {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return { score: null, fouls: null };
  }
  const rec = detail as Record<string, unknown>;
  return { score: toNonNegInt(rec.score), fouls: toNonNegInt(rec.fouls) };
}

export function formatScoreLine(team1Points: number, team2Points: number): string {
  return `${team1Points}-${team2Points}`;
}

export function displayScore(
  match: Pick<FixtureMatch, "scoreLine" | "team1Points" | "team2Points" | "kind">,
): string {
  if (match.scoreLine) return match.scoreLine;
  if (match.kind === "heat") return "\u2014";
  if (match.team1Points == null && match.team2Points == null) return "\u2014";
  return formatScoreLine(match.team1Points ?? 0, match.team2Points ?? 0);
}

export function winnerFromResults(
  team1: FixtureParticipantResult,
  team2: FixtureParticipantResult,
): MatchWinner | null {
  if (team1 === "winner" && team2 === "loser") return "1";
  if (team2 === "winner" && team1 === "loser") return "2";
  if (team1 === "draw" && team2 === "draw") return "draw";
  return null;
}

export function resultLabel(
  match: Pick<
    FixtureMatch,
    "team1Name" | "team2Name" | "team1ResultStatus" | "team2ResultStatus"
  >,
): string {
  const winner = winnerFromResults(match.team1ResultStatus, match.team2ResultStatus);
  if (winner === "1") return match.team1Name;
  if (winner === "2") return match.team2Name;
  if (winner === "draw") return "Draw";
  return "\u2014";
}

export function resultOutcome(
  match: Pick<FixtureMatch, "status" | "team1ResultStatus" | "team2ResultStatus">,
): string {
  if (match.status === "completed") {
    const winner = winnerFromResults(match.team1ResultStatus, match.team2ResultStatus);
    if (winner === "draw") return "Draw";
    return "Final";
  }
  if (match.status === "in_progress") return "Live";
  if (match.status === "cancelled") return "Cancelled";
  if (match.status === "scheduled") return "Scheduled";
  return "Upcoming";
}

export function sidePoints(points: number | null): string {
  return points == null ? "\u2014" : String(points);
}

export function parseCountInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  return Number(trimmed);
}

export const BASKET_POINTS: BasketPoints[] = [1, 2, 3];

export function isBasketPoints(value: number): value is BasketPoints {
  return value === 1 || value === 2 || value === 3;
}

export function parseScoringMode(detail: unknown): ScoringMode {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return "both";
  const mode = (detail as { scoring_mode?: unknown }).scoring_mode;
  if (mode === "players" || mode === "both" || mode === "totals") return mode;
  return "both";
}

export function sumPlayerPoints(events: MatchScoreEvent[], teamId: string): number {
  return events
    .filter((event) => event.teamId === teamId)
    .reduce((sum, event) => sum + event.points, 0);
}

export function officialTeamPoints(input: {
  mode: ScoringMode;
  typed: number;
  eventSum: number;
  hasEvents: boolean;
}): number {
  if (input.mode === "totals") return input.typed;
  if (input.mode === "players") return input.eventSum;
  return input.hasEvents ? input.eventSum : input.typed;
}

export function detectWinnerFromPoints(
  team1Points: number,
  team2Points: number,
  league: boolean,
): MatchWinner | null {
  if (team1Points > team2Points) return "1";
  if (team2Points > team1Points) return "2";
  if (league) return "draw";
  return null;
}

export function playerScoresPath(matchId: string): string {
  return `/gameplay/scoring?match=${matchId}`;
}
