import type {
  AthleticsResultCode,
  FieldAttempt,
  FieldAttemptStatus,
  FixtureFormatType,
  FixtureMatch,
  FixtureParticipantResult,
  FixtureRoundType,
  HeatParticipant,
} from "@/lib/types/cms";

export const TRACK_ROUND_TYPES: FixtureRoundType[] = [
  "heat",
  "quarter_final",
  "semi_final",
  "final",
];
export const FIELD_ROUND_TYPES: FixtureRoundType[] = ["qualifying", "final"];
export const ATHLETICS_ONLY_ROUNDS: FixtureRoundType[] = ["heat", "qualifying"];
export const ATHLETICS_FORMATS: FixtureFormatType[] = ["track_rounds", "field_attempts"];
export const BASKETBALL_FORMATS: FixtureFormatType[] = [
  "bracket_elimination",
  "league_knockout",
];

export const ATHLETICS_RESULT_CODES: AthleticsResultCode[] = [
  "ok",
  "dns",
  "dnf",
  "dq",
  "nm",
];

export function isAthleticsFormat(format: FixtureFormatType): boolean {
  return format === "track_rounds" || format === "field_attempts";
}

export function isHeatMatch(match: Pick<FixtureMatch, "kind" | "formatType">): boolean {
  return match.kind === "heat" || isAthleticsFormat(match.formatType);
}

export function defaultVenue(format: FixtureFormatType): string {
  if (format === "field_attempts") return "Pit 1";
  if (format === "track_rounds") return "Track 1";
  return "Court 1";
}

export function defaultParticipantsPerMatch(format: FixtureFormatType): number {
  if (format === "field_attempts") return 12;
  if (format === "track_rounds") return 8;
  return 2;
}

export function clampHeatLanes(value: number): number {
  const lanes = Math.trunc(value);
  if (!Number.isFinite(lanes) || lanes < 2) return 8;
  if (lanes > 24) return 24;
  return lanes;
}

export const FIELD_QUALIFYING_FINALISTS = 8;

function roundTypesOf(
  rounds: Array<{ roundType: FixtureRoundType } | FixtureRoundType>,
): FixtureRoundType[] {
  return rounds.map((row) => (typeof row === "string" ? row : row.roundType));
}

/** Final with no qualifying round — the whole field jumps in the final. */
export function isDirectFieldFinal(
  formatType: FixtureFormatType,
  rounds: Array<{ roundType: FixtureRoundType } | FixtureRoundType>,
): boolean {
  if (formatType !== "field_attempts") return false;
  const types = roundTypesOf(rounds);
  return types.includes("final") && !types.includes("qualifying");
}

/** Athletes allowed in one flight. `null` means no cap (qualifying or a direct final). */
export function fieldFlightAthleteCap(
  formatType: FixtureFormatType,
  roundType: FixtureRoundType,
  rounds: Array<{ roundType: FixtureRoundType } | FixtureRoundType>,
): number | null {
  if (formatType !== "field_attempts") return null;
  if (roundType === "final" && !isDirectFieldFinal(formatType, rounds)) {
    return FIELD_QUALIFYING_FINALISTS;
  }
  return null;
}

export function heatEntryLimit(input: {
  formatType: FixtureFormatType;
  roundType: FixtureRoundType;
  rounds: Array<{ roundType: FixtureRoundType } | FixtureRoundType>;
  participantsPerMatch: number;
}): number | null {
  if (input.formatType === "field_attempts") {
    return fieldFlightAthleteCap(input.formatType, input.roundType, input.rounds);
  }
  if (isAthleticsFormat(input.formatType)) {
    return clampHeatLanes(input.participantsPerMatch);
  }
  return 2;
}

export function heatSlotCount(input: {
  formatType: FixtureFormatType;
  roundType: FixtureRoundType;
  rounds: Array<{ roundType: FixtureRoundType } | FixtureRoundType>;
  participantsPerMatch: number;
  filledCount: number;
  optionCount: number;
}): number {
  const cap = heatEntryLimit(input);
  if (cap != null) return Math.max(cap, input.filledCount);
  if (input.formatType === "field_attempts") {
    return Math.max(input.filledCount, input.optionCount, 8);
  }
  return clampHeatLanes(input.participantsPerMatch);
}

