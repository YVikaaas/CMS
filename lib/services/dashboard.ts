import { createClient } from "@/lib/supabase/client";
import type {
  DashboardSportStat,
  DashboardSummary,
  FixtureFormatType,
  FixtureMatchStatus,
  FixtureRoundType,
  FixtureStatus,
  Gender,
  ServiceResult,
} from "@/lib/types/cms";
import { toServiceError } from "./errors";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function emptySummary(): DashboardSummary {
  return {
    sportCount: 0,
    categoryCount: 0,
    boysCategoryCount: 0,
    girlsCategoryCount: 0,
    soloCategoryCount: 0,
    relayCategoryCount: 0,
    teamSportCategoryCount: 0,
    ageGroupCount: 0,
    categoryWithEntryCount: 0,
    categoryWithoutEntryCount: 0,
    categoryWithDrawCount: 0,
    categoryWithoutDrawCount: 0,
    teamCount: 0,
    teamEntryCount: 0,
    relayEntryCount: 0,
    basketballTeamCount: 0,
    soloAthleteCount: 0,
    athleteCount: 0,
    orgCount: 0,
    cityCount: 0,
    fixtureCount: 0,
    fixtureDraft: 0,
    fixturePublished: 0,
    fixtureInProgress: 0,
    fixtureCompleted: 0,
    trackFixtureCount: 0,
    fieldFixtureCount: 0,
    leagueFixtureCount: 0,
    bracketFixtureCount: 0,
    rankingLockedCount: 0,
    rankingUnlockedCount: 0,
    roundCount: 0,
    heatRoundCount: 0,
    qualifyingRoundCount: 0,
    leagueRoundCount: 0,
    quarterFinalCount: 0,
    semiFinalCount: 0,
    finalRoundCount: 0,
    thirdPlaceCount: 0,
    matchCount: 0,
    matchDraft: 0,
    matchScheduled: 0,
    matchInProgress: 0,
    matchCompleted: 0,
    matchCancelled: 0,
    matchNoShow: 0,
    matchOpenCount: 0,
    heatCount: 0,
    dualCount: 0,
    callRoomMatchCount: 0,
    callRoomUnmarkedCount: 0,
    presentCount: 0,
    absentCount: 0,
    rankingEntryCount: 0,
    goldDelivered: 0,
    silverDelivered: 0,
    bronzeDelivered: 0,
    medalsDelivered: 0,
    medalsWaiting: 0,
    scoreEventCount: 0,
    sports: [],
  };
}

function countBy<K extends string>(rows: K[]): Record<K, number> {
  const next = {} as Record<K, number>;
  for (const key of rows) next[key] = (next[key] ?? 0) + 1;
  return next;
}

