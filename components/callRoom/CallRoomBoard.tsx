"use client";

import { useMemo, useState } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { SoftButton, SoftSearch } from "@/components/ops";
import { cn } from "@/lib/utils/cn";
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
  eyebrow?: string;
  title?: string;
  onChange: (next: CallRoomSheet, action: CallRoomAction) => void;
};

// Soft segmented toggle: tinted fill + dark text when picked, never a solid green/red block.
// Fixed widths keep team and player buttons in one column.
const markClass = {
  present:
    "[&.Mui-selected]:border-[var(--ops-success)]/40 [&.Mui-selected]:bg-[var(--ops-success-soft)] [&.Mui-selected]:text-[var(--ops-success)] [&.Mui-selected:hover]:bg-[var(--ops-success-soft)]",
  absent:
    "[&.Mui-selected]:border-[var(--ops-danger)]/40 [&.Mui-selected]:bg-[var(--ops-danger-soft)] [&.Mui-selected]:text-[var(--ops-danger)] [&.Mui-selected:hover]:bg-[var(--ops-danger-soft)]",
};

function MarkButtons({
  mark,
  disabled,
  onPick,
  label,
}: {
  mark: CallRoomMark;
  disabled?: boolean;
  onPick: (mark: CallRoomMark) => void;
  label: string;
}) {
  return (
    <ToggleButtonGroup exclusive value={mark} disabled={disabled} aria-label={`${label} attendance`} className="shrink-0">
      {(["present", "absent"] as const).map((value) => (
        <ToggleButton
          key={value}
          value={value}
          onClick={() => onPick(toggleCallRoomMark(mark, value))}
          className={cn(
            "min-h-11 w-[92px] border-[var(--ops-line-strong)] text-[13px] font-semibold normal-case text-[var(--ops-text)]",
            markClass[value],
          )}
        >
          {value === "present" ? "Present" : "Absent"}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
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

export function CallRoomBoard({ sheet, saving, eyebrow, title, onChange }: Props) {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-wide text-[var(--ops-primary)] uppercase">{eyebrow}</p>
          ) : null}
          <h2 className="text-xl font-semibold">{title || (sheet.solo ? "Athletes" : "Teams")}</h2>
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
      ) : (
        <div className="ops-table">
          <table>
            <thead>
              <tr>
                <th className="w-14">#</th>
                <th>{sheet.solo ? "Athlete" : "Team"}</th>
                <th className="text-right">Call</th>
              </tr>
            </thead>
            <tbody>
              {sheet.solo
                ? visible.map((unit, index) => (
                    <tr key={unit.key} className={unit.mark === "absent" ? "bg-[var(--ops-danger-soft)]/40" : undefined}>
                      <td className="tabular-nums">{unit.lane ?? index + 1}</td>
                      <td>
                        <p className="font-semibold">{unit.name}</p>
                        {unit.detail ? <p className="text-sm text-[var(--ops-text-muted)]">{unit.detail}</p> : null}
                      </td>
                      <td className="text-right">
                        <MarkButtons
                          mark={unit.mark}
                          disabled={saving}
                          onPick={(mark) => commit({ type: "unit", key: unit.key, mark })}
                          label={unit.name}
                        />
                      </td>
                    </tr>
                  ))
                : visible.map((unit, index) => (
                    <TeamRows
                      key={unit.key}
                      index={index}
                      unit={unit}
                      disabled={saving}
                      onUnit={(mark) => commit({ type: "unit", key: unit.key, mark })}
                      onMember={(memberId, mark) => commit({ type: "member", key: unit.key, memberId, mark })}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ops-text-muted)]">
        <span>
          Present: <strong className="text-[var(--ops-success)]">{progress.present}</strong>
        </span>
        <span>
          Absent: <strong className="text-[var(--ops-danger)]">{progress.absent}</strong>
        </span>
        <span>
          Unmarked: <strong className="text-[var(--ops-text)]">{progress.unset}</strong>
        </span>
        <span className="ml-auto">
          Total: <strong className="text-[var(--ops-text)]">{progress.total}</strong>
        </span>
      </p>
    </div>
  );
}

function TeamRows({
  index,
  unit,
  disabled,
  onUnit,
  onMember,
}: {
  index: number;
  unit: CallRoomUnit;
  disabled?: boolean;
  onUnit: (mark: CallRoomMark) => void;
  onMember: (memberId: string, mark: CallRoomMark) => void;
}) {
  const teamOut = unit.mark === "absent";
  return (
    <>
      <tr>
        <td className="tabular-nums">{index + 1}</td>
        <td>
          <p className="font-semibold">{unit.name}</p>
          <p className="text-sm text-[var(--ops-text-muted)]">
            Team · {unit.members.length} {unit.members.length === 1 ? "athlete" : "athletes"}
          </p>
          {unit.detail ? <p className="text-sm text-[var(--ops-text-muted)]">{unit.detail}</p> : null}
        </td>
        <td className="text-right">
          <MarkButtons mark={unit.mark} disabled={disabled} onPick={onUnit} label={unit.name} />
        </td>
      </tr>
      {unit.members.length > 0 ? (
        <tr>
          <td />
          <td colSpan={2}>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Players</summary>
              <ul className="mt-2 divide-y divide-[var(--ops-line)]">
                {unit.members.map((member) => (
                  <li
                    key={member.id}
                    className={cn(
                      "flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between",
                      member.effective === "absent" && "bg-[var(--ops-danger-soft)]/40",
                    )}
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      {teamOut && member.mark !== "absent" ? (
                        <p className="text-xs text-[var(--ops-text-muted)]">Out with the team</p>
                      ) : null}
                    </div>
                    <MarkButtons
                      mark={member.effective}
                      disabled={disabled}
                      onPick={(mark) => onMember(member.id, mark)}
                      label={member.name}
                    />
                  </li>
                ))}
              </ul>
            </details>
          </td>
        </tr>
      ) : null}
    </>
  );
}