export function fieldFlightCapHint(
  formatType: FixtureFormatType,
  roundType: FixtureRoundType,
  rounds: Array<{ roundType: FixtureRoundType } | FixtureRoundType>,
): string {
  if (formatType !== "field_attempts") return "";
  if (roundType === "qualifying") {
    return "Qualifying has no athlete cap. Put everyone in one flight, or split across flights.";
  }
  if (isDirectFieldFinal(formatType, rounds)) {
    return "Direct final has no athlete cap.";
  }
  if (roundType === "final") {
    return `Final after qualifying is ${FIELD_QUALIFYING_FINALISTS} athletes.`;
  }
  return "";
}

export function defaultScoringStyle(format: FixtureFormatType): string {
  if (format === "field_attempts") return "distance";
  if (format === "track_rounds") return "time";
  return "simple";
}

export type AthleticsEventKind = {
  name: string;
  format: FixtureFormatType;
  scoringStyle: string;
};

export const ATHLETICS_EVENTS: AthleticsEventKind[] = [
  { name: "100m", format: "track_rounds", scoringStyle: "time" },
  { name: "200m", format: "track_rounds", scoringStyle: "time" },
  { name: "400m", format: "track_rounds", scoringStyle: "time" },
  { name: "800m", format: "track_rounds", scoringStyle: "time" },
  { name: "1500m", format: "track_rounds", scoringStyle: "time" },
  { name: "4x100m", format: "track_rounds", scoringStyle: "time" },
  { name: "4x400m", format: "track_rounds", scoringStyle: "time" },
  { name: "Long Jump", format: "field_attempts", scoringStyle: "distance" },
  { name: "High Jump", format: "field_attempts", scoringStyle: "height" },
  { name: "Shot Put", format: "field_attempts", scoringStyle: "distance" },
];

export function isRelayEvent(name?: string | null): boolean {
  const value = (name ?? "").trim().toLowerCase().replace(/\s+/g, "");
  return /^4x\d/.test(value) || value.includes("relay");
}

export function defaultAthleticsRoster(eventName = ""): { teamSize: number; maxTeamSize: number } {
  if (isRelayEvent(eventName)) return { teamSize: 4, maxTeamSize: 4 };
  return { teamSize: 1, maxTeamSize: 1 };
}

export function isSoloAthleticsEvent(eventName = ""): boolean {
  return !isRelayEvent(eventName);
}

export function inferAthleticsEvent(eventName: string): AthleticsEventKind {
  const name = eventName.trim();
  const known = ATHLETICS_EVENTS.find((row) => row.name.toLowerCase() === name.toLowerCase());
  if (known) return known;
  const lowered = name.toLowerCase();
  if (/\bhigh jump\b|\bpole vault\b/.test(lowered)) {
    return { name, format: "field_attempts", scoringStyle: "height" };
  }
  if (/\bjump\b|\bshot\b|\bput\b|\bdiscus\b|\bjavelin\b/.test(lowered)) {
    return { name, format: "field_attempts", scoringStyle: "distance" };
  }
  return { name, format: "track_rounds", scoringStyle: "time" };
}

export function athleticsFixtureConfig(eventName: string) {
  const event = inferAthleticsEvent(eventName);
  return {
    format: event.format,
    scoring_style: event.scoringStyle,
    available_rounds: (event.format === "field_attempts"
      ? FIELD_ROUND_TYPES
      : TRACK_ROUND_TYPES) as FixtureRoundType[],
    available_formats: ATHLETICS_FORMATS,
    participants_per_match: defaultParticipantsPerMatch(event.format),
  };
}

export function defaultHeatLabel(format: FixtureFormatType, number: number): string {
  if (format === "field_attempts") return `Flight ${number}`;
  return `Heat ${number}`;
}

export function heatQueueTitle(match: Pick<FixtureMatch, "matchLabel" | "matchNumber" | "formatType">): string {
  if (match.matchLabel.trim()) return match.matchLabel;
  return defaultHeatLabel(match.formatType, match.matchNumber);
}

export function heatEntryNoun(participants: Array<Pick<HeatParticipant, "athleteId">>): "athletes" | "teams" {
  if (participants.length > 0 && participants.every((row) => !row.athleteId)) return "teams";
  return "athletes";
}

