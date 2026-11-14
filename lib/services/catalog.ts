import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  CategoryFixtureConfig,
  FixtureFormatType,
  FixtureRoundType,
  Gender,
  ServiceResult,
  Sport,
  SportEventMode,
} from "@/lib/types/cms";
import { categoryNameError, nameError } from "@/lib/utils/validation";
import { defaultAthleticsRoster } from "@/lib/utils/athletics";
import {
  defaultCategoryFixtureConfig,
  formatsForSport,
  isAthleticsSport,
  normalizeCategoryFixtureConfig,
  parseFixtureConfig,
  serializeFixtureConfig,
} from "@/lib/utils/fixtures";
import { toServiceError } from "./errors";

function categoryWriteError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  if (/category_sport_gender_age_name_live_idx|duplicate key/i.test(message)) {
    return { message: "That event already exists for this gender and age." };
  }
  return toServiceError(error);
}

type SportRow = {
  id: string;
  name: string;
  code: string;
  event_mode: SportEventMode;
  created_at: string;
};

type CategoryRow = {
  id: string;
  sport_id: string;
  name: string;
  gender: Gender;
  age_group: string;
  age_min: number;
  age_max: number;
  team_size: number;
  max_team_size: number;
  fixture_config: unknown;
  created_at: string;
};

const CATEGORY_SELECT =
  "id, sport_id, name, gender, age_group, age_min, age_max, team_size, max_team_size, fixture_config, created_at";

function toSport(row: SportRow): Sport {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    eventMode: row.event_mode,
    createdAt: row.created_at,
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    sportId: row.sport_id,
    name: row.name,
    gender: row.gender,
    ageGroup: row.age_group,
    ageMin: row.age_min,
    ageMax: row.age_max,
    teamSize: row.team_size,
    maxTeamSize: row.max_team_size,
    fixtureConfig: parseFixtureConfig(row.fixture_config),
    createdAt: row.created_at,
  };
}

function rosterForSport(
  sport: Pick<Sport, "code" | "eventMode">,
  eventName: string,
  teamSize: number,
  maxTeamSize: number,
): { teamSize: number; maxTeamSize: number } {
  if (isAthleticsSport(sport)) return defaultAthleticsRoster(eventName);
  const min = Number.isFinite(teamSize) && teamSize > 0 ? Math.trunc(teamSize) : 1;
  const max = Number.isFinite(maxTeamSize) && maxTeamSize > 0 ? Math.trunc(maxTeamSize) : min;
  return { teamSize: min, maxTeamSize: Math.max(min, max) };
}

function fixtureFromInput(
  sport: Pick<Sport, "code" | "eventMode">,
  input: {
    format?: FixtureFormatType;
    scoringStyle?: string;
    participantsPerMatch?: number;
    availableRounds?: FixtureRoundType[];
  },
  eventName: string,
): CategoryFixtureConfig {
  const allowed = formatsForSport(sport);
  const fallback = defaultCategoryFixtureConfig(sport, eventName);
  const format = input.format && allowed.includes(input.format) ? input.format : fallback.format;
  return normalizeCategoryFixtureConfig({
    format,
    scoringStyle: input.scoringStyle ?? fallback.scoringStyle,
    participantsPerMatch: input.participantsPerMatch ?? fallback.participantsPerMatch,
    availableRounds: input.availableRounds ?? fallback.availableRounds,
    sport,
  });
}

export async function listSports(): Promise<ServiceResult<Sport[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sport")
    .select("id, name, code, event_mode, created_at")
    .is("deleted_at", null)
    .order("name");
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data ?? []).map(toSport), error: null };
}

export async function createSport(input: {
  name: string;
  code: string;
  eventMode: SportEventMode;
}): Promise<ServiceResult<Sport>> {
  const sportNameErr = nameError(input.name, "Sport name");
  if (sportNameErr) return { data: null, error: { message: sportNameErr } };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sport")
    .insert({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      event_mode: input.eventMode,
    })
    .select("id, name, code, event_mode, created_at")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
  return { data: toSport(data), error: null };
}

