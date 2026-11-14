import { createClient } from "@/lib/supabase/client";
import type {
  Championship,
  ChampionshipOffering,
  CompetitionStatus,
  ServiceError,
  ServiceResult,
} from "@/lib/types/cms";
import { slugify } from "@/lib/utils/slug";
import { nameError } from "@/lib/utils/validation";
import { toServiceError } from "./errors";

type CompetitionRow = {
  id: string;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  status: CompetitionStatus;
  created_at: string;
};

function toChampionship(row: CompetitionRow): Championship {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function uniqueSlug(
  supabase: ReturnType<typeof createClient>,
  name: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 8; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    let query = supabase
      .from("competition")
      .select("id")
      .eq("slug", candidate)
      .is("deleted_at", null);
    if (exceptId) query = query.neq("id", exceptId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function listChampionships(): Promise<ServiceResult<Championship[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("competition")
    .select("id, name, slug, start_date, end_date, location, status, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data ?? []).map(toChampionship), error: null };
}

export async function createChampionship(input: {
  name: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
}): Promise<ServiceResult<Championship>> {
  const champNameErr = nameError(input.name, "Championship name");
  if (champNameErr) return { data: null, error: { message: champNameErr } };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const slug = await uniqueSlug(supabase, input.name);
  const { data, error } = await supabase
    .from("competition")
    .insert({
      name: input.name.trim(),
      slug,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      location: input.location?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select("id, name, slug, start_date, end_date, location, status, created_at")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
  return { data: toChampionship(data), error: null };
}

export async function updateChampionship(
  id: string,
  input: {
    name: string;
    startDate: string | null;
    endDate: string | null;
    location: string | null;
  },
): Promise<ServiceResult<Championship>> {
  const champNameErr = nameError(input.name, "Championship name");
  if (champNameErr) return { data: null, error: { message: champNameErr } };
  const supabase = createClient();
  const slug = await uniqueSlug(supabase, input.name, id);
  const { data, error } = await supabase
    .from("competition")
    .update({
      name: input.name.trim(),
      slug,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      location: input.location?.trim() || null,
    })
    .eq("id", id)
    .select("id, name, slug, start_date, end_date, location, status, created_at")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
  return { data: toChampionship(data), error: null };
}

export async function archiveChampionship(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("competition")
    .update({
      deleted_at: new Date().toISOString(),
      status: "archived",
    })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}

export async function listChampionshipOfferings(
  championshipId: string,
): Promise<ServiceResult<ChampionshipOffering[]>> {
  const supabase = createClient();
  const { data: csmRows, error: csmError } = await supabase
    .from("competition_sport_map")
    .select("id, sport_id")
    .eq("competition_id", championshipId)
    .is("deleted_at", null);
  if (csmError) return { data: null, error: toServiceError(csmError) };

  const offerings: ChampionshipOffering[] = [];
  for (const csm of csmRows ?? []) {
    const { data: cscRows, error: cscError } = await supabase
      .from("competition_sport_category_map")
      .select("category_id")
      .eq("competition_sport_id", csm.id)
      .is("deleted_at", null);
    if (cscError) return { data: null, error: toServiceError(cscError) };
    offerings.push({
      sportId: csm.sport_id,
      categoryIds: (cscRows ?? []).map((row) => row.category_id),
    });
  }
  return { data: offerings, error: null };
}

export async function saveChampionshipOfferings(
  championshipId: string,
  offerings: ChampionshipOffering[],
): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const wantedSportIds = new Set(offerings.map((item) => item.sportId));

  const { data: allCsm, error: csmError } = await supabase
    .from("competition_sport_map")
    .select("id, sport_id, deleted_at")
    .eq("competition_id", championshipId);
  if (csmError) return { data: null, error: toServiceError(csmError) };

  const csmBySport = new Map(
    (allCsm ?? []).map((row) => [row.sport_id as string, row]),
  );

  for (const sportId of wantedSportIds) {
    const existing = csmBySport.get(sportId);
    if (!existing) {
      const { data, error } = await supabase
        .from("competition_sport_map")
        .insert({ competition_id: championshipId, sport_id: sportId })
        .select("id, sport_id, deleted_at")
        .single();
      if (error || !data) return { data: null, error: toServiceError(error) };
      csmBySport.set(sportId, data);
    } else if (existing.deleted_at) {
      const { error } = await supabase
        .from("competition_sport_map")
        .update({ deleted_at: null })
        .eq("id", existing.id);
      if (error) return { data: null, error: toServiceError(error) };
      existing.deleted_at = null;
    }
  }

  for (const row of allCsm ?? []) {
    if (!wantedSportIds.has(row.sport_id) && !row.deleted_at) {
      const { data: sportCscs, error: sportCscError } = await supabase
        .from("competition_sport_category_map")
        .select("id")
        .eq("competition_sport_id", row.id)
        .is("deleted_at", null);
      if (sportCscError) return { data: null, error: toServiceError(sportCscError) };
      for (const csc of sportCscs ?? []) {
        const blocked = await cscUnassignError(csc.id, "sport");
        if (blocked) return { data: null, error: blocked };
      }
      await supabase
        .from("competition_sport_category_map")
        .update({ deleted_at: now })
        .eq("competition_sport_id", row.id)
        .is("deleted_at", null);
      const { error } = await supabase
        .from("competition_sport_map")
        .update({ deleted_at: now })
        .eq("id", row.id);
      if (error) return { data: null, error: toServiceError(error) };
    }
  }

  for (const offering of offerings) {
    const csm = csmBySport.get(offering.sportId);
    if (!csm) continue;
    const wantedCats = new Set(offering.categoryIds);

    const { data: allCsc, error: cscError } = await supabase
      .from("competition_sport_category_map")
      .select("id, category_id, deleted_at")
      .eq("competition_sport_id", csm.id);
    if (cscError) return { data: null, error: toServiceError(cscError) };

    const cscByCat = new Map(
      (allCsc ?? []).map((row) => [row.category_id as string, row]),
    );

    for (const categoryId of wantedCats) {
      const existing = cscByCat.get(categoryId);
      if (!existing) {
        const { error } = await supabase
          .from("competition_sport_category_map")
          .insert({
            competition_sport_id: csm.id,
            category_id: categoryId,
          });
        if (error) return { data: null, error: toServiceError(error) };
      } else if (existing.deleted_at) {
        const { error } = await supabase
          .from("competition_sport_category_map")
          .update({ deleted_at: null })
          .eq("id", existing.id);
        if (error) return { data: null, error: toServiceError(error) };
      }
    }

    for (const row of allCsc ?? []) {
      if (!wantedCats.has(row.category_id) && !row.deleted_at) {
        const blocked = await cscUnassignError(row.id, "category");
        if (blocked) return { data: null, error: blocked };
        const { error } = await supabase
          .from("competition_sport_category_map")
          .update({ deleted_at: now })
          .eq("id", row.id);
        if (error) return { data: null, error: toServiceError(error) };
      }
    }
  }

  return { data: true, error: null };
}

async function cscHasLiveTeams(cscId: string): Promise<ServiceResult<boolean>> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("team")
    .select("id", { count: "exact", head: true })
    .eq("competition_sport_category_map_id", cscId)
    .is("deleted_at", null);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (count ?? 0) > 0, error: null };
}

async function cscHasLiveFixtures(cscId: string): Promise<ServiceResult<boolean>> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("fixture")
    .select("id", { count: "exact", head: true })
    .eq("competition_sport_category_map_id", cscId)
    .is("deleted_at", null);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (count ?? 0) > 0, error: null };
}

async function cscUnassignError(
  cscId: string,
  scope: "sport" | "category",
): Promise<ServiceError | null> {
  const teams = await cscHasLiveTeams(cscId);
  if (teams.error) return teams.error;
  if (teams.data) {
    return {
      message:
        scope === "sport"
          ? "Remove teams from a sport before unassigning it."
          : "Remove teams from a category before unassigning it.",
    };
  }
  const fixtures = await cscHasLiveFixtures(cscId);
  if (fixtures.error) return fixtures.error;
  if (fixtures.data) {
    return {
      message:
        scope === "sport"
          ? "Remove fixtures from a sport before unassigning it."
          : "Remove fixtures from a category before unassigning it.",
    };
  }
  return null;
}

async function mutateOfferings(
  championshipId: string,
  mutate: (
    current: ChampionshipOffering[],
  ) => ChampionshipOffering[] | { message: string },
): Promise<ServiceResult<true>> {
  const current = await listChampionshipOfferings(championshipId);
  if (current.error || !current.data) return { data: null, error: current.error };
  const next = mutate(current.data);
  if (!Array.isArray(next)) return { data: null, error: next };
  return saveChampionshipOfferings(championshipId, next);
}

export async function addChampionshipSports(
  championshipId: string,
  sportIds: string[],
  extras?: { categoriesBySport?: Record<string, string[]> },
): Promise<ServiceResult<true>> {
  const unique = [...new Set(sportIds.filter(Boolean))];
  if (unique.length === 0) {
    return { data: null, error: { message: "Select at least one sport." } };
  }
  return mutateOfferings(championshipId, (current) => {
    const next = current.map((item) => ({ ...item, categoryIds: [...item.categoryIds] }));
    const index = new Map(next.map((item, i) => [item.sportId, i]));
    for (const sportId of unique) {
      const extra = [...new Set(extras?.categoriesBySport?.[sportId] ?? [])];
      const existingIndex = index.get(sportId);
      if (existingIndex === undefined) {
        index.set(sportId, next.length);
        next.push({ sportId, categoryIds: extra });
        continue;
      }
      const row = next[existingIndex];
      if (!row) continue;
      const have = new Set(row.categoryIds);
      for (const categoryId of extra) {
        if (!have.has(categoryId)) {
          row.categoryIds.push(categoryId);
          have.add(categoryId);
        }
      }
    }
    return next;
  });
}

export async function addChampionshipSport(
  championshipId: string,
  sportId: string,
): Promise<ServiceResult<true>> {
  return addChampionshipSports(championshipId, [sportId]);
}

export async function removeChampionshipSport(
  championshipId: string,
  sportId: string,
): Promise<ServiceResult<true>> {
  return mutateOfferings(championshipId, (current) =>
    current.filter((item) => item.sportId !== sportId),
  );
}

export async function addChampionshipEvents(
  championshipId: string,
  sportId: string,
  categoryIds: string[],
): Promise<ServiceResult<true>> {
  const unique = [...new Set(categoryIds.filter(Boolean))];
  if (unique.length === 0) {
    return { data: null, error: { message: "Select at least one category." } };
  }
  return mutateOfferings(championshipId, (current) => {
    const existing = current.find((item) => item.sportId === sportId);
    if (!existing) {
      return [...current, { sportId, categoryIds: unique }];
    }
    const have = new Set(existing.categoryIds);
    const added = unique.filter((id) => !have.has(id));
    if (added.length === 0) {
      return { message: "Those categories are already assigned." };
    }
    return current.map((item) =>
      item.sportId === sportId
        ? { ...item, categoryIds: [...item.categoryIds, ...added] }
        : item,
    );
  });
}

export async function addChampionshipEvent(
  championshipId: string,
  sportId: string,
  categoryId: string,
): Promise<ServiceResult<true>> {
  return addChampionshipEvents(championshipId, sportId, [categoryId]);
}

export async function removeChampionshipEvent(
  championshipId: string,
  categoryId: string,
): Promise<ServiceResult<true>> {
  return mutateOfferings(championshipId, (current) =>
    current.map((item) => ({
      ...item,
      categoryIds: item.categoryIds.filter((id) => id !== categoryId),
    })),
  );
}