export function heatQueueHint(match: Pick<FixtureMatch, "participants">): string {
  const count = match.participants.length;
  const noun = heatEntryNoun(match.participants);
  const lead = match.participants.find((row) => row.place === 1);
  if (lead) return `${count} ${noun} · ${lead.name} ${displayAthleticsMark(lead)}`;
  return `${count} ${noun}`;
}

export function parseLane(label: string): number {
  const value = Number(label);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export function isAthleticsResultCode(value: string): value is AthleticsResultCode {
  return (ATHLETICS_RESULT_CODES as string[]).includes(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseAttemptStatus(value: unknown): FieldAttemptStatus {
  if (value === "foul" || value === "pass" || value === "ok") return value;
  return "ok";
}

export function parseFieldAttempts(value: unknown): FieldAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { mark: null, status: "ok" as const };
    }
    const rec = item as Record<string, unknown>;
    return {
      mark: toFiniteNumber(rec.mark),
      status: parseAttemptStatus(rec.status),
    };
  });
}

function timeMsFromDetail(rec: Record<string, unknown>): number | null {
  const seconds = toFiniteNumber(rec.time_seconds);
  if (seconds != null && seconds >= 0) return Math.round(seconds * 1000);
  const ms = toFiniteNumber(rec.time_ms);
  return ms != null && ms >= 0 ? ms : null;
}

export function parseAthleticsDetail(detail: unknown): {
  timeMs: number | null;
  timeSeconds: number | null;
  mark: number | null;
  unit: string;
  place: number | null;
  qualified: boolean;
  resultCode: AthleticsResultCode;
  attempts: FieldAttempt[];
} {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return {
      timeMs: null,
      timeSeconds: null,
      mark: null,
      unit: "m",
      place: null,
      qualified: false,
      resultCode: "ok",
      attempts: [],
    };
  }
  const rec = detail as Record<string, unknown>;
  const resultCode = isAthleticsResultCode(String(rec.result_code ?? ""))
    ? (rec.result_code as AthleticsResultCode)
    : "ok";
  const timeMs = timeMsFromDetail(rec);
  return {
    timeMs,
    timeSeconds: timeMs == null ? null : timeMs / 1000,
    mark: toFiniteNumber(rec.mark),
    unit: typeof rec.unit === "string" && rec.unit.trim() ? rec.unit : "m",
    place: toFiniteNumber(rec.place) != null ? Math.trunc(toFiniteNumber(rec.place) as number) : null,
    qualified: rec.qualified === true,
    resultCode,
    attempts: parseFieldAttempts(rec.attempts),
  };
}

/** Accepts `12.34`, `1:02.45`, or `1:02:03.4`. */
export function parseTimeToMs(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length > 3) return null;
  const secondsPart = parts[parts.length - 1] ?? "";
  if (!/^\d+(\.\d{1,3})?$/.test(secondsPart)) return null;
  const seconds = Number(secondsPart);
  if (!Number.isFinite(seconds) || seconds >= 60 && parts.length > 1) return null;
  let minutes = 0;
  let hours = 0;
  if (parts.length === 2) {
    if (!/^\d+$/.test(parts[0] ?? "")) return null;
    minutes = Number(parts[0]);
  }
  if (parts.length === 3) {
    if (!/^\d+$/.test(parts[0] ?? "") || !/^\d+$/.test(parts[1] ?? "")) return null;
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    if (minutes >= 60) return null;
  }
  if (hours < 0 || minutes < 0 || seconds < 0) return null;
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

