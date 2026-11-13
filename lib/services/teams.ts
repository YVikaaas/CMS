import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/utils/labels";
import { parseAvailableRounds } from "@/lib/utils/fixtures";
import { nameError, optionalNameError, phoneError } from "@/lib/utils/validation";
import type {
  CscOption,
  Gender,
  ServiceResult,
  Team,
  TeamMember,
  TeamMemberInput,
} from "@/lib/types/cms";
import { toServiceError } from "./errors";

const TEAM_SELECT = `
  id,
  name,
  org_name,
  gender,
  created_at,
  competition_sport_category_map_id,
  team_member (id, deleted_at),
  csc:competition_sport_category_map_id (
    id,
    category_id,
    deleted_at,
    category:category_id (id, gender, age_group, name, team_size, max_team_size),
    csm:competition_sport_id (
      sport_id,
      sport:sport_id (name),
      competition:competition_id (id, name, deleted_at)
    )
  )
`;

type CategoryFields = {
  id: string;
  gender: Gender;
  age_group: string;
  name: string;
  team_size: number;
  max_team_size: number;
};

type CscNested = {
  id: string;
  category_id: string;
  deleted_at: string | null;
  category: CategoryFields | CategoryFields[] | null;
  csm: {
    sport_id: string;
    sport: { name: string } | { name: string }[] | null;
    competition:
      | { id: string; name: string; deleted_at: string | null }
      | { id: string; name: string; deleted_at: string | null }[]
      | null;
  } | null;
};

type TeamRow = {
  id: string;
  name: string;
  org_name: string | null;
  gender: Gender;
  created_at: string;
  competition_sport_category_map_id: string;
  team_member?: Array<{ id: string; deleted_at: string | null }> | null;
  csc: CscNested | CscNested[] | null;
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function nestedName(value: { name: string } | { name: string }[] | null): string {
  if (!value) return "";
  return Array.isArray(value) ? (value[0]?.name ?? "") : value.name;
}

function toTeam(row: TeamRow): Team | null {
  const csc = unwrap(row.csc);
  const category = unwrap(csc?.category);
  const csm = unwrap(csc?.csm);
  const competition = unwrap(csm?.competition);
  if (!csc || csc.deleted_at || !category || !csm || !competition || competition.deleted_at) {
    return null;
  }
  const memberCount = (row.team_member ?? []).filter((item) => !item.deleted_at).length;
  return {
    id: row.id,
    cscId: row.competition_sport_category_map_id,
    championshipId: competition.id,
    championshipName: competition.name,
    sportId: csm.sport_id,
    sportName: nestedName(csm.sport),
    categoryId: category.id,
    categoryLabel: categoryLabel({
      gender: category.gender,
      ageGroup: category.age_group,
      name: category.name,
    }),
    teamSize: category.team_size,
    maxTeamSize: category.max_team_size,
    name: row.name,
    orgName: row.org_name,
    gender: row.gender,
    memberCount,
    createdAt: row.created_at,
  };
}

function validateMembers(
  members: TeamMemberInput[],
  min: number,
  max: number,
  gender: Gender,
): string | null {
  if (members.length < min || members.length > max) {
    return `This category needs ${min} to ${max} members.`;
  }
  const seen = new Set<string>();
  for (const member of members) {
    const nameErr = nameError(member.name, "Member name");
    if (nameErr) return nameErr;
    const phoneErr = phoneError(member.phone, "Member phone");
    if (phoneErr) return phoneErr;
    if (member.gender !== gender) {
      return `All members must be ${gender}.`;
    }
    const key = `${member.name.trim().toLowerCase()}|${member.phone.trim()}`;
    if (seen.has(key)) {
      return "Each member name and phone combination must be unique.";
    }
    seen.add(key);
  }
  return null;
}

async function loadCscRoster(
  cscId: string,
): Promise<ServiceResult<{ gender: Gender; teamSize: number; maxTeamSize: number }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("competition_sport_category_map")
    .select("id, deleted_at, category:category_id (gender, team_size, max_team_size)")
    .eq("id", cscId)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  const category = unwrap(data?.category) as {
    gender: Gender;
    team_size: number;
    max_team_size: number;
  } | null;
  if (!data || data.deleted_at || !category) {
    return { data: null, error: { message: "Championship category was not found." } };
  }
  return {
    data: {
      gender: category.gender,
      teamSize: category.team_size,
      maxTeamSize: category.max_team_size,
    },
    error: null,
  };
}

