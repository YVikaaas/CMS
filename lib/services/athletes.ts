import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/utils/labels";
import { nameError, phoneError } from "@/lib/utils/validation";
import type {
  Athlete,
  AthleteParticipation,
  ChampionshipAthlete,
  Gender,
  ServiceResult,
} from "@/lib/types/cms";
import { toServiceError } from "./errors";

const ATHLETE_SELECT = "id, name, phone, gender";

type AthleteRow = {
  id: string;
  name: string;
  phone: string;
  gender: Gender;
};

function toAthlete(row: AthleteRow): Athlete {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    gender: row.gender,
  };
}

function athleteWriteError(error: { message?: string } | null): { message: string } {
  const message = error?.message ?? "";
  if (/athlete_phone_live_idx|duplicate key/i.test(message)) {
    return { message: "This phone is already an athlete." };
  }
  return toServiceError(error);
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function findAthleteByPhone(phone: string): Promise<ServiceResult<Athlete | null>> {
  const phoneErr = phoneError(phone, "Phone");
  if (phoneErr) return { data: null, error: { message: phoneErr } };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("athlete")
    .select(ATHLETE_SELECT)
    .eq("phone", phone.trim())
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data ? toAthlete(data as AthleteRow) : null, error: null };
}

export async function getAthlete(id: string): Promise<ServiceResult<Athlete>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("athlete")
    .select(ATHLETE_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  if (!data) return { data: null, error: { message: "Athlete was not found." } };
  return { data: toAthlete(data as AthleteRow), error: null };
}

export async function createAthlete(input: {
  name: string;
  phone: string;
  gender: Gender;
}): Promise<ServiceResult<Athlete>> {
  const nameErr = nameError(input.name, "Athlete name");
  if (nameErr) return { data: null, error: { message: nameErr } };
  const phoneErr = phoneError(input.phone, "Phone");
  if (phoneErr) return { data: null, error: { message: phoneErr } };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("athlete")
    .insert({
      name: input.name.trim(),
      phone: input.phone.trim(),
      gender: input.gender,
    })
    .select(ATHLETE_SELECT)
    .single();
  if (error || !data) return { data: null, error: athleteWriteError(error) };
  return { data: toAthlete(data as AthleteRow), error: null };
}

export async function ensureAthlete(input: {
  athleteId?: string | null;
  name: string;
  phone: string;
  gender: Gender;
}): Promise<ServiceResult<Athlete>> {
  if (input.athleteId) {
    const existing = await getAthlete(input.athleteId);
    if (existing.error || !existing.data) return existing;
    if (existing.data.gender !== input.gender) {
      return {
        data: null,
        error: {
          message: `${existing.data.name} is listed as ${existing.data.gender}, this category is ${input.gender}.`,
        },
      };
    }
    return existing;
  }

  const found = await findAthleteByPhone(input.phone);
  if (found.error) return { data: null, error: found.error };
  if (found.data) {
    if (found.data.gender !== input.gender) {
      return {
        data: null,
        error: {
          message: `${found.data.name} is listed as ${found.data.gender}, this category is ${input.gender}.`,
        },
      };
    }
    return { data: found.data, error: null };
  }

  return createAthlete({
    name: input.name,
    phone: input.phone,
    gender: input.gender,
  });
}

export async function updateAthlete(
  id: string,
  input: { name: string; phone: string; gender: Gender },
): Promise<ServiceResult<Athlete>> {
  const nameErr = nameError(input.name, "Athlete name");
  if (nameErr) return { data: null, error: { message: nameErr } };
  const phoneErr = phoneError(input.phone, "Phone");
  if (phoneErr) return { data: null, error: { message: phoneErr } };

  const current = await getAthlete(id);
  if (current.error || !current.data) return current;

  const name = input.name.trim();
  const phone = input.phone.trim();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("athlete")
    .update({ name, phone, gender: input.gender })
    .eq("id", id)
    .select(ATHLETE_SELECT)
    .single();
  if (error || !data) return { data: null, error: athleteWriteError(error) };

  if (name !== current.data.name) {
    const { data: memberships, error: memberError } = await supabase
      .from("team_member")
      .select(
        "id, team:team_id (id, deleted_at, csc:competition_sport_category_map_id (deleted_at, category:category_id (team_size, max_team_size)))",
      )
      .eq("athlete_id", id)
      .is("deleted_at", null);
    if (memberError) return { data: null, error: toServiceError(memberError) };
    const soloTeamIds = [
      ...new Set(
        (memberships ?? [])
          .map((row) => {
            const team = unwrap(row.team) as {
              id: string;
              deleted_at: string | null;
              csc:
                | {
                    deleted_at: string | null;
                    category: { team_size: number; max_team_size: number } | { team_size: number; max_team_size: number }[] | null;
                  }
                | {
                    deleted_at: string | null;
                    category: { team_size: number; max_team_size: number } | { team_size: number; max_team_size: number }[] | null;
                  }[]
                | null;
            } | null;
            const csc = unwrap(team?.csc);
            const category = unwrap(csc?.category);
            if (!team || team.deleted_at || !csc || csc.deleted_at || !category) return null;
            if (category.team_size !== 1 || category.max_team_size !== 1) return null;
            return team.id;
          })
          .filter((teamId): teamId is string => Boolean(teamId)),
      ),
    ];
    if (soloTeamIds.length > 0) {
      const { error: teamError } = await supabase.from("team").update({ name }).in("id", soloTeamIds);
      if (teamError) return { data: null, error: toServiceError(teamError) };
    }
  }

  return { data: toAthlete(data as AthleteRow), error: null };
}

