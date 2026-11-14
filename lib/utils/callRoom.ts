import type {
  CallRoomAction,
  CallRoomAttendanceRow,
  CallRoomMark,
  CallRoomMember,
  CallRoomSheet,
  CallRoomUnit,
  FixtureMatch,
} from "@/lib/types/cms";
import { isHeatMatch } from "@/lib/utils/athletics";
import { orgCityLine } from "@/lib/utils/labels";

export function isCallRoomSoloMatch(
  match: Pick<FixtureMatch, "kind" | "formatType" | "participants">,
): boolean {
  return isHeatMatch(match) && match.participants.some((row) => Boolean(row.athleteId));
}

export function callRoomTeamIds(match: Pick<FixtureMatch, "kind" | "formatType" | "team1Id" | "team2Id" | "participants">): string[] {
  if (!isHeatMatch(match)) {
    return [match.team1Id, match.team2Id].filter(Boolean);
  }
  return [...new Set(match.participants.map((row) => row.teamId).filter(Boolean))];
}

export function withCallRoomEffective(sheet: CallRoomSheet): CallRoomSheet {
  return {
    ...sheet,
    units: sheet.units.map((unit) => ({
      ...unit,
      members: unit.members.map((member) => ({
        ...member,
        effective: unit.kind === "team" && unit.mark === "absent" ? "absent" : member.mark,
      })),
    })),
  };
}

function syncTeamFromMembers(unit: CallRoomUnit): CallRoomUnit {
  if (unit.kind !== "team" || unit.members.length === 0) return unit;
  if (unit.members.some((member) => member.mark === "present")) {
    return { ...unit, mark: "present" };
  }
  if (unit.members.every((member) => member.mark === "absent")) {
    return { ...unit, mark: "absent" };
  }
  return unit;
}

function setUnitMark(unit: CallRoomUnit, mark: CallRoomMark): CallRoomUnit {
  return { ...unit, mark };
}

function setMemberMark(unit: CallRoomUnit, memberId: string, mark: CallRoomMark): CallRoomUnit {
  return {
    ...unit,
    members: unit.members.map((member) => (member.id === memberId ? { ...member, mark } : member)),
  };
}

export function applyCallRoomChange(sheet: CallRoomSheet, action: CallRoomAction): CallRoomSheet {
  let units = sheet.units;

  if (action.type === "all") {
    units = sheet.units.map((unit) => ({
      ...unit,
      mark: action.mark,
      members: unit.members.map((member) => ({ ...member, mark: action.mark })),
    }));
  } else if (action.type === "unit") {
    units = sheet.units.map((unit) => (unit.key === action.key ? setUnitMark(unit, action.mark) : unit));
  } else {
    units = sheet.units.map((unit) => {
      if (unit.key !== action.key) return unit;
      return syncTeamFromMembers(setMemberMark(unit, action.memberId, action.mark));
    });
  }

  return withCallRoomEffective({ ...sheet, units });
}

export function callRoomPersistRows(sheet: CallRoomSheet): Array<{
  teamId: string | null;
  teamMemberId: string | null;
  status: Exclude<CallRoomMark, "">;
}> {
  const rows: Array<{
    teamId: string | null;
    teamMemberId: string | null;
    status: Exclude<CallRoomMark, "">;
  }> = [];

  for (const unit of sheet.units) {
    if (unit.kind === "athlete" && (unit.mark === "present" || unit.mark === "absent") && unit.memberId) {
      rows.push({ teamId: null, teamMemberId: unit.memberId, status: unit.mark });
    }
    if (unit.kind === "team" && (unit.mark === "present" || unit.mark === "absent") && unit.teamId) {
      rows.push({ teamId: unit.teamId, teamMemberId: null, status: unit.mark });
    }
    for (const member of unit.members) {
      if (member.mark === "present" || member.mark === "absent") {
        rows.push({ teamId: null, teamMemberId: member.id, status: member.mark });
      }
    }
  }

  return rows;
}