export async function updateSport(
  id: string,
  input: { name: string; eventMode: SportEventMode },
): Promise<ServiceResult<Sport>> {
  const sportNameErr = nameError(input.name, "Sport name");
  if (sportNameErr) return { data: null, error: { message: sportNameErr } };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sport")
    .update({ name: input.name.trim(), event_mode: input.eventMode })
    .eq("id", id)
    .select("id, name, code, event_mode, created_at")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
  return { data: toSport(data), error: null };
}

export async function archiveSport(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sport")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}

export async function listCategories(
  sportId?: string,
): Promise<ServiceResult<Category[]>> {
  const supabase = createClient();
  let query = supabase
    .from("category")
    .select(CATEGORY_SELECT)
    .is("deleted_at", null)
    .order("age_group")
    .order("gender")
    .order("name");
  if (sportId) query = query.eq("sport_id", sportId);
  const { data, error } = await query;
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data ?? []).map(toCategory), error: null };
}

export async function createCategory(input: {
  sportId: string;
  name: string;
  gender: Gender;
  ageGroup: string;
  ageMax: number;
  teamSize: number;
  maxTeamSize: number;
  format?: FixtureFormatType;
  scoringStyle?: string;
  participantsPerMatch?: number;
  availableRounds?: FixtureRoundType[];
}): Promise<ServiceResult<Category>> {
  const categoryNameErr = categoryNameError(input.name, "Category name");
  if (categoryNameErr) return { data: null, error: { message: categoryNameErr } };
  const supabase = createClient();
  const { data: sport, error: sportError } = await supabase
    .from("sport")
    .select("code, event_mode")
    .eq("id", input.sportId)
    .is("deleted_at", null)
    .maybeSingle();
  if (sportError) return { data: null, error: toServiceError(sportError) };
  if (!sport) return { data: null, error: { message: "Sport was not found." } };
  const sportRef = { code: sport.code, eventMode: sport.event_mode };
  const fixtureConfig = fixtureFromInput(sportRef, input, input.name);
  const roster = rosterForSport(sportRef, input.name, input.teamSize, input.maxTeamSize);
  const { data, error } = await supabase
    .from("category")
    .insert({
      sport_id: input.sportId,
      name: input.name.trim(),
      gender: input.gender,
      age_group: input.ageGroup.trim(),
      age_max: input.ageMax,
      team_size: roster.teamSize,
      max_team_size: roster.maxTeamSize,
      fixture_config: serializeFixtureConfig(fixtureConfig),
    })
    .select(CATEGORY_SELECT)
    .single();
  if (error || !data) return { data: null, error: categoryWriteError(error) };
  return { data: toCategory(data), error: null };
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    gender: Gender;
    ageGroup: string;
    ageMax: number;
    teamSize: number;
    maxTeamSize: number;
    format: FixtureFormatType;
    scoringStyle: string;
    participantsPerMatch: number;
    availableRounds: FixtureRoundType[];
  },
): Promise<ServiceResult<Category>> {
  const categoryNameErr = categoryNameError(input.name, "Category name");
  if (categoryNameErr) return { data: null, error: { message: categoryNameErr } };
  const supabase = createClient();
  const { data: current, error: currentError } = await supabase
    .from("category")
    .select("sport_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (currentError) return { data: null, error: toServiceError(currentError) };
  if (!current) return { data: null, error: { message: "Category was not found." } };
  const { data: sport, error: sportError } = await supabase
    .from("sport")
    .select("code, event_mode")
    .eq("id", current.sport_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (sportError) return { data: null, error: toServiceError(sportError) };
  if (!sport) return { data: null, error: { message: "Sport was not found." } };
  const sportRef = { code: sport.code, eventMode: sport.event_mode };
  const fixtureConfig = fixtureFromInput(sportRef, input, input.name);
  const roster = rosterForSport(sportRef, input.name, input.teamSize, input.maxTeamSize);
  const { data, error } = await supabase
    .from("category")
    .update({
      name: input.name.trim(),
      gender: input.gender,
      age_group: input.ageGroup.trim(),
      age_max: input.ageMax,
      team_size: roster.teamSize,
      max_team_size: roster.maxTeamSize,
      fixture_config: serializeFixtureConfig(fixtureConfig),
    })
    .eq("id", id)
    .select(CATEGORY_SELECT)
    .single();
  if (error || !data) return { data: null, error: categoryWriteError(error) };
  return { data: toCategory(data), error: null };
}

export async function archiveCategory(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("category")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}
