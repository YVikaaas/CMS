import type {
  FixtureFormatType,
  FixtureMatch,
  FixtureMatchStatus,
  FixtureParticipantResult,
  FixtureRoundType,
  MatchWinner,
} from "@/lib/types/cms";

export const FIXTURE_ROUND_TYPES: FixtureRoundType[] = [
  "league",
  "quarter_final",
  "semi_final",
  "final",
  "third_place",
];

export const KNOCKOUT_ROUND_TYPES: FixtureRoundType[] = [
  "quarter_final",
  "semi_final",
  "final",
  "third_place",
];

const ROUND_ORDER: Record<FixtureRoundType, number> = {
  league: 1,
  quarter_final: 2,
  semi_final: 3,
  final: 4,
  third_place: 5,
};

const ROUND_LABELS: Record<FixtureRoundType, string> = {
  league: "League",
  quarter_final: "Quarter Finals",
  semi_final: "Semi Finals",
  final: "Final",
  third_place: "3rd Place",
};

export function isFixtureRoundType(value: string): value is FixtureRoundType {
  return (FIXTURE_ROUND_TYPES as string[]).includes(value);
}

export function parseAvailableRounds(config: unknown): FixtureRoundType[] {
  const raw =
    config && typeof config === "object" && "available_rounds" in config
      ? (config as { available_rounds?: unknown }).available_rounds
      : null;
  if (!Array.isArray(raw)) return [...FIXTURE_ROUND_TYPES];
  const rounds = raw.filter(
    (item): item is FixtureRoundType =>
      typeof item === "string" && isFixtureRoundType(item),
  );
  return rounds.length > 0 ? rounds : [...FIXTURE_ROUND_TYPES];
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

export function formatLabel(format: FixtureFormatType): string {
  return format === "league_knockout" ? "League + bracket" : "Bracket elimination";
}

export function roundsForFormat(
  format: FixtureFormatType,
  available: FixtureRoundType[],
): FixtureRoundType[] {
  if (format === "bracket_elimination") {
    return available.filter((round) => round !== "league");
  }
  return available;
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
  if (format === "league_knockout") {
    if (!hasLeague || knockoutCount < 1) {
      return "League + bracket needs a league round and at least one knockout round.";
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
  match: Pick<FixtureMatch, "scoreLine" | "team1Points" | "team2Points">,
): string {
  if (match.scoreLine) return match.scoreLine;
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

export function parseCountInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  return Number(trimmed);
}
