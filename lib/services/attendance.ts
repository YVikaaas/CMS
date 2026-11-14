import { createClient } from "@/lib/supabase/client";
import type {
  CallRoomAttendanceRow,
  CallRoomMark,
  CallRoomMember,
  CallRoomSheet,
  FixtureMatch,
  Gender,
  ServiceResult,
} from "@/lib/types/cms";
import {
  athleteUnitFromMatch,
  callRoomPersistRows,
  callRoomTeamIds,
  emptyTeamUnit,
  isCallRoomSoloMatch,
  withCallRoomEffective,
} from "@/lib/utils/callRoom";
import { isHeatMatch } from "@/lib/utils/athletics";
import { orgCityLine } from "@/lib/utils/labels";
import { toServiceError } from "./errors";

type AttendanceRow = {
  fixture_match_id: string;
  team_id: string | null;
  team_member_id: string | null;
  status: Exclude<CallRoomMark, "">;
};

type MemberRow = {
  id: string;
  team_id: string;
  name: string;
  gender: Gender;
};

function toAttendance(row: AttendanceRow): CallRoomAttendanceRow {
  return {
    matchId: row.fixture_match_id,
    teamId: row.team_id,
    teamMemberId: row.team_member_id,
    status: row.status,
  };
}

function memberMarkMap(rows: CallRoomAttendanceRow[]): Map<string, CallRoomMark> {
  const marks = new Map<string, CallRoomMark>();
  for (const row of rows) {
    if (row.teamMemberId) marks.set(row.teamMemberId, row.status);
  }
  return marks;
}

function teamMarkMap(rows: CallRoomAttendanceRow[]): Map<string, CallRoomMark> {
  const marks = new Map<string, CallRoomMark>();
  for (const row of rows) {
    if (row.teamId) marks.set(row.teamId, row.status);
  }
  return marks;
}

export async function listCallRoomAttendance(
  matchIds: string[],
): Promise<ServiceResult<CallRoomAttendanceRow[]>> {
  if (matchIds.length === 0) return { data: [], error: null };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fixture_match_attendance")
    .select("fixture_match_id, team_id, team_member_id, status")
    .in("fixture_match_id", matchIds)
    .is("deleted_at", null);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data ?? []).map((row) => toAttendance(row as AttendanceRow)), error: null };
}

async function listMembersByTeam(
  teamIds: string[],
): Promise<ServiceResult<MemberRow[]>> {
  if (teamIds.length === 0) return { data: [], error: null };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_member")
    .select("id, team_id, name, gender")
    .in("team_id", teamIds)
    .is("deleted_at", null)
    .order("name");
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data ?? []) as MemberRow[], error: null };
}

function teamUnits(
  match: FixtureMatch,
  attendance: CallRoomAttendanceRow[],
  members: MemberRow[],
): CallRoomSheet["units"] {
  const teamMarks = teamMarkMap(attendance);
  const memberMarks = memberMarkMap(attendance);
  const membersByTeam = new Map<string, MemberRow[]>();
  for (const member of members) {
    const list = membersByTeam.get(member.team_id) ?? [];
    list.push(member);
    membersByTeam.set(member.team_id, list);
  }

  const sides: Array<{ teamId: string; name: string; detail: string | null }> = [];
  if (!isHeatMatch(match)) {
    if (match.team1Id) {
      sides.push({ teamId: match.team1Id, name: match.team1Name, detail: null });
    }
    if (match.team2Id) {
      sides.push({ teamId: match.team2Id, name: match.team2Name, detail: null });
    }
  } else {
    for (const row of match.participants) {
      if (!row.teamId || row.athleteId) continue;
      sides.push({
        teamId: row.teamId,
        name: row.name,
        detail: [row.lane ? `Lane ${row.lane}` : null, orgCityLine(row.orgName, row.city)]
          .filter(Boolean)
          .join(" · ") || null,
      });
    }
  }

  return sides.map((side) => {
    const roster = membersByTeam.get(side.teamId) ?? [];
    const unitMembers: CallRoomMember[] = roster.map((member) => ({
      id: member.id,
      name: member.name,
      mark: memberMarks.get(member.id) ?? "",
      effective: memberMarks.get(member.id) ?? "",
    }));
    return emptyTeamUnit({
      teamId: side.teamId,
      name: side.name,
      detail: side.detail,
      mark: teamMarks.get(side.teamId) ?? "",
      members: unitMembers,
    });
  });
}

export async function getCallRoomSheet(
  match: FixtureMatch,
): Promise<ServiceResult<CallRoomSheet>> {
  const attendance = await listCallRoomAttendance([match.id]);
  if (attendance.error || !attendance.data) {
    return { data: null, error: attendance.error };
  }

  if (isCallRoomSoloMatch(match)) {
    return {
      data: withCallRoomEffective({
        matchId: match.id,
        solo: true,
        units: athleteUnitFromMatch(match, memberMarkMap(attendance.data)),
      }),
      error: null,
    };
  }

  const members = await listMembersByTeam(callRoomTeamIds(match));
  if (members.error || !members.data) {
    return { data: null, error: members.error };
  }

  return {
    data: withCallRoomEffective({
      matchId: match.id,
      solo: false,
      units: teamUnits(match, attendance.data, members.data),
    }),
    error: null,
  };
}

export async function saveCallRoomSheet(
  sheet: CallRoomSheet,
): Promise<ServiceResult<CallRoomSheet>> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const desired = callRoomPersistRows(sheet);

  const { data: existing, error: liveError } = await supabase
    .from("fixture_match_attendance")
    .select("id, team_id, team_member_id, status, deleted_at")
    .eq("fixture_match_id", sheet.matchId);
  if (liveError) return { data: null, error: toServiceError(liveError) };

  const rows = existing ?? [];
  const desiredKeys = new Set(
    desired.map((row) => (row.teamId ? `team:${row.teamId}` : `member:${row.teamMemberId}`)),
  );

  const staleIds = rows
    .filter((row) => {
      if (row.deleted_at) return false;
      const key = row.team_id ? `team:${row.team_id}` : `member:${row.team_member_id}`;
      return !desiredKeys.has(key);
    })
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("fixture_match_attendance")
      .update({ deleted_at: now })
      .in("id", staleIds);
    if (error) return { data: null, error: toServiceError(error) };
  }

  for (const row of desired) {
    const sameSubject = (item: (typeof rows)[number]) =>
      row.teamId ? item.team_id === row.teamId : item.team_member_id === row.teamMemberId;
    const current = rows.find((item) => sameSubject(item) && !item.deleted_at) ?? rows.find(sameSubject);
    if (current) {
      if (!current.deleted_at && current.status === row.status) continue;
      const { error } = await supabase
        .from("fixture_match_attendance")
        .update({ status: row.status, deleted_at: null })
        .eq("id", current.id);
      if (error) return { data: null, error: toServiceError(error) };
      continue;
    }
    const { error } = await supabase.from("fixture_match_attendance").insert({
      fixture_match_id: sheet.matchId,
      team_id: row.teamId,
      team_member_id: row.teamMemberId,
      status: row.status,
    });
    if (error) return { data: null, error: toServiceError(error) };
  }

  return { data: withCallRoomEffective(sheet), error: null };
}