export function formatTimeMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "";
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds - hours * 3600 - minutes * 60;
  const sec = seconds.toFixed(2).padStart(5, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${sec}`;
  }
  if (minutes > 0) {
    return `${minutes}:${sec}`;
  }
  return seconds.toFixed(2);
}

export function sanitizeTimeInput(raw: string): string {
  return raw.replace(/[^0-9.:]/g, "").slice(0, 12);
}

export function sanitizeMarkInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned.slice(0, 6);
  return `${cleaned.slice(0, dot).slice(0, 3)}.${cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 3)}`;
}

export function parseMarkInput(raw: string): number | null {
  const value = raw.trim();
  if (!value || value === ".") return null;
  if (!/^\d*\.?\d{0,3}$/.test(value)) return null;
  if (value.endsWith(".")) return null;
  const mark = Number(value.startsWith(".") ? `0${value}` : value);
  return Number.isFinite(mark) && mark >= 0 ? mark : null;
}

export type TrackTimeParts = {
  minutes: string;
  seconds: string;
  milliseconds: string;
};

export const EMPTY_TRACK_TIME: TrackTimeParts = {
  minutes: "",
  seconds: "",
  milliseconds: "",
};

export function trackTimePartsFromMs(ms: number | null | undefined): TrackTimeParts {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return { ...EMPTY_TRACK_TIME };
  let total = Math.round(ms / 10) * 10;
  let minutes = Math.floor(total / 60_000);
  let remainder = total % 60_000;
  let seconds = Math.floor(remainder / 1000);
  let hundredths = Math.round((remainder % 1000) / 10);
  if (hundredths === 100) {
    hundredths = 0;
    seconds += 1;
  }
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  return {
    minutes: String(minutes),
    seconds: String(seconds),
    milliseconds: String(hundredths),
  };
}

export function trackTimePartsToSeconds(parts: TrackTimeParts): number | null {
  const empty = !parts.minutes && !parts.seconds && !parts.milliseconds;
  if (empty) return null;
  const minutes = parts.minutes === "" ? 0 : Number(parts.minutes);
  const seconds = parts.seconds === "" ? 0 : Number(parts.seconds);
  const hundredths = parts.milliseconds === "" ? 0 : Number(parts.milliseconds);
  if (![minutes, seconds, hundredths].every((value) => Number.isFinite(value))) return null;
  if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
  if (hundredths < 0 || hundredths > 99) return null;
  const total = minutes * 60 + seconds + hundredths / 100;
  return total > 0 ? Math.round(total * 100) / 100 : null;
}

export function trackTimePartsToMs(parts: TrackTimeParts): number | null {
  const seconds = trackTimePartsToSeconds(parts);
  return seconds == null ? null : Math.round(seconds * 1000);
}

export function secondsFromMs(ms: number | null | undefined): number | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  return Math.round((ms / 1000) * 100) / 100;
}

export function formatMark(mark: number | null | undefined, unit = "m"): string {
  if (mark == null || !Number.isFinite(mark)) return "";
  const text = Number.isInteger(mark) ? String(mark) : mark.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return unit ? `${text} ${unit}` : text;
}

export function bestFieldMark(attempts: FieldAttempt[]): number | null {
  const marks = attempts
    .filter((attempt) => attempt.status === "ok" && attempt.mark != null)
    .map((attempt) => attempt.mark as number);
  if (marks.length === 0) return null;
  return Math.max(...marks);
}

/** World Athletics field card: measured mark, X for a foul, − for a pass. */
export function fieldAttemptNotation(attempt: FieldAttempt): string {
  if (attempt.status === "foul") return "X";
  if (attempt.status === "pass") return "−";
  if (attempt.mark == null) return "";
  return formatMark(attempt.mark, "").trim();
}

export function fieldAttemptsAreNoMark(attempts: FieldAttempt[]): boolean {
  const taken = attempts.filter(
    (attempt) => attempt.status === "foul" || attempt.status === "pass" || attempt.mark != null,
  );
  if (taken.length === 0) return false;
  return taken.every((attempt) => attempt.status !== "ok" || attempt.mark == null);
}

export function fieldAttemptSeries(attempts: FieldAttempt[]): string {
  return attempts
    .map((attempt) => fieldAttemptNotation(attempt))
    .filter((part) => part.length > 0)
    .join(" / ");
}

export function resultCodeFromStatus(
  status: FixtureParticipantResult,
  fallback: AthleticsResultCode = "ok",
): AthleticsResultCode {
  if (status === "dns" || status === "dnf" || status === "dq") return status;
  return fallback;
}

export function statusForAthletics(input: {
  resultCode: AthleticsResultCode;
  qualified: boolean;
  place: number | null;
  finalRound: boolean;
}): FixtureParticipantResult {
  if (input.resultCode === "dns") return "dns";
  if (input.resultCode === "dnf") return "dnf";
  if (input.resultCode === "dq") return "dq";
  if (input.finalRound && input.place === 1) return "winner";
  if (input.qualified) return "qualified";
  return "pending";
}

export function displayAthleticsMark(row: Pick<HeatParticipant, "resultCode" | "score" | "timeMs" | "mark" | "unit">): string {
  if (row.resultCode === "dns") return "DNS";
  if (row.resultCode === "dnf") return "DNF";
  if (row.resultCode === "dq") return "DQ";
  if (row.resultCode === "nm") return "NM";
  if (row.score.trim()) return row.score;
  if (row.timeMs != null) return formatTimeMs(row.timeMs);
  if (row.mark != null) return formatMark(row.mark, row.unit);
  return "—";
}

export function heatScoreLine(participants: HeatParticipant[]): string {
  const first = [...participants]
    .filter((row) => row.place === 1)
    .sort((a, b) => a.lane - b.lane)[0];
  if (first) return `1. ${first.name} ${displayAthleticsMark(first)}`.trim();
  if (participants.length === 0) return "";
  return `${participants.length} ${heatEntryNoun(participants)}`;
}

export function rankAthletics(rows: Array<{
  resultCode: AthleticsResultCode;
  timeMs: number | null;
  mark: number | null;
}>, style: "time" | "distance" | "height"): Array<number | null> {
  const eligible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (row.resultCode !== "ok") return false;
      if (style === "time") return row.timeMs != null;
      return row.mark != null;
    })
    .sort((a, b) => {
      if (style === "time") return (a.row.timeMs ?? 0) - (b.row.timeMs ?? 0);
      return (b.row.mark ?? 0) - (a.row.mark ?? 0);
    });

  const places: Array<number | null> = rows.map(() => null);
  eligible.forEach((item, order) => {
    places[item.index] = order + 1;
  });
  return places;
}

export function autoQualify(
  places: Array<number | null>,
  qualifyCount: number,
): boolean[] {
  if (qualifyCount <= 0) return places.map(() => false);
  return places.map((place) => place != null && place <= qualifyCount);
}

export function qualifyCountForRound(roundType: FixtureRoundType): number {
  if (roundType === "final") return 0;
  return 8;
}

export const DEFAULT_FIELD_ATTEMPTS = 3;
export const DEFAULT_FIELD_FINAL_ATTEMPTS = 2;

export function clampAttemptCount(value: number, fallback = DEFAULT_FIELD_ATTEMPTS): number {
  const count = Math.trunc(value);
  if (!Number.isFinite(count) || count < 1) return fallback;
  if (count > 8) return 8;
  return count;
}

export function defaultFieldAttemptPlan(roundType?: FixtureRoundType): {
  attemptCount: number;
  extraAttemptCount: number;
} {
  const attemptCount =
    roundType === "final" ? DEFAULT_FIELD_FINAL_ATTEMPTS : DEFAULT_FIELD_ATTEMPTS;
  return { attemptCount, extraAttemptCount: 0 };
}

export function fieldAttemptSlots(input: {
  attemptCount?: number | null;
  extraAttemptCount?: number | null;
}): number {
  return clampAttemptCount(input.attemptCount ?? DEFAULT_FIELD_ATTEMPTS);
}

export function emptyAttempts(count = DEFAULT_FIELD_ATTEMPTS): FieldAttempt[] {
  return Array.from({ length: count }, () => ({ mark: null, status: "ok" as const }));
}

export function padFieldAttempts(attempts: FieldAttempt[], total: number): FieldAttempt[] {
  const size = Math.max(0, Math.trunc(total));
  const next = attempts.slice(0, size);
  while (next.length < size) next.push({ mark: null, status: "ok" });
  return next;
}

export function athleticsScoreText(input: {
  resultCode: AthleticsResultCode;
  timeMs: number | null;
  mark: number | null;
  unit: string;
  style: "time" | "distance" | "height";
}): string {
  if (input.resultCode === "dns") return "DNS";
  if (input.resultCode === "dnf") return "DNF";
  if (input.resultCode === "dq") return "DQ";
  if (input.resultCode === "nm") return "NM";
  if (input.style === "time") return formatTimeMs(input.timeMs);
  return formatMark(input.mark, input.unit).replace(` ${input.unit}`, "");
}