export async function listTeams(filters?: {
  championshipId?: string;
  cscId?: string;
}): Promise<ServiceResult<Team[]>> {
  const supabase = createClient();
  let query = supabase.from("team").select(TEAM_SELECT).is("deleted_at", null).order("name");

  if (filters?.cscId) {
    query = query.eq("competition_sport_category_map_id", filters.cscId);
  } else if (filters?.championshipId) {
    const cscs = await listCscOptions({ championshipId: filters.championshipId });
    if (cscs.error) return { data: null, error: cscs.error };
    const cscIds = (cscs.data ?? []).map((item) => item.id);
    if (cscIds.length === 0) return { data: [], error: null };
    query = query.in("competition_sport_category_map_id", cscIds);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: toServiceError(error) };
  return {
    data: (data ?? [])
      .map((row) => toTeam(row as unknown as TeamRow))
      .filter((row): row is Team => Boolean(row)),
    error: null,
  };
}

export async function createTeam(input: {
  cscId: string;
  name: string;
  orgName: string | null;
  members: TeamMemberInput[];
}): Promise<ServiceResult<Team>> {
  const teamNameErr = nameError(input.name, "Team name");
  if (teamNameErr) return { data: null, error: { message: teamNameErr } };
  const orgErr = optionalNameError(input.orgName ?? "", "Organization");
  if (orgErr) return { data: null, error: { message: orgErr } };

  const roster = await loadCscRoster(input.cscId);
  if (roster.error || !roster.data) return { data: null, error: roster.error };
  const rosterData = roster.data;
  const members = input.members.map((member) => ({
    ...member,
    gender: rosterData.gender,
  }));
  const membersErr = validateMembers(
    members,
    rosterData.teamSize,
    rosterData.maxTeamSize,
    rosterData.gender,
  );
  if (membersErr) return { data: null, error: { message: membersErr } };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("team")
    .insert({
      competition_sport_category_map_id: input.cscId,
      name: input.name.trim(),
      org_name: input.orgName?.trim() || null,
      gender: rosterData.gender,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };

  const saved = await saveTeamMembers(data.id, members, {
    min: rosterData.teamSize,
    max: rosterData.maxTeamSize,
    gender: rosterData.gender,
  });
  if (saved.error) {
    await archiveTeam(data.id);
    return { data: null, error: saved.error };
  }
  return listTeamById(data.id);
}

export async function updateTeam(
  id: string,
  input: {
    name: string;
    orgName: string | null;
    members?: TeamMemberInput[];
  },
): Promise<ServiceResult<Team>> {
  const teamNameErr = nameError(input.name, "Team name");
  if (teamNameErr) return { data: null, error: { message: teamNameErr } };
  const orgErr = optionalNameError(input.orgName ?? "", "Organization");
  if (orgErr) return { data: null, error: { message: orgErr } };

  const current = await listTeamById(id);
  if (current.error || !current.data) return current;
  const team = current.data;

  const supabase = createClient();
  const { error } = await supabase
    .from("team")
    .update({
      name: input.name.trim(),
      org_name: input.orgName?.trim() || null,
    })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };

  if (input.members) {
    const members = input.members.map((member) => ({
      ...member,
      gender: team.gender,
    }));
    const membersErr = validateMembers(
      members,
      team.teamSize,
      team.maxTeamSize,
      team.gender,
    );
    if (membersErr) return { data: null, error: { message: membersErr } };
    const saved = await saveTeamMembers(id, members, {
      min: team.teamSize,
      max: team.maxTeamSize,
      gender: team.gender,
    });
    if (saved.error) return { data: null, error: saved.error };
  }

  return listTeamById(id);
}

export async function getTeam(id: string): Promise<ServiceResult<Team>> {
  return listTeamById(id);
}

async function listTeamById(id: string): Promise<ServiceResult<Team>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("team")
    .select(TEAM_SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
  const team = toTeam(data as unknown as TeamRow);
  if (!team) return { data: null, error: { message: "Team was not found." } };
  return { data: team, error: null };
}

type MemberRow = {
  id: string;
  team_id: string;
  name: string;
  phone: string;
  gender: Gender;
};

function toMember(row: MemberRow): TeamMember {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    phone: row.phone,
    gender: row.gender,
  };
}

async function namePhoneTaken(
  name: string,
  phone: string,
  excludeId?: string,
): Promise<ServiceResult<boolean>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_member")
    .select("id, name, phone")
    .eq("phone", phone)
    .is("deleted_at", null);
  if (error) return { data: null, error: toServiceError(error) };
  const taken = (data ?? []).some(
    (row) =>
      row.id !== excludeId && row.name.toLowerCase() === name.toLowerCase(),
  );
  return { data: taken, error: null };
}

export async function listTeamMembers(
  teamId: string,
): Promise<ServiceResult<TeamMember[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_member")
    .select("id, team_id, name, phone, gender")
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .order("name");
  if (error) return { data: null, error: toServiceError(error) };
  return {
    data: (data ?? []).map((row) => toMember(row as MemberRow)),
    error: null,
  };
}