export function callRoomProgress(sheet: CallRoomSheet): {
  total: number;
  present: number;
  absent: number;
  unset: number;
} {
  if (sheet.solo) {
    const total = sheet.units.length;
    const present = sheet.units.filter((unit) => unit.mark === "present").length;
    const absent = sheet.units.filter((unit) => unit.mark === "absent").length;
    return { total, present, absent, unset: total - present - absent };
  }

  const people = sheet.units.flatMap((unit) => unit.members);
  if (people.length > 0) {
    const present = people.filter((member) => member.effective === "present").length;
    const absent = people.filter((member) => member.effective === "absent").length;
    return {
      total: people.length,
      present,
      absent,
      unset: people.length - present - absent,
    };
  }

  const total = sheet.units.length;
  const present = sheet.units.filter((unit) => unit.mark === "present").length;
  const absent = sheet.units.filter((unit) => unit.mark === "absent").length;
  return { total, present, absent, unset: total - present - absent };
}

export function callRoomStatusLabel(progress: ReturnType<typeof callRoomProgress>): string {
  if (progress.total === 0) return "Empty";
  if (progress.unset === progress.total) return "Not marked";
  if (progress.present === progress.total) return "All present";
  if (progress.absent === progress.total) return "All absent";
  if (progress.unset === 0) return `${progress.present} in · ${progress.absent} out`;
  return `${progress.present} in · ${progress.absent} out · ${progress.unset} open`;
}

export function callRoomQueueHint(
  match: FixtureMatch,
  rows: CallRoomAttendanceRow[],
): string {
  const mine = rows.filter((row) => row.matchId === match.id);
  if (isCallRoomSoloMatch(match)) {
    const people = match.participants.filter((row) => row.athleteId);
    const present = people.filter((row) =>
      mine.some((mark) => mark.teamMemberId === row.athleteId && mark.status === "present"),
    ).length;
    const absent = people.filter((row) =>
      mine.some((mark) => mark.teamMemberId === row.athleteId && mark.status === "absent"),
    ).length;
    return callRoomStatusLabel({
      total: people.length,
      present,
      absent,
      unset: people.length - present - absent,
    });
  }

  const teamIds = callRoomTeamIds(match);
  const present = teamIds.filter((id) =>
    mine.some((mark) => mark.teamId === id && mark.status === "present"),
  ).length;
  const absent = teamIds.filter((id) =>
    mine.some((mark) => mark.teamId === id && mark.status === "absent"),
  ).length;
  if (teamIds.length === 0) return "No sides";
  return callRoomStatusLabel({
    total: teamIds.length,
    present,
    absent,
    unset: teamIds.length - present - absent,
  });
}

export function callRoomQueueTone(
  match: FixtureMatch,
  rows: CallRoomAttendanceRow[],
): "neutral" | "success" | "warning" | "danger" {
  const hint = callRoomQueueHint(match, rows);
  if (hint === "All present") return "success";
  if (hint === "All absent") return "danger";
  if (hint === "Not marked" || hint === "Empty" || hint === "No sides") return "neutral";
  return "warning";
}

export function athleteUnitFromMatch(
  match: FixtureMatch,
  marks: Map<string, CallRoomMark>,
): CallRoomUnit[] {
  return match.participants
    .filter((row) => row.athleteId)
    .map((row) => ({
      key: row.athleteId,
      kind: "athlete" as const,
      teamId: row.teamId,
      memberId: row.athleteId,
      name: row.name,
      detail: [row.lane ? `Lane ${row.lane}` : null, orgCityLine(row.orgName, row.city)]
        .filter(Boolean)
        .join(" · ") || null,
      lane: row.lane || null,
      mark: marks.get(row.athleteId) ?? "",
      members: [] as CallRoomMember[],
    }));
}

export function emptyTeamUnit(input: {
  teamId: string;
  name: string;
  detail: string | null;
  mark: CallRoomMark;
  members: CallRoomMember[];
}): CallRoomUnit {
  return {
    key: input.teamId,
    kind: "team",
    teamId: input.teamId,
    memberId: "",
    name: input.name,
    detail: input.detail,
    lane: null,
    mark: input.mark,
    members: input.members,
  };
}

export function toggleCallRoomMark(current: CallRoomMark, next: Exclude<CallRoomMark, "">): CallRoomMark {
  return current === next ? "" : next;
}
