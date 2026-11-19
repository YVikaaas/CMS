"use client";

import { useMemo, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import { IconCheck, IconPhone, IconPhoneOff, IconX } from "@tabler/icons-react";
import { SoftSearch } from "@/components/ops";
import { cn } from "@/lib/utils/cn";
import type { CallRoomAction, CallRoomMark, CallRoomSheet, CallRoomUnit } from "@/lib/types/cms";
import { applyCallRoomChange, callRoomProgress, toggleCallRoomMark } from "@/lib/utils/callRoom";
import { matchesQuery } from "@/lib/utils/table";

type Props = {
  sheet: CallRoomSheet;
  saving?: boolean;
  onChange: (next: CallRoomSheet, action: CallRoomAction) => void;
};

type View = "left" | "all" | "present" | "absent";

/**
 * Roster as a Material list: 48px rows, 14/20 type, 32px Present / Absent chips.
 * "Left to call" view, and a call button for athletes still unmarked.
 */
export function CallRoomBoard({ sheet, saving, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const progress = callRoomProgress(sheet);

  const counts: Record<View, number> = {
    left: sheet.units.filter((unit) => !unit.mark).length,
    all: sheet.units.length,
    present: sheet.units.filter((unit) => unit.mark === "present").length,
    absent: sheet.units.filter((unit) => unit.mark === "absent").length,
  };

  const visible = useMemo(
    () =>
      sheet.units
        .filter((unit) => (view === "all" ? true : view === "left" ? !unit.mark : unit.mark === view))
        .filter((unit) => unitVisible(unit, query))
        .map((unit) => filterUnit(unit, query)),
    [query, sheet.units, view],
  );

  function commit(action: CallRoomAction) {
    onChange(applyCallRoomChange(sheet, action), action);
  }

  if (sheet.units.length === 0) {
    return <p className="py-6 text-sm text-[var(--ops-text-muted)]">No sides on this match yet.</p>;
  }

  const noun = sheet.solo ? "athletes" : "teams";
  const views: Array<{ id: View; label: string }> = [
    { id: "all", label: "All" },
    { id: "left", label: "Left to call" },
    { id: "present", label: "Present" },
    { id: "absent", label: "Absent" },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ProgressBar present={progress.present} absent={progress.absent} total={progress.total} unit={sheet.solo ? "" : " players"} />
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label={`Show ${noun}`} className="flex gap-1 overflow-x-auto rounded-lg bg-[var(--ops-board-muted)] p-0.5">
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm leading-5 font-medium",
                view === item.id
                  ? "bg-[var(--ops-surface)] text-[var(--ops-text)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                  : "text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "min-w-6 rounded-md px-1.5 text-xs tabular-nums",
                  item.id === "left" && counts.left > 0
                    ? "bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]"
                    : "bg-[var(--ops-surface-hover)]",
                )}
              >
                {counts[item.id]}
              </span>
            </button>
          ))}
        </div>
        <SoftSearch
          placeholder={sheet.solo ? "Name, lane or school" : "Team or player"}
          aria-label={sheet.solo ? "Search athletes" : "Search teams or players"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full flex-none sm:ml-auto sm:w-64"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--ops-line)] p-8 text-center">
          {view === "left" && !query ? (
            <p className="font-semibold text-[var(--ops-success)]">Everyone is marked.</p>
          ) : (
            <p className="text-sm text-[var(--ops-text-muted)]">No {noun} match this view.</p>
          )}
        </div>
      ) : (
        <ul
          className={cn(
            visible[0]?.kind === "athlete"
              ? "divide-y divide-[var(--ops-line)] overflow-hidden rounded-xl border border-[var(--ops-line)]"
              : "flex flex-col gap-2",
          )}
        >
          {visible.map((unit, index) =>
            unit.kind === "athlete" ? (
              <li key={unit.key}>
                <RosterRow
                  badge={String(unit.lane ?? index + 1)}
                  badgeLabel={unit.lane ? `Lane ${unit.lane}` : `Number ${index + 1}`}
                  name={unit.name}
                  detail={unit.detail}
                  mark={unit.mark}
                  disabled={saving}
                  phone={unit.phone}
                  onPick={(mark) => commit({ type: "unit", key: unit.key, mark })}
                />
              </li>
            ) : (
              <TeamBlock
                key={unit.key}
                index={index}
                unit={unit}
                disabled={saving}
                onUnit={(mark) => commit({ type: "unit", key: unit.key, mark })}
                onMember={(memberId, mark) => commit({ type: "member", key: unit.key, memberId, mark })}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

/** One bar, three colours: present | absent | still to call. */
/** `unit` names what is counted when it differs from the rows (team sheets count players). */
function ProgressBar({ present, absent, total, unit }: { present: number; absent: number; total: number; unit: string }) {
  const pct = (value: number) => (total ? `${(value / total) * 100}%` : "0%");
  const left = total - present - absent;
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label="Marked"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={present + absent}
        className="flex h-1 overflow-hidden rounded-full bg-[var(--ops-surface-hover)]"
      >
        <span className="bg-[var(--ops-success)] transition-[width]" style={{ width: pct(present) }} />
        <span className="bg-[var(--ops-danger)] transition-[width]" style={{ width: pct(absent) }} />
      </div>
      <p className="flex flex-wrap gap-x-3 text-xs leading-4 font-medium tabular-nums">
        <span className="text-[var(--ops-success)]">{present}{unit} present</span>
        <span className="text-[var(--ops-danger)]">{absent} absent</span>
        <span className={left ? "text-[var(--ops-warning)]" : "text-[var(--ops-text-muted)]"}>{left} left</span>
      </p>
    </div>
  );
}

const ROW_TONE: Record<CallRoomMark, string> = {
  "": "border-[var(--ops-line)]",
  present: "border-[var(--ops-success)]/50 bg-[var(--ops-success-soft)]/35",
  absent: "border-[var(--ops-danger)]/50 bg-[var(--ops-danger-soft)]/35",
};

/** One list row: badge, name, Present / Absent, call. */
function RosterRow({
  badge,
  badgeLabel,
  name,
  detail,
  mark,
  disabled,
  phone,
  onPick,
}: {
  badge?: string;
  badgeLabel?: string;
  name: string;
  detail: string | null;
  mark: CallRoomMark;
  disabled?: boolean;
  /** undefined = no call button (a team row; players are called one by one). */
  phone?: string | null;
  onPick: (mark: CallRoomMark) => void;
}) {
  return (
    <div
      className={cn(
        "flex min-h-12 flex-wrap items-center gap-2 bg-[var(--ops-surface)] px-3 py-1 transition-colors",
        mark === "present" && "bg-[var(--ops-success-soft)]/40",
        mark === "absent" && "bg-[var(--ops-danger-soft)]/40",
      )}
    >
      {badge ? (
        <span
          aria-label={badgeLabel}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-sm leading-5 font-medium tabular-nums",
            mark === "present"
              ? "bg-[var(--ops-success)] text-white"
              : mark === "absent"
                ? "bg-[var(--ops-danger)] text-white"
                : "bg-[var(--ops-board-muted)] text-[var(--ops-text)]",
          )}
        >
          {badge}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 basis-28">
        <p className="truncate text-sm leading-5 font-medium">{name}</p>
        {detail ? <p className="truncate text-xs leading-4 text-[var(--ops-text-muted)]">{detail}</p> : null}
      </div>
      <div className="flex items-center gap-1">
        <MarkButton kind="present" on={mark === "present"} disabled={disabled} label={name} onClick={() => onPick(toggleCallRoomMark(mark, "present"))} />
        <MarkButton kind="absent" on={mark === "absent"} disabled={disabled} label={name} onClick={() => onPick(toggleCallRoomMark(mark, "absent"))} />
        {phone !== undefined ? <CallButton name={name} phone={phone} urgent={mark !== "present"} /> : null}
      </div>
    </div>
  );
}

function MarkButton({
  kind,
  on,
  disabled,
  label,
  onClick,
}: {
  kind: "present" | "absent";
  on: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = kind === "present" ? IconCheck : IconX;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${label}: ${kind}`}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-xs leading-4 font-medium transition-colors select-none disabled:opacity-60",
        on
          ? kind === "present"
            ? "border-transparent bg-[var(--ops-success-soft)] text-[var(--ops-success)]"
            : "border-transparent bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]"
          : "border-[var(--ops-line)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)]",
      )}
    >
      <Icon size={14} stroke={2.5} aria-hidden />
      {kind === "present" ? "Present" : "Absent"}
    </button>
  );
}

/** tel: link. Filled while the athlete still needs chasing (unmarked or absent). */
function CallButton({ name, phone, urgent }: { name: string; phone: string | null; urgent: boolean }) {
  const box = "grid size-8 shrink-0 place-items-center rounded-full border";
  if (!phone) {
    return (
      <Tooltip title="No phone saved">
        <span className={cn(box, "border-[var(--ops-line)] text-[var(--ops-text-muted)] opacity-50")} aria-label={`No phone saved for ${name}`}>
          <IconPhoneOff size={16} aria-hidden />
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={phone}>
      <a
        href={`tel:${phone.replace(/[^\d+]/g, "")}`}
        aria-label={`Call ${name}, ${phone}`}
        className={cn(
          box,
          urgent
            ? "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]"
            : "border-[var(--ops-line)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)]",
        )}
      >
        <IconPhone size={16} aria-hidden />
      </a>
    </Tooltip>
  );
}

function unitVisible(unit: CallRoomUnit, query: string): boolean {
  if (!query.trim()) return true;
  if (matchesQuery(query, unit.name, unit.detail, unit.lane ? String(unit.lane) : null)) return true;
  return unit.members.some((member) => matchesQuery(query, member.name));
}

function filterUnit(unit: CallRoomUnit, query: string): CallRoomUnit {
  if (!query.trim() || unit.kind === "athlete") return unit;
  if (matchesQuery(query, unit.name, unit.detail)) return unit;
  return { ...unit, members: unit.members.filter((member) => matchesQuery(query, member.name)) };
}

/** Team row on top, its players under it (open: the desk checks each player). */
function TeamBlock({
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
  const inCount = unit.members.filter((member) => member.effective === "present").length;
  const players = `${unit.members.length} ${unit.members.length === 1 ? "player" : "players"} · ${inCount} in`;
  return (
    <li className={cn("overflow-hidden rounded-xl border bg-[var(--ops-surface)]", ROW_TONE[unit.mark])}>
      <RosterRow
        badge={String(unit.lane ?? index + 1)}
        badgeLabel={unit.lane ? `Lane ${unit.lane}` : `Team ${index + 1}`}
        name={unit.name}
        detail={unit.detail ? `${players} · ${unit.detail}` : players}
        mark={unit.mark}
        disabled={disabled}
        onPick={onUnit}
      />
      {unit.members.length > 0 ? (
        <details open className="border-t border-[var(--ops-line)]">
          <summary className="flex h-8 cursor-pointer items-center px-3 text-xs leading-4 font-medium tracking-[0.5px] text-[var(--ops-text-muted)] uppercase">
            Players
          </summary>
          <ul className="divide-y divide-[var(--ops-line)] border-t border-[var(--ops-line)]">
            {unit.members.map((member) => (
              <li key={member.id}>
                <RosterRow
                  name={member.name}
                  detail={teamOut && member.mark !== "absent" ? "Out with the team" : null}
                  mark={member.effective}
                  disabled={disabled}
                  phone={member.phone}
                  onPick={(mark) => onMember(member.id, mark)}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}