export async function getDashboardSummary(
  championshipId: string,
): Promise<ServiceResult<DashboardSummary>> {
  const supabase = createClient();
  const summary = emptySummary();

  const { data: csmRows, error: csmError } = await supabase
    .from("competition_sport_map")
    .select("id, sport_id, sport:sport_id (name)")
    .eq("competition_id", championshipId)
    .is("deleted_at", null);
  if (csmError) return { data: null, error: toServiceError(csmError) };
  const csm = (csmRows ?? []) as Array<{
    id: string;
    sport_id: string;
    sport: { name: string } | { name: string }[] | null;
  }>;
  summary.sportCount = csm.length;
  if (csm.length === 0) return { data: summary, error: null };

  const csmIds = csm.map((row) => row.id);
  const sportNameByCsm = new Map(
    csm.map((row) => [row.id, unwrap(row.sport)?.name ?? "Sport"]),
  );

  const { data: cscRows, error: cscError } = await supabase
    .from("competition_sport_category_map")
    .select("id, competition_sport_id, category:category_id (gender, team_size, age_group)")
    .in("competition_sport_id", csmIds)
    .is("deleted_at", null);
  if (cscError) return { data: null, error: toServiceError(cscError) };
  const csc = (cscRows ?? []) as Array<{
    id: string;
    competition_sport_id: string;
    category:
      | { gender: Gender; team_size: number; age_group: string }
      | { gender: Gender; team_size: number; age_group: string }[]
      | null;
  }>;
  summary.categoryCount = csc.length;
  const cscIds = csc.map((row) => row.id);
  const csmByCsc = new Map(csc.map((row) => [row.id, row.competition_sport_id]));
  const soloCsc = new Set<string>();
  const relayCsc = new Set<string>();
  const ageGroups = new Set<string>();
  for (const row of csc) {
    const category = unwrap(row.category);
    if (category?.gender === "male") summary.boysCategoryCount += 1;
    if (category?.gender === "female") summary.girlsCategoryCount += 1;
    const teamSize = category?.team_size ?? 0;
    if (teamSize <= 1) {
      summary.soloCategoryCount += 1;
      soloCsc.add(row.id);
    } else if (teamSize === 4) {
      summary.relayCategoryCount += 1;
      relayCsc.add(row.id);
    } else {
      summary.teamSportCategoryCount += 1;
    }
    const age = category?.age_group?.trim();
    if (age) ageGroups.add(age);
  }
  summary.ageGroupCount = ageGroups.size;
  if (cscIds.length === 0) return { data: summary, error: null };

  const [teamRes, fixtureRes] = await Promise.all([
    supabase
      .from("team")
      .select("id, competition_sport_category_map_id, org_name, city")
      .in("competition_sport_category_map_id", cscIds)
      .is("deleted_at", null),
    supabase
      .from("fixture")
      .select("id, competition_sport_category_map_id, status, rankings_locked_at, format_type")
      .in("competition_sport_category_map_id", cscIds)
      .is("deleted_at", null),
  ]);
  if (teamRes.error) return { data: null, error: toServiceError(teamRes.error) };
  if (fixtureRes.error) return { data: null, error: toServiceError(fixtureRes.error) };

  const teams = (teamRes.data ?? []) as Array<{
    id: string;
    competition_sport_category_map_id: string;
    org_name: string | null;
    city: string | null;
  }>;
  const fixtures = (fixtureRes.data ?? []) as Array<{
    id: string;
    competition_sport_category_map_id: string;
    status: FixtureStatus;
    rankings_locked_at: string | null;
    format_type: string;
  }>;

  summary.teamCount = teams.length;
  summary.teamEntryCount = teams.filter((row) => !soloCsc.has(row.competition_sport_category_map_id)).length;
  summary.relayEntryCount = teams.filter((row) => relayCsc.has(row.competition_sport_category_map_id)).length;
  summary.basketballTeamCount = summary.teamEntryCount - summary.relayEntryCount;
  summary.orgCount = new Set(teams.map((row) => row.org_name?.trim()).filter(Boolean)).size;
  summary.cityCount = new Set(teams.map((row) => row.city?.trim()).filter(Boolean)).size;
  const teamsByCsc = new Set(teams.map((row) => row.competition_sport_category_map_id));
  summary.categoryWithEntryCount = csc.filter((row) => teamsByCsc.has(row.id)).length;
  summary.categoryWithoutEntryCount = summary.categoryCount - summary.categoryWithEntryCount;
  const cscByTeam = new Map(teams.map((row) => [row.id, row.competition_sport_category_map_id]));
  const teamIds = teams.map((row) => row.id);

  summary.fixtureCount = fixtures.length;
  const fixtureStatus = countBy(fixtures.map((row) => row.status));
  summary.fixtureDraft = fixtureStatus.draft ?? 0;
  summary.fixturePublished = fixtureStatus.published ?? 0;
  summary.fixtureInProgress = fixtureStatus.in_progress ?? 0;
  summary.fixtureCompleted = fixtureStatus.completed ?? 0;
  const fixtureFormats = countBy(fixtures.map((row) => row.format_type as FixtureFormatType));
  summary.trackFixtureCount = fixtureFormats.track_rounds ?? 0;
  summary.fieldFixtureCount = fixtureFormats.field_attempts ?? 0;
  summary.leagueFixtureCount = fixtureFormats.league_knockout ?? 0;
  summary.bracketFixtureCount = fixtureFormats.bracket_elimination ?? 0;
  summary.rankingLockedCount = fixtures.filter((row) => row.rankings_locked_at).length;
  summary.rankingUnlockedCount = summary.fixtureCount - summary.rankingLockedCount;
  const drawsByCsc = new Set(fixtures.map((row) => row.competition_sport_category_map_id));
  summary.categoryWithDrawCount = csc.filter((row) => drawsByCsc.has(row.id)).length;
  summary.categoryWithoutDrawCount = summary.categoryCount - summary.categoryWithDrawCount;
  const fixtureIds = fixtures.map((row) => row.id);
  const cscByFixture = new Map(fixtures.map((row) => [row.id, row.competition_sport_category_map_id]));
  const athleticsFixtures = new Set(
    fixtures.filter((row) => row.format_type === "track_rounds" || row.format_type === "field_attempts").map((row) => row.id),
  );
  const lockedFixtures = new Set(fixtures.filter((row) => row.rankings_locked_at).map((row) => row.id));

  const memberRes =
    teamIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("team_member")
          .select("id, team_id")
          .in("team_id", teamIds)
          .is("deleted_at", null);
  if (memberRes.error) return { data: null, error: toServiceError(memberRes.error) };
  const members = (memberRes.data ?? []) as Array<{ id: string; team_id: string }>;
  summary.athleteCount = members.length;
  summary.soloAthleteCount = members.filter((row) => soloCsc.has(cscByTeam.get(row.team_id) ?? "")).length;
  const membersByCsc = new Map<string, number>();
  for (const member of members) {
    const cscId = cscByTeam.get(member.team_id);
    if (!cscId) continue;
    membersByCsc.set(cscId, (membersByCsc.get(cscId) ?? 0) + 1);
  }

  const roundRes =
    fixtureIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("fixture_round")
          .select("id, fixture_id, round_type")
          .in("fixture_id", fixtureIds)
          .is("deleted_at", null);
  if (roundRes.error) return { data: null, error: toServiceError(roundRes.error) };
  const rounds = (roundRes.data ?? []) as Array<{
    id: string;
    fixture_id: string;
    round_type: FixtureRoundType;
  }>;
  summary.roundCount = rounds.length;
  const roundTypes = countBy(rounds.map((row) => row.round_type));
  summary.heatRoundCount = roundTypes.heat ?? 0;
  summary.qualifyingRoundCount = roundTypes.qualifying ?? 0;
  summary.leagueRoundCount = roundTypes.league ?? 0;
  summary.quarterFinalCount = roundTypes.quarter_final ?? 0;
  summary.semiFinalCount = roundTypes.semi_final ?? 0;
  summary.finalRoundCount = roundTypes.final ?? 0;
  summary.thirdPlaceCount = roundTypes.third_place ?? 0;
  const roundIds = rounds.map((row) => row.id);
  const fixtureByRound = new Map(rounds.map((row) => [row.id, row.fixture_id]));

  const matchRes =
    roundIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("fixture_match")
          .select("id, fixture_round_id, status")
          .in("fixture_round_id", roundIds)
          .is("deleted_at", null);
  if (matchRes.error) return { data: null, error: toServiceError(matchRes.error) };
  const matches = (matchRes.data ?? []) as Array<{
    id: string;
    fixture_round_id: string;
    status: FixtureMatchStatus;
  }>;
  summary.matchCount = matches.length;
  const matchStatus = countBy(matches.map((row) => row.status));
  summary.matchDraft = matchStatus.draft ?? 0;
  summary.matchScheduled = matchStatus.scheduled ?? 0;
  summary.matchInProgress = matchStatus.in_progress ?? 0;
  summary.matchCompleted = matchStatus.completed ?? 0;
  summary.matchCancelled = matchStatus.cancelled ?? 0;
  summary.matchNoShow = matchStatus.no_show ?? 0;
  summary.matchOpenCount =
    summary.matchDraft + summary.matchScheduled + summary.matchInProgress;
  for (const match of matches) {
    const fixtureId = fixtureByRound.get(match.fixture_round_id);
    if (fixtureId && athleticsFixtures.has(fixtureId)) summary.heatCount += 1;
    else summary.dualCount += 1;
  }
  const matchIds = matches.map((row) => row.id);
  const cscByMatch = new Map<string, string>();
  for (const match of matches) {
    const fixtureId = fixtureByRound.get(match.fixture_round_id);
    const cscId = fixtureId ? cscByFixture.get(fixtureId) : undefined;
    if (cscId) cscByMatch.set(match.id, cscId);
  }

  const [attendanceRes, rankingRes, eventRes] = await Promise.all([
    matchIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("fixture_match_attendance")
          .select("fixture_match_id, status")
          .in("fixture_match_id", matchIds)
          .is("deleted_at", null),
    fixtureIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("fixture_ranking")
          .select("fixture_id, rank, medal_delivered_at")
          .in("fixture_id", fixtureIds)
          .is("deleted_at", null),
    matchIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("fixture_match_score_event")
          .select("id")
          .in("fixture_match_id", matchIds)
          .is("deleted_at", null),
  ]);
  if (attendanceRes.error) return { data: null, error: toServiceError(attendanceRes.error) };
  if (rankingRes.error) return { data: null, error: toServiceError(rankingRes.error) };
  if (eventRes.error) return { data: null, error: toServiceError(eventRes.error) };

  const attendance = (attendanceRes.data ?? []) as Array<{ fixture_match_id: string; status: string }>;
  summary.callRoomMatchCount = new Set(attendance.map((row) => row.fixture_match_id)).size;
  summary.callRoomUnmarkedCount = Math.max(0, summary.matchCount - summary.callRoomMatchCount);
  summary.presentCount = attendance.filter((row) => row.status === "present").length;
  summary.absentCount = attendance.filter((row) => row.status === "absent").length;
  summary.scoreEventCount = (eventRes.data ?? []).length;

  const ranking = (rankingRes.data ?? []) as Array<{
    fixture_id: string;
    rank: number;
    medal_delivered_at: string | null;
  }>;
  summary.rankingEntryCount = ranking.length;
  const podium = ranking.filter((row) => lockedFixtures.has(row.fixture_id) && row.rank >= 1 && row.rank <= 3);
  summary.medalsDelivered = podium.filter((row) => row.medal_delivered_at).length;
  summary.medalsWaiting = podium.filter((row) => !row.medal_delivered_at).length;
  summary.goldDelivered = podium.filter((row) => row.rank === 1 && row.medal_delivered_at).length;
  summary.silverDelivered = podium.filter((row) => row.rank === 2 && row.medal_delivered_at).length;
  summary.bronzeDelivered = podium.filter((row) => row.rank === 3 && row.medal_delivered_at).length;

  const sports: DashboardSportStat[] = csm.map((row) => ({
    id: row.sport_id,
    name: sportNameByCsm.get(row.id) ?? "Sport",
    categoryCount: 0,
    teamCount: 0,
    athleteCount: 0,
    fixtureCount: 0,
    matchCount: 0,
    matchCompleted: 0,
    rankingLockedCount: 0,
    medalsDelivered: 0,
  }));
  const sportStatByCsmId = new Map<string, DashboardSportStat>();
  csm.forEach((row, index) => {
    const stat = sports[index];
    if (stat) sportStatByCsmId.set(row.id, stat);
  });

  for (const row of csc) {
    const stat = sportStatByCsmId.get(row.competition_sport_id);
    if (stat) stat.categoryCount += 1;
  }
  for (const team of teams) {
    const csmId = csmByCsc.get(team.competition_sport_category_map_id);
    const stat = csmId ? sportStatByCsmId.get(csmId) : undefined;
    if (stat) stat.teamCount += 1;
  }
  for (const [cscId, count] of membersByCsc) {
    const csmId = csmByCsc.get(cscId);
    const stat = csmId ? sportStatByCsmId.get(csmId) : undefined;
    if (stat) stat.athleteCount += count;
  }
  for (const fixture of fixtures) {
    const csmId = csmByCsc.get(fixture.competition_sport_category_map_id);
    const stat = csmId ? sportStatByCsmId.get(csmId) : undefined;
    if (!stat) continue;
    stat.fixtureCount += 1;
    if (fixture.rankings_locked_at) stat.rankingLockedCount += 1;
  }
  for (const row of podium) {
    if (!row.medal_delivered_at) continue;
    const cscId = cscByFixture.get(row.fixture_id);
    const csmId = cscId ? csmByCsc.get(cscId) : undefined;
    const stat = csmId ? sportStatByCsmId.get(csmId) : undefined;
    if (stat) stat.medalsDelivered += 1;
  }
  for (const match of matches) {
    const cscId = cscByMatch.get(match.id);
    const csmId = cscId ? csmByCsc.get(cscId) : undefined;
    const stat = csmId ? sportStatByCsmId.get(csmId) : undefined;
    if (!stat) continue;
    stat.matchCount += 1;
    if (match.status === "completed") stat.matchCompleted += 1;
  }

  summary.sports = sports.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { data: summary, error: null };
}
