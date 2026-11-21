import type {
  CompetitionStatus,
  FixtureMatchStatus,
  FixtureStatus,
  Gender,
} from "@/lib/types/cms";

const GENERIC_CATEGORY_NAMES = new Set(["basketball", "athletics"]);

export function categoryEventName(name?: string | null): string | null {
  const value = name?.trim() ?? "";
  if (!value) return null;
  if (GENERIC_CATEGORY_NAMES.has(value.toLowerCase())) return null;
  return value;
}

export function categoryAgeKey(input: { ageGroup: string; name?: string | null }): string {
  const event = categoryEventName(input.name);
  return event ? `${input.ageGroup} ${event}` : input.ageGroup;
}

export function ageKeyFromCategoryLabel(label: string): string {
  return label.replace(/^(Boys|Girls)\s+/i, "").trim();
}

export function ageGroupFromCategoryLabel(label: string): string {
  const rest = ageKeyFromCategoryLabel(label);
  const match = rest.match(/^(U\d+)/i);
  return match ? match[1] : rest;
}

export function categoryNameFromLabel(label: string): string {
  return ageKeyFromCategoryLabel(label).replace(/^U\d+\s*/i, "").trim();
}

export function categoryGroupLabel(input: { gender: Gender; ageGroup: string }): string {
  const who = input.gender === "male" ? "Boys" : "Girls";
  return `${who} ${input.ageGroup}`;
}

export function categoryLabel(input: {
  gender: Gender;
  ageGroup: string;
  name?: string | null;
}): string {
  const group = categoryGroupLabel(input);
  const event = categoryEventName(input.name);
  return event ? `${group} ${event}` : group;
}

export function orgCityLine(orgName?: string | null, city?: string | null): string | null {
  const org = orgName?.trim() ?? "";
  const place = city?.trim() ?? "";
  if (org && place) return `${org} · ${place}`;
  return org || place || null;
}

const COMPETITION_STATUS_LABEL: Record<CompetitionStatus, string> = {
  draft: "Not ready",
  active: "Live",
  archived: "Hidden",
};

const FIXTURE_STATUS_LABEL: Record<FixtureStatus, string> = {
  draft: "Not ready",
  published: "Ready",
  in_progress: "Under way",
  completed: "Done",
};

const MATCH_STATUS_LABEL: Record<FixtureMatchStatus, string> = {
  draft: "Not ready",
  scheduled: "Scheduled",
  in_progress: "Under way",
  completed: "Done",
  cancelled: "Cancelled",
  no_show: "Did not start",
};

export function competitionStatusLabel(status: CompetitionStatus): string {
  return COMPETITION_STATUS_LABEL[status];
}

export function fixtureStatusLabel(status: FixtureStatus): string {
  return FIXTURE_STATUS_LABEL[status];
}

export function matchStatusLabel(status: FixtureMatchStatus): string {
  return MATCH_STATUS_LABEL[status];
}
