import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  Gender,
  ServiceResult,
  Sport,
  SportEventMode,
} from "@/lib/types/cms";
import { nameError } from "@/lib/utils/validation";
import { toServiceError } from "./errors";

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
  created_at: string;
};

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
    createdAt: row.created_at,
  };
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
    .select(
      "id, sport_id, name, gender, age_group, age_min, age_max, team_size, max_team_size, created_at",
    )
    .is("deleted_at", null)
    .order("age_group")
    .order("gender");
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
}): Promise<ServiceResult<Category>> {
  const categoryNameErr = nameError(input.name, "Category name");
  if (categoryNameErr) return { data: null, error: { message: categoryNameErr } };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("category")
    .insert({
      sport_id: input.sportId,
      name: input.name.trim(),
      gender: input.gender,
      age_group: input.ageGroup.trim(),
      age_max: input.ageMax,
      team_size: input.teamSize,
      max_team_size: input.maxTeamSize,
      fixture_config: {
        format: "league_knockout",
        scoring_style: "simple",
        available_rounds: [
          "league",
          "quarter_final",
          "semi_final",
          "final",
          "third_place",
        ],
        participants_per_match: 2,
      },
    })
    .select(
      "id, sport_id, name, gender, age_group, age_min, age_max, team_size, max_team_size, created_at",
    )
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
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
  },
): Promise<ServiceResult<Category>> {
  const categoryNameErr = nameError(input.name, "Category name");
  if (categoryNameErr) return { data: null, error: { message: categoryNameErr } };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("category")
    .update({
      name: input.name.trim(),
      gender: input.gender,
      age_group: input.ageGroup.trim(),
      age_max: input.ageMax,
      team_size: input.teamSize,
      max_team_size: input.maxTeamSize,
    })
    .eq("id", id)
    .select(
      "id, sport_id, name, gender, age_group, age_min, age_max, team_size, max_team_size, created_at",
    )
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
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
