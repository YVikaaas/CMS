import { createClient } from "@/lib/supabase/client";
import type {
  Gender,
  PodiumHolder,
  PodiumPerson,
  PodiumSheet,
  ServiceResult,
} from "@/lib/types/cms";
import { isPodiumRank } from "@/lib/utils/podium";
import { toServiceError } from "./errors";
import { getFixture, listFixtureRanking } from "./fixtures";

type MemberRow = {
  id: string;
  team_id: string;
  name: string;
  phone: string;
  gender: Gender;
};

function toPerson(row: MemberRow): PodiumPerson {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    gender: row.gender,
  };
}

async function listMembers(filter: { teamIds?: string[]; memberIds?: string[] }): Promise<ServiceResult<MemberRow[]>> {
  const teamIds = filter.teamIds ?? [];
  const memberIds = filter.memberIds ?? [];
  if (teamIds.length === 0 && memberIds.length === 0) return { data: [], error: null };

  const supabase = createClient();
  let query = supabase
    .from("team_member")
    .select("id, team_id, name, phone, gender")
    .is("deleted_at", null)
    .order("name");
  if (teamIds.length > 0) query = query.in("team_id", teamIds);
  if (memberIds.length > 0) query = query.in("id", memberIds);
  const { data, error } = await query;
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data ?? []) as MemberRow[], error: null };
}

export async function getPodiumSheet(fixtureId: string): Promise<ServiceResult<PodiumSheet>> {
  const fixture = await getFixture(fixtureId);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };

  const ranking = await listFixtureRanking(fixtureId);
  if (ranking.error || !ranking.data) return { data: null, error: ranking.error };

  const podium = ranking.data.filter((row) => isPodiumRank(row.rank)).sort((a, b) => a.rank - b.rank);
  const teamIds = podium.map((row) => row.teamId).filter(Boolean);
  const athleteIds = podium.map((row) => row.athleteId).filter(Boolean);

  const [teamMembers, athletes] = await Promise.all([
    listMembers({ teamIds }),
    listMembers({ memberIds: athleteIds }),
  ]);
  if (teamMembers.error) return { data: null, error: teamMembers.error };
  if (athletes.error) return { data: null, error: athletes.error };

  const membersByTeam = new Map<string, PodiumPerson[]>();
  for (const member of teamMembers.data ?? []) {
    const list = membersByTeam.get(member.team_id) ?? [];
    list.push(toPerson(member));
    membersByTeam.set(member.team_id, list);
  }
  const athleteById = new Map((athletes.data ?? []).map((row) => [row.id, toPerson(row)]));

  const holders: PodiumHolder[] = podium.map((row) => {
    const rank = row.rank as PodiumHolder["rank"];
    if (row.athleteId) {
      const person = athleteById.get(row.athleteId);
      return {
        rankingId: row.id,
        rank,
        kind: "athlete" as const,
        name: row.name,
        orgName: row.orgName,
        city: row.city,
        deliveredAt: row.medalDeliveredAt,
        people: person ? [person] : [],
      };
    }
    return {
      rankingId: row.id,
      rank,
      kind: "team" as const,
      name: row.name,
      orgName: row.orgName,
      city: row.city,
      deliveredAt: row.medalDeliveredAt,
      people: membersByTeam.get(row.teamId) ?? [],
    };
  });

  return {
    data: {
      fixtureId: fixture.data.id,
      categoryLabel: fixture.data.categoryLabel,
      sportName: fixture.data.sportName,
      rankingLockedAt: fixture.data.rankingLockedAt,
      holders,
    },
    error: null,
  };
}

export async function setPodiumDelivery(
  rankingId: string,
  delivered: boolean,
): Promise<ServiceResult<true>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_ranking")
    .select("id, rank, fixture_id, deleted_at")
    .eq("id", rankingId)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  if (!data || data.deleted_at) {
    return { data: null, error: { message: "Medal row was not found." } };
  }
  if (!isPodiumRank(data.rank)) {
    return { data: null, error: { message: "Only 1st, 2nd and 3rd receive medals." } };
  }

  const fixture = await getFixture(data.fixture_id);
  if (fixture.error || !fixture.data) return { data: null, error: fixture.error };
  if (!fixture.data.rankingLockedAt) {
    return { data: null, error: { message: "Lock 1st, 2nd and 3rd on scoring before marking delivery." } };
  }

  const { error: updateError } = await supabase
    .from("fixture_ranking")
    .update({ medal_delivered_at: delivered ? new Date().toISOString() : null })
    .eq("id", rankingId);
  if (updateError) return { data: null, error: toServiceError(updateError) };
  return { data: true, error: null };
}