type CscMeta = {
  championshipId: string;
  championshipName: string;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryLabel: string;
  teamSize: number;
};

function sortAthletes(athletes: ChampionshipAthlete[]): ChampionshipAthlete[] {
  return athletes
    .map((athlete) => ({
      ...athlete,
      participations: [...athlete.participations].sort((a, b) =>
        `${a.championshipName} ${a.sportName} ${a.categoryLabel}`.localeCompare(
          `${b.championshipName} ${b.sportName} ${b.categoryLabel}`,
          undefined,
          { sensitivity: "base" },
        ),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

async function loadParticipations(championshipId?: string): Promise<
  ServiceResult<Map<string, ChampionshipAthlete>>
> {
  const supabase = createClient();
  let query = supabase
    .from("competition_sport_map")
    .select(
      "id, sport_id, competition_id, deleted_at, sport:sport_id (name), competition:competition_id (id, name, deleted_at), cscs:competition_sport_category_map (id, category_id, deleted_at, category:category_id (id, gender, age_group, name, team_size, max_team_size))",
    )
    .is("deleted_at", null)
    .is("cscs.deleted_at", null);
  if (championshipId) query = query.eq("competition_id", championshipId);
  const { data: csmRows, error: csmError } = await query;
  if (csmError) return { data: null, error: toServiceError(csmError) };

  const cscMeta = new Map<string, CscMeta>();
  for (const csm of csmRows ?? []) {
    const competition = unwrap(csm.competition) as {
      id: string;
      name: string;
      deleted_at: string | null;
    } | null;
    if (!competition || competition.deleted_at) continue;
    const sport = unwrap(csm.sport) as { name: string } | null;
    const cscs = (csm as { cscs?: Array<{ id: string; category_id: string; category: unknown }> | null }).cscs ?? [];
    for (const csc of cscs) {
      const category = unwrap(csc.category) as {
        id: string;
        gender: Gender;
        age_group: string;
        name: string;
        team_size: number;
        max_team_size: number;
      } | null;
      if (!category) continue;
      cscMeta.set(csc.id, {
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
        teamSize: category.team_size,
      });
    }
  }
  const cscIds = [...cscMeta.keys()];
  const byAthlete = new Map<string, ChampionshipAthlete>();
  if (cscIds.length === 0) return { data: byAthlete, error: null };

  const { data: teams, error: teamError } = await supabase
    .from("team")
    .select(
      "id, name, competition_sport_category_map_id, team_member (id, athlete_id, name, phone, gender, deleted_at)",
    )
    .in("competition_sport_category_map_id", cscIds)
    .is("deleted_at", null);
  if (teamError) return { data: null, error: toServiceError(teamError) };

  for (const team of teams ?? []) {
    const meta = cscMeta.get(team.competition_sport_category_map_id);
    if (!meta) continue;
    const members = (team.team_member ?? []).filter((member) => !member.deleted_at);
    for (const member of members) {
      const current: ChampionshipAthlete = byAthlete.get(member.athlete_id) ?? {
        id: member.athlete_id,
        name: member.name,
        phone: member.phone,
        gender: member.gender as Gender,
        participations: [] as AthleteParticipation[],
      };
      current.participations.push({
        championshipId: meta.championshipId,
        championshipName: meta.championshipName,
        teamId: team.id,
        teamName: team.name,
        cscId: team.competition_sport_category_map_id,
        sportId: meta.sportId,
        sportName: meta.sportName,
        categoryId: meta.categoryId,
        categoryLabel: meta.categoryLabel,
        teamSize: meta.teamSize,
      });
      byAthlete.set(member.athlete_id, current);
    }
  }
  return { data: byAthlete, error: null };
}

export async function listChampionshipAthletes(
  championshipId: string,
): Promise<ServiceResult<ChampionshipAthlete[]>> {
  const loaded = await loadParticipations(championshipId);
  if (loaded.error || !loaded.data) return { data: null, error: loaded.error };
  return { data: sortAthletes([...loaded.data.values()]), error: null };
}

export async function listAthletes(): Promise<ServiceResult<ChampionshipAthlete[]>> {
  const supabase = createClient();
  const { data: athleteRows, error: athleteError } = await supabase
    .from("athlete")
    .select(ATHLETE_SELECT)
    .is("deleted_at", null)
    .order("name");
  if (athleteError) return { data: null, error: toServiceError(athleteError) };

  const loaded = await loadParticipations();
  if (loaded.error || !loaded.data) return { data: null, error: loaded.error };
  const byAthlete = loaded.data;

  const athletes = (athleteRows ?? []).map((row) => {
    const person = toAthlete(row as AthleteRow);
    const attached = byAthlete.get(person.id);
    return {
      ...person,
      participations: attached?.participations ?? [],
    };
  });
  return { data: sortAthletes(athletes), error: null };
}
