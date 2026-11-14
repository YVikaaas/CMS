"use client";

import { useMemo, useState } from "react";
import { SoftButton, SoftCard, SoftSearch, StatusBadge } from "@/components/ops";
import type { CallRoomAction, CallRoomMark, CallRoomSheet, CallRoomUnit } from "@/lib/types/cms";
import {
  applyCallRoomChange,
  callRoomProgress,
  callRoomStatusLabel,
  toggleCallRoomMark,
} from "@/lib/utils/callRoom";
import { matchesQuery } from "@/lib/utils/table";

type Props = {
  sheet: CallRoomSheet;
  saving?: boolean;
  onChange: (next: CallRoomSheet, action: CallRoomAction) => void;
};

function MarkButtons({
  mark,
  disabled,
  onPick,
}: {
  mark: CallRoomMark;
  disabled?: boolean;
  onPick: (mark: CallRoomMark) => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <SoftButton
        variant={mark === "present" ? "success" : "default"}
        disabled={disabled}
        onClick={() => onPick(toggleCallRoomMark(mark, "present"))}
      >
        Present
      </SoftButton>
      <SoftButton
        variant={mark === "absent" ? "danger" : "default"}
        disabled={disabled}
        onClick={() => onPick(toggleCallRoomMark(mark, "absent"))}
      >
        Absent
      </SoftButton>
    </div>
  );
}

function unitVisible(unit: CallRoomUnit, query: string): boolean {
  if (!query.trim()) return true;
  if (matchesQuery(query, unit.name, unit.detail)) return true;
  return unit.members.some((member) => matchesQuery(query, member.name));
}

function filterUnit(unit: CallRoomUnit, query: string): CallRoomUnit {
  if (!query.trim() || unit.kind === "athlete") return unit;
  if (matchesQuery(query, unit.name, unit.detail)) return unit;
  return {
    ...unit,
    members: unit.members.filter((member) => matchesQuery(query, member.name)),
  };
}

function AthleteRow({
  unit,
  disabled,
  onPick,
}: {
  unit: CallRoomUnit;
  disabled?: boolean;
  onPick: (mark: CallRoomMark) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--ops-line)] bg-[var(--ops-surface)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{unit.name}</p>
        {unit.detail ? <p className="text-sm text-[var(--ops-text-muted)]">{unit.detail}</p> : null}
      </div>
      <MarkButtons mark={unit.mark} disabled={disabled} onPick={onPick} />
    </div>
  );
}

function TeamCard({
  unit,
  disabled,
  onUnit,
  onMember,
}: {
  unit: CallRoomUnit;
  disabled?: boolean;
  onUnit: (mark: CallRoomMark) => void;
  onMember: (memberId: string, mark: CallRoomMark) => void;
}) {
  const teamOut = unit.mark === "absent";
  const presentCount = unit.members.filter((member) => member.effective === "present").length;

  return (
    <SoftCard className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{unit.name}</p>
            <StatusBadge tone={teamOut ? "danger" : unit.mark === "present" ? "success" : "neutral"}>
              {teamOut ? "Team out" : unit.mark === "present" ? "Team in" : "Team unset"}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
            {unit.detail ? `${unit.detail} · ` : ""}
            {unit.members.length === 0
              ? "No members on this team"
              : `${presentCount}/${unit.members.length} players in`}
          </p>
          {teamOut ? (
            <p className="mt-1 text-sm text-[var(--ops-danger)]">
              Team absent marks every player out. Tap Present on a player to bring the team back.
            </p>
          ) : null}
        </div>
        <MarkButtons mark={unit.mark} disabled={disabled} onPick={onUnit} />
      </div>
      {unit.members.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {unit.members.map((member) => (
            <li
              key={member.id}
              className={`flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                member.effective === "absent"
                  ? "border-[var(--ops-danger)]/20 bg-[var(--ops-danger-soft)]/40"
                  : "border-[var(--ops-line)] bg-[var(--ops-board-muted)]"
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium">{member.name}</p>
                {teamOut && member.mark !== "absent" ? (
                  <p className="text-xs text-[var(--ops-text-muted)]">Out with the team</p>
                ) : null}
              </div>
              <MarkButtons
                mark={member.effective}
                disabled={disabled}
                onPick={(mark) => onMember(member.id, mark)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </SoftCard>
  );
}

export function CallRoomBoard({ sheet, saving, onChange }: Props) {
  const [query, setQuery] = useState("");
  const progress = callRoomProgress(sheet);
  const visible = useMemo(
    () =>
      sheet.units.filter((unit) => unitVisible(unit, query)).map((unit) => filterUnit(unit, query)),
    [query, sheet.units],
  );

  function commit(action: CallRoomAction) {
    onChange(applyCallRoomChange(sheet, action), action);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{sheet.solo ? "Athletes" : "Teams"}</p>
          <p className="text-sm text-[var(--ops-text-muted)]">{callRoomStatusLabel(progress)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SoftButton disabled={saving || sheet.units.length === 0} onClick={() => commit({ type: "all", mark: "present" })}>
            All present
          </SoftButton>
          <SoftButton disabled={saving || sheet.units.length === 0} onClick={() => commit({ type: "all", mark: "absent" })}>
            All absent
          </SoftButton>
        </div>
      </div>
      {sheet.units.length > 0 ? (
        <SoftSearch
          placeholder={sheet.solo ? "Search athletes" : "Search teams or players"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      {sheet.units.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-muted)]">No sides on this match yet.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-muted)]">
          {sheet.solo ? "No matching athletes" : "No matching teams"}
        </p>
      ) : sheet.solo ? (
        <div className="flex flex-col gap-2">
          {visible.map((unit) => (
            <AthleteRow
              key={unit.key}
              unit={unit}
              disabled={saving}
              onPick={(mark) => commit({ type: "unit", key: unit.key, mark })}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((unit) => (
            <TeamCard
              key={unit.key}
              unit={unit}
              disabled={saving}
              onUnit={(mark) => commit({ type: "unit", key: unit.key, mark })}
              onMember={(memberId, mark) => commit({ type: "member", key: unit.key, memberId, mark })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