export async function createTeamMember(
  teamId: string,
  input: { name: string; phone: string },
): Promise<ServiceResult<TeamMember>> {
  const nameErr = nameError(input.name, "Member name");
  if (nameErr) return { data: null, error: { message: nameErr } };
  const phoneErr = phoneError(input.phone, "Member phone");
  if (phoneErr) return { data: null, error: { message: phoneErr } };

  const team = await listTeamById(teamId);
  if (team.error || !team.data) return { data: null, error: team.error };
  const roster = await listTeamMembers(teamId);
  if (roster.error || !roster.data) return { data: null, error: roster.error };
  if (roster.data.length >= team.data.maxTeamSize) {
    return {
      data: null,
      error: { message: `This category allows at most ${team.data.maxTeamSize} members.` },
    };
  }

  const name = input.name.trim();
  const phone = input.phone.trim();
  const taken = await namePhoneTaken(name, phone);
  if (taken.error) return { data: null, error: taken.error };
  if (taken.data) {
    return {
      data: null,
      error: { message: `${name} / ${phone} is already on a team.` },
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_member")
    .insert({
      team_id: teamId,
      name,
      phone,
      gender: team.data.gender,
    })
    .select("id, team_id, name, phone, gender")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
  return { data: toMember(data as MemberRow), error: null };
}

export async function updateTeamMember(
  id: string,
  input: { name: string; phone: string },
): Promise<ServiceResult<TeamMember>> {
  const nameErr = nameError(input.name, "Member name");
  if (nameErr) return { data: null, error: { message: nameErr } };
  const phoneErr = phoneError(input.phone, "Member phone");
  if (phoneErr) return { data: null, error: { message: phoneErr } };

  const supabase = createClient();
  const { data: current, error: currentError } = await supabase
    .from("team_member")
    .select("id, team_id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (currentError) return { data: null, error: toServiceError(currentError) };
  if (!current || current.deleted_at) {
    return { data: null, error: { message: "Member was not found." } };
  }

  const team = await listTeamById(current.team_id);
  if (team.error || !team.data) return { data: null, error: team.error };

  const name = input.name.trim();
  const phone = input.phone.trim();
  const taken = await namePhoneTaken(name, phone, id);
  if (taken.error) return { data: null, error: taken.error };
  if (taken.data) {
    return {
      data: null,
      error: { message: `${name} / ${phone} is already on a team.` },
    };
  }

  const { data, error } = await supabase
    .from("team_member")
    .update({ name, phone, gender: team.data.gender })
    .eq("id", id)
    .select("id, team_id, name, phone, gender")
    .single();
  if (error || !data) return { data: null, error: toServiceError(error) };
  return { data: toMember(data as MemberRow), error: null };
}

export async function archiveTeamMember(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const { data: current, error: currentError } = await supabase
    .from("team_member")
    .select("id, team_id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (currentError) return { data: null, error: toServiceError(currentError) };
  if (!current || current.deleted_at) {
    return { data: null, error: { message: "Member was not found." } };
  }

  const team = await listTeamById(current.team_id);
  if (team.error || !team.data) return { data: null, error: team.error };
  const roster = await listTeamMembers(current.team_id);
  if (roster.error || !roster.data) return { data: null, error: roster.error };
  if (roster.data.length <= team.data.teamSize) {
    return {
      data: null,
      error: { message: `This category needs at least ${team.data.teamSize} members.` },
    };
  }

  const { error } = await supabase
    .from("team_member")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}

export async function saveTeamMembers(
  teamId: string,
  members: TeamMemberInput[],
  roster?: { min: number; max: number; gender: Gender },
): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const { data: team, error: teamError } = await supabase
    .from("team")
    .select("gender")
    .eq("id", teamId)
    .maybeSingle();
  if (teamError) return { data: null, error: toServiceError(teamError) };
  if (!team) return { data: null, error: { message: "Team was not found." } };
  const gender = roster?.gender ?? (team.gender as Gender);
  const stamped = members.map((member) => ({ ...member, gender }));
  if (roster) {
    const membersErr = validateMembers(stamped, roster.min, roster.max, gender);
    if (membersErr) return { data: null, error: { message: membersErr } };
  }

  const normalized = stamped.map((member) => ({
    name: member.name.trim(),
    phone: member.phone.trim(),
    gender,
  }));

  const { data: liveByPhone, error: liveError } = await supabase
    .from("team_member")
    .select("id, team_id, name, phone")
    .in(
      "phone",
      normalized.map((member) => member.phone),
    )
    .is("deleted_at", null);
  if (liveError) return { data: null, error: toServiceError(liveError) };

  for (const member of normalized) {
    const clash = (liveByPhone ?? []).find(
      (row) =>
        row.phone === member.phone &&
        row.name.toLowerCase() === member.name.toLowerCase() &&
        row.team_id !== teamId,
    );
    if (clash) {
      return {
        data: null,
        error: {
          message: `${member.name} / ${member.phone} is already on another team.`,
        },
      };
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("team_member")
    .select("id, name, phone, deleted_at")
    .eq("team_id", teamId);
  if (existingError) return { data: null, error: toServiceError(existingError) };

  const keepKeys = new Set(
    normalized.map((member) => `${member.name.toLowerCase()}|${member.phone}`),
  );

  for (const member of normalized) {
    const key = `${member.name.toLowerCase()}|${member.phone}`;
    const row = (existing ?? []).find(
      (item) => `${item.name.toLowerCase()}|${item.phone}` === key,
    );
    if (!row) {
      const { error } = await supabase.from("team_member").insert({
        team_id: teamId,
        name: member.name,
        phone: member.phone,
        gender: member.gender,
      });
      if (error) return { data: null, error: toServiceError(error) };
    } else if (row.deleted_at) {
      const { error } = await supabase
        .from("team_member")
        .update({ deleted_at: null, gender: member.gender, name: member.name })
        .eq("id", row.id);
      if (error) return { data: null, error: toServiceError(error) };
    } else {
      const { error } = await supabase
        .from("team_member")
        .update({ gender: member.gender, name: member.name })
        .eq("id", row.id);
      if (error) return { data: null, error: toServiceError(error) };
    }
  }

  const now = new Date().toISOString();
  for (const row of existing ?? []) {
    if (row.deleted_at) continue;
    const key = `${row.name.toLowerCase()}|${row.phone}`;
    if (!keepKeys.has(key)) {
      const { error } = await supabase
        .from("team_member")
        .update({ deleted_at: now })
        .eq("id", row.id);
      if (error) return { data: null, error: toServiceError(error) };
    }
  }

  return { data: true, error: null };
}

export async function archiveTeam(id: string): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error: memberError } = await supabase
    .from("team_member")
    .update({ deleted_at: now })
    .eq("team_id", id)
    .is("deleted_at", null);
  if (memberError) return { data: null, error: toServiceError(memberError) };
  const { error } = await supabase.from("team").update({ deleted_at: now }).eq("id", id);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: true, error: null };
}

export async function listCscOptions(filters?: {
  sportId?: string;
  championshipId?: string;
}): Promise<ServiceResult<CscOption[]>> {
  const supabase = createClient();
  let query = supabase
    .from("competition_sport_map")
    .select(
      "id, sport_id, competition_id, sport:sport_id (name), competition:competition_id (id, name, deleted_at)",
    )
    .is("deleted_at", null);
  if (filters?.sportId) query = query.eq("sport_id", filters.sportId);
  if (filters?.championshipId) query = query.eq("competition_id", filters.championshipId);
  const { data: csmRows, error: csmError } = await query;
  if (csmError) return { data: null, error: toServiceError(csmError) };

  const liveCsm = (csmRows ?? []).filter((row) => {
    const competition = unwrap(row.competition) as {
      id: string;
      name: string;
      deleted_at: string | null;
    } | null;
    return competition && !competition.deleted_at;
  });

  const options: CscOption[] = [];
  for (const csm of liveCsm) {
    const competition = unwrap(csm.competition) as {
      id: string;
      name: string;
    };
    const sport = unwrap(csm.sport) as { name: string };
    const { data: cscRows, error: cscError } = await supabase
      .from("competition_sport_category_map")
      .select(
        "id, category_id, category:category_id (gender, age_group, name, team_size, max_team_size, fixture_config)",
      )
      .eq("competition_sport_id", csm.id)
      .is("deleted_at", null);
    if (cscError) return { data: null, error: toServiceError(cscError) };
    for (const csc of cscRows ?? []) {
      const category = unwrap(csc.category) as {
        gender: Gender;
        age_group: string;
        name: string;
        team_size: number;
        max_team_size: number;
        fixture_config: unknown;
      } | null;
      if (!category) continue;
      options.push({
        id: csc.id,
        championshipId: competition.id,
        championshipName: competition.name,
        sportId: csm.sport_id,
        sportName: sport?.name ?? "",
        categoryId: csc.category_id,
        categoryLabel: categoryLabel({
          gender: category.gender,
          ageGroup: category.age_group,
          name: category.name,
        }),
        categoryGender: category.gender,
        teamSize: category.team_size,
        maxTeamSize: category.max_team_size,
        availableRounds: parseAvailableRounds(category.fixture_config),
      });
    }
  }
  return { data: options, error: null };
}
