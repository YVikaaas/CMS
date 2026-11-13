import type { Category, ChampionshipOffering, Gender, Sport } from "@/lib/types/cms";
import { categoryLabel } from "@/lib/utils/labels";

export type EventFilterValue = {
  championshipId: string;
  sportId: string;
  gender: "" | Gender;
  ageGroup: string;
  categoryId: string;
};

const STORAGE_KEY = "cms.eventFilter";

export const EMPTY_EVENT_FILTER: EventFilterValue = {
  championshipId: "",
  sportId: "",
  gender: "",
  ageGroup: "",
  categoryId: "",
};

export function emptyEventFilter(championshipId: string): EventFilterValue {
  return { ...EMPTY_EVENT_FILTER, championshipId };
}

export function readEventFilter(championshipId: string): EventFilterValue {
  if (typeof window === "undefined") return emptyEventFilter(championshipId);
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyEventFilter(championshipId);
    const parsed = JSON.parse(raw) as Partial<EventFilterValue>;
    if (parsed.championshipId !== championshipId) {
      return emptyEventFilter(championshipId);
    }
    return {
      championshipId,
      sportId: typeof parsed.sportId === "string" ? parsed.sportId : "",
      gender: parsed.gender === "male" || parsed.gender === "female" ? parsed.gender : "",
      ageGroup: typeof parsed.ageGroup === "string" ? parsed.ageGroup : "",
      categoryId: typeof parsed.categoryId === "string" ? parsed.categoryId : "",
    };
  } catch {
    return emptyEventFilter(championshipId);
  }
}

export function writeEventFilter(value: EventFilterValue): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function offeredCategoryIds(offerings: ChampionshipOffering[]): Set<string> {
  return new Set(offerings.flatMap((row) => row.categoryIds));
}

export function offeredSports(
  sports: Sport[],
  offerings: ChampionshipOffering[],
): Sport[] {
  const ids = new Set(offerings.map((row) => row.sportId));
  return sports.filter((sport) => ids.has(sport.id));
}

export function offeredCategories(
  categories: Category[],
  offerings: ChampionshipOffering[],
  sportId?: string,
): Category[] {
  const ids = offeredCategoryIds(offerings);
  return categories.filter((row) => {
    if (!ids.has(row.id)) return false;
    if (sportId && row.sportId !== sportId) return false;
    return true;
  });
}

export function gendersForSport(categories: Category[]): Gender[] {
  const set = new Set<Gender>();
  categories.forEach((row) => set.add(row.gender));
  return (["male", "female"] as Gender[]).filter((item) => set.has(item));
}

export function agesForSportGender(categories: Category[], gender?: "" | Gender): string[] {
  const set = new Set<string>();
  categories
    .filter((row) => !gender || row.gender === gender)
    .forEach((row) => set.add(row.ageGroup));
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function categoryForSelection(
  categories: Category[],
  sportId: string,
  gender: Gender,
  ageGroup: string,
): Category | null {
  return (
    categories.find(
      (row) =>
        row.sportId === sportId && row.gender === gender && row.ageGroup === ageGroup,
    ) ?? null
  );
}

export function applySport(current: EventFilterValue, sportId: string): EventFilterValue {
  return {
    ...current,
    sportId,
    gender: "",
    ageGroup: "",
    categoryId: "",
  };
}

export function applyGender(current: EventFilterValue, gender: "" | Gender): EventFilterValue {
  return {
    ...current,
    gender,
    ageGroup: "",
    categoryId: "",
  };
}

export function applyAge(
  current: EventFilterValue,
  ageGroup: string,
  categories: Category[],
): EventFilterValue {
  if (!ageGroup) {
    return { ...current, ageGroup: "", categoryId: "" };
  }
  if (current.sportId && current.gender) {
    const match = categoryForSelection(categories, current.sportId, current.gender, ageGroup);
    return { ...current, ageGroup, categoryId: match?.id ?? "" };
  }
  return { ...current, ageGroup, categoryId: "" };
}

export function genderFromCategoryLabel(label: string): "" | Gender {
  const text = label.trim().toLowerCase();
  if (
    text.startsWith("girls") ||
    text.startsWith("girl ") ||
    text.startsWith("female") ||
    /(^|[\s·\-/])girls?\b/.test(text)
  ) {
    return "female";
  }
  if (
    text.startsWith("boys") ||
    text.startsWith("boy ") ||
    text.startsWith("male") ||
    /(^|[\s·\-/])boys?\b/.test(text)
  ) {
    return "male";
  }
  return "";
}

export function fixturePassesEventFilter(
  fixture: { sportId: string; categoryId: string; categoryLabel: string },
  filter: EventFilterValue,
  category?: Pick<Category, "gender" | "ageGroup" | "sportId"> | null,
): boolean {
  if (filter.sportId && fixture.sportId !== filter.sportId) return false;
  if (filter.categoryId && fixture.categoryId !== filter.categoryId) return false;
  const gender = genderFromCategoryLabel(fixture.categoryLabel) || category?.gender || "";
  if (filter.gender && gender !== filter.gender) return false;
  const ageGroup = category?.ageGroup || "";
  if (filter.ageGroup) {
    const haystack = `${ageGroup} ${fixture.categoryLabel}`.toLowerCase();
    if (!haystack.includes(filter.ageGroup.toLowerCase())) return false;
  }
  return true;
}

export function cscPassesEventFilter(
  row: {
    sportId: string;
    categoryId: string;
    categoryGender: Gender;
    categoryLabel: string;
  },
  filter: EventFilterValue,
): boolean {
  if (filter.sportId && row.sportId !== filter.sportId) return false;
  if (filter.categoryId && row.categoryId !== filter.categoryId) return false;
  const gender = row.categoryGender || genderFromCategoryLabel(row.categoryLabel);
  if (filter.gender && gender !== filter.gender) return false;
  if (filter.ageGroup && !row.categoryLabel.toLowerCase().includes(filter.ageGroup.toLowerCase())) {
    return false;
  }
  return true;
}

export function matchPassesEventFilter(
  match: { sportName: string; categoryLabel: string; fixtureId?: string },
  filter: EventFilterValue,
  sportName?: string | null,
): boolean {
  if (filter.sportId && sportName && match.sportName !== sportName) return false;
  const gender = genderFromCategoryLabel(match.categoryLabel);
  if (filter.gender && gender !== filter.gender) return false;
  if (filter.ageGroup && !match.categoryLabel.toLowerCase().includes(filter.ageGroup.toLowerCase())) {
    return false;
  }
  return true;
}

export function eventIdentityEyebrow(
  sportName: string,
  gender: Gender,
  ageGroup: string,
): string {
  const who = gender === "male" ? "BOYS" : "GIRLS";
  return `${sportName.toUpperCase()} · ${who} · ${ageGroup.toUpperCase()}`;
}

export function eventIdentityTitle(gender: Gender, ageGroup: string): string {
  return categoryLabel({ gender, ageGroup });
}

export function genderLabel(gender: Gender): string {
  return gender === "male" ? "Boys" : "Girls";
}

export function isEventFilterSelected(value: EventFilterValue): boolean {
  return Boolean(value.sportId && value.gender && value.ageGroup);
}

export function isEventFilterComplete(value: EventFilterValue): boolean {
  return isEventFilterSelected(value) && Boolean(value.categoryId);
}
