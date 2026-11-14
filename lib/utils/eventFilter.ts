import type { Category, ChampionshipOffering, Gender, Sport } from "@/lib/types/cms";
import {
  ageGroupFromCategoryLabel,
  categoryEventName,
  categoryGroupLabel,
  categoryNameFromLabel,
} from "@/lib/utils/labels";

export type EventFilterValue = {
  championshipId: string;
  sportId: string;
  gender: "" | Gender;
  ageGroup: string;
  categoryId: string;
  categoryName: string;
};

const STORAGE_KEY = "cms.eventFilter";

export const EMPTY_EVENT_FILTER: EventFilterValue = {
  championshipId: "",
  sportId: "",
  gender: "",
  ageGroup: "",
  categoryId: "",
  categoryName: "",
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
      categoryName: typeof parsed.categoryName === "string" ? parsed.categoryName : "",
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

export type CategoryPickGroup = {
  key: string;
  gender: Gender;
  ageGroup: string;
  label: string;
  items: Category[];
};

export function groupCategoriesByGenderAge(categories: Category[]): CategoryPickGroup[] {
  const groups = new Map<string, CategoryPickGroup>();
  for (const category of categories) {
    const key = `${category.gender}:${category.ageGroup}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(category);
      continue;
    }
    groups.set(key, {
      key,
      gender: category.gender,
      ageGroup: category.ageGroup,
      label: categoryGroupLabel(category),
      items: [category],
    });
  }
  return [...groups.values()].sort((left, right) => {
    if (left.gender !== right.gender) return left.gender === "male" ? -1 : 1;
    return left.ageGroup.localeCompare(right.ageGroup, undefined, { numeric: true });
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

export function namesForSportGenderAge(
  categories: Category[],
  gender?: "" | Gender,
  ageGroup?: string,
): string[] {
  const set = new Set<string>();
  categories
    .filter((row) => {
      if (gender && row.gender !== gender) return false;
      if (ageGroup && row.ageGroup !== ageGroup) return false;
      return true;
    })
    .forEach((row) => set.add(row.name));
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function categoriesForSportGenderAge(
  categories: Category[],
  sportId: string,
  gender: "" | Gender,
  ageGroup: string,
): Category[] {
  return categories
    .filter((row) => {
      if (sportId && row.sportId !== sportId) return false;
      if (gender && row.gender !== gender) return false;
      if (ageGroup && row.ageGroup !== ageGroup) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export function categoryForSelection(
  categories: Category[],
  sportId: string,
  gender: Gender,
  ageGroup: string,
  categoryId?: string,
): Category | null {
  const matches = categoriesForSportGenderAge(categories, sportId, gender, ageGroup);
  if (categoryId) return matches.find((row) => row.id === categoryId) ?? null;
  return matches.length === 1 ? matches[0] : null;
}

export function applySport(current: EventFilterValue, sportId: string): EventFilterValue {
  return {
    ...current,
    sportId,
    gender: "",
    ageGroup: "",
    categoryId: "",
    categoryName: "",
  };
}

export function applyGender(current: EventFilterValue, gender: "" | Gender): EventFilterValue {
  return {
    ...current,
    gender,
    ageGroup: "",
    categoryId: "",
    categoryName: "",
  };
}

export function applyAge(
  current: EventFilterValue,
  ageGroup: string,
  categories: Category[],
): EventFilterValue {
  if (!ageGroup) {
    return { ...current, ageGroup: "", categoryId: "", categoryName: "" };
  }
  const matches = categoriesForSportGenderAge(
    categories,
    current.sportId,
    current.gender,
    ageGroup,
  );
  const only = matches.length === 1 ? matches[0] : null;
  return {
    ...current,
    ageGroup,
    categoryId: only?.id ?? "",
    categoryName: only?.name ?? "",
  };
}

export function applyCategory(
  current: EventFilterValue,
  categoryId: string,
  categories: Category[],
): EventFilterValue {
  if (!categoryId) {
    return { ...current, categoryId: "", categoryName: "" };
  }
  const match = categories.find((row) => row.id === categoryId) ?? null;
  if (!match) return { ...current, categoryId: "", categoryName: "" };
  return {
    ...current,
    gender: match.gender,
    ageGroup: match.ageGroup,
    categoryId: match.id,
    categoryName: match.name,
  };
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

function ageMatchesFilter(filterAge: string, categoryAge: string, label: string): boolean {
  if (!filterAge) return true;
  const age = categoryAge || ageGroupFromCategoryLabel(label);
  return age.toLowerCase() === filterAge.toLowerCase();
}

function nameMatchesFilter(filterName: string, categoryName: string, label: string): boolean {
  if (!filterName) return true;
  const event = categoryEventName(filterName);
  if (!event) return true;
  const name = categoryName || categoryNameFromLabel(label);
  return name.toLowerCase() === filterName.toLowerCase();
}

export function fixturePassesEventFilter(
  fixture: { sportId: string; categoryId: string; categoryLabel: string },
  filter: EventFilterValue,
  category?: Pick<Category, "gender" | "ageGroup" | "sportId" | "name"> | null,
): boolean {
  if (filter.sportId && fixture.sportId !== filter.sportId) return false;
  if (filter.categoryId && fixture.categoryId !== filter.categoryId) return false;
  const gender = genderFromCategoryLabel(fixture.categoryLabel) || category?.gender || "";
  if (filter.gender && gender !== filter.gender) return false;
  if (!ageMatchesFilter(filter.ageGroup, category?.ageGroup ?? "", fixture.categoryLabel)) {
    return false;
  }
  if (!nameMatchesFilter(filter.categoryName, category?.name ?? "", fixture.categoryLabel)) {
    return false;
  }
  return true;
}

export function cscPassesEventFilter(
  row: {
    sportId: string;
    categoryId: string;
    categoryGender: Gender;
    categoryLabel: string;
    categoryAgeGroup?: string;
    categoryName?: string;
  },
  filter: EventFilterValue,
): boolean {
  if (filter.sportId && row.sportId !== filter.sportId) return false;
  if (filter.categoryId && row.categoryId !== filter.categoryId) return false;
  const gender = row.categoryGender || genderFromCategoryLabel(row.categoryLabel);
  if (filter.gender && gender !== filter.gender) return false;
  if (!ageMatchesFilter(filter.ageGroup, row.categoryAgeGroup ?? "", row.categoryLabel)) {
    return false;
  }
  if (!nameMatchesFilter(filter.categoryName, row.categoryName ?? "", row.categoryLabel)) {
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
  if (!ageMatchesFilter(filter.ageGroup, "", match.categoryLabel)) return false;
  if (!nameMatchesFilter(filter.categoryName, "", match.categoryLabel)) return false;
  return true;
}

export function eventIdentityEyebrow(
  sportName?: string | null,
  gender?: "" | Gender,
  ageGroup?: string,
  name?: string | null,
): string {
  const parts: string[] = [];
  if (sportName?.trim()) parts.push(sportName.trim());
  if (gender) parts.push(gender === "male" ? "BOYS" : "GIRLS");
  if (ageGroup?.trim()) parts.push(ageGroup.trim());
  if (name?.trim()) parts.push(name.trim());
  return parts.map((part) => part.toUpperCase()).join(" · ");
}

export function eventIdentityTitle(
  gender?: "" | Gender,
  ageGroup?: string,
  name?: string | null,
  sportName?: string | null,
): string {
  if (gender && ageGroup) {
    const who = gender === "male" ? "Boys" : "Girls";
    const event = name?.trim();
    return event ? `${who} ${ageGroup} ${event}` : `${who} ${ageGroup}`;
  }
  if (gender) return genderLabel(gender);
  return sportName?.trim() || "";
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
