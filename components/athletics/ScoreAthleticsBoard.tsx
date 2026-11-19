"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fieldClass, fieldErrorClass } from "@/components/Modal";
import { SoftButton, SoftSelect, StatusBadge, StickyActionBar } from "@/components/ops";
import { TimePartsInput } from "@/components/athletics/TimePartsInput";
import { saveHeatScore } from "@/lib/services";
import type { AthleticsResultCode, FieldAttempt, FixtureMatch } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";
import { orgCityLine } from "@/lib/utils/labels";
import {
  ATHLETICS_RESULT_CODES,
  bestFieldMark,
  fieldAttemptNotation,
  fieldAttemptSlots,
  fieldAttemptsAreNoMark,
  formatMark,
  padFieldAttempts,
  isRelayEvent,
  parseMarkInput,
  rankAthletics,
  sanitizeMarkInput,
  trackTimePartsFromMs,
  trackTimePartsToMs,
  type TrackTimeParts,
} from "@/lib/utils/athletics";
import { categoryNameFromLabel } from "@/lib/utils/labels";

type RowState = {
  participantId: string;
  resultCode: AthleticsResultCode;
  time: TrackTimeParts;
  mark: string;
  qualified: boolean;
  attempts: FieldAttempt[];
  attemptInputs: string[];
};

function attemptDraft(attempt: FieldAttempt): string {
  if (attempt.status === "foul" || attempt.status === "pass") return fieldAttemptNotation(attempt);
  if (attempt.mark == null) return "";
  return formatMark(attempt.mark, "").trim();
}

function AttemptSlot({
  attempt,
  text,
  index,
  disabled,
  onChange,
}: {
  attempt: FieldAttempt;
  text: string;
  index: number;
  disabled: boolean;
  onChange: (next: FieldAttempt, nextText: string) => void;
}) {
  const fouled = attempt.status === "foul";
  const passed = attempt.status === "pass";
  return (
    <div className="flex w-20 flex-col gap-1">
      <span className="text-xs font-semibold text-[var(--ops-text-muted)]">{index + 1}</span>
      <input
        value={text}
        placeholder="0.00"
        inputMode="decimal"
        disabled={disabled}
        readOnly={fouled || passed}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (/^(x|foul)$/i.test(raw)) {
            onChange({ mark: null, status: "foul" }, "X");
            return;
          }
          const cleaned = sanitizeMarkInput(event.target.value);
          onChange(
            {
              mark: parseMarkInput(cleaned),
              status: "ok",
            },
            cleaned,
          );
        }}
        className={cn(
          "ops-control w-full px-1 text-center text-sm",
          fouled &&
            "border-[var(--ops-danger)] bg-[var(--ops-danger-soft)] font-semibold text-[var(--ops-danger)]",
          passed && "bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]",
        )}
      />
      <button
        type="button"
        disabled={disabled}
        aria-pressed={fouled}
        onClick={() =>
          onChange(
            fouled ? { mark: null, status: "ok" } : { mark: null, status: "foul" },
            fouled ? "" : "X",
          )
        }
        className={cn(
          "min-h-9 rounded-lg border px-2 text-xs font-semibold",
          fouled
            ? "border-[var(--ops-danger)] bg-[var(--ops-danger)] text-[var(--ops-on-primary)]"
            : "border-[var(--ops-line-strong)] bg-[var(--ops-surface-raised)] text-[var(--ops-text)] hover:bg-[var(--ops-danger-soft)]",
          disabled && "opacity-45",
        )}
      >
        Foul
      </button>
    </div>
  );
}

function rowFromMatch(match: FixtureMatch): RowState[] {
  const field = match.formatType === "field_attempts";
  const slots = fieldAttemptSlots(match);
  return match.participants.map((row) => {
    const attempts = field ? padFieldAttempts(row.attempts, slots) : [];
    return {
      participantId: row.id,
      resultCode: row.resultCode,
      time: trackTimePartsFromMs(row.timeMs),
      mark: row.mark == null ? "" : String(row.mark),
      qualified: row.qualified,
      attempts,
      attemptInputs: attempts.map(attemptDraft),
    };
  });
}

export function ScoreAthleticsBoard({
  match,
  onSaved,
}: {
  match: FixtureMatch;
  onSaved: () => void;
}) {
  const track = match.formatType === "track_rounds";
  const relay = isRelayEvent(categoryNameFromLabel(match.categoryLabel));
  const finalRound = match.roundType === "final";
  const [rows, setRows] = useState<RowState[]>(() => rowFromMatch(match));
  const [saving, setSaving] = useState<"progress" | "complete" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    setRows(rowFromMatch(match));
    setFieldErrors({});
  }, [match.id]);

  const style = track ? "time" : "distance";
  const ranked = useMemo(
    () =>
      rankAthletics(
        rows.map((row) => ({
          resultCode: row.resultCode,
          timeMs: trackTimePartsToMs(row.time),
          mark: track ? null : bestFieldMark(row.attempts) ?? parseMarkInput(row.mark),
        })),
        style,
      ),
    [rows, style, track],
  );

  const patch = (participantId: string, next: Partial<RowState>) => {
    setRows((current) =>
      current.map((row) => (row.participantId === participantId ? { ...row, ...next } : row)),
    );
    setFieldErrors((current) => ({ ...current, [participantId]: undefined }));
  };

  const submit = async (complete: boolean) => {
    const nextErrors: Record<string, string> = {};
    const anyQualified = rows.some((row) => row.qualified);
    const payload = rows.map((row) => {
      const timeMs = trackTimePartsToMs(row.time);
      const mark = track ? null : bestFieldMark(row.attempts) ?? parseMarkInput(row.mark);
      if (complete && row.resultCode === "ok" && track && timeMs == null) {
        nextErrors[row.participantId] = "Required";
      }
      const noMark = !track && mark == null && fieldAttemptsAreNoMark(row.attempts);
      if (complete && row.resultCode === "ok" && !track && mark == null && !noMark) {
        nextErrors[row.participantId] = "Required";
      }
      if (track && (row.time.minutes || row.time.seconds || row.time.milliseconds) && timeMs == null) {
        nextErrors[row.participantId] = "Invalid";
      }
      if (row.mark && !track && mark == null) nextErrors[row.participantId] = "Invalid";
      const unfinished = row.attemptInputs.some(
        (text, index) =>
          text.includes(".") &&
          row.attempts[index]?.status === "ok" &&
          row.attempts[index]?.mark == null,
      );
      if (complete && !track && unfinished) nextErrors[row.participantId] = "Invalid";
      return {
        participantId: row.participantId,
        resultCode: noMark && row.resultCode === "ok" ? "nm" : row.resultCode,
        timeMs,
        mark,
        unit: "m",
        attempts: row.attempts,
        qualified: finalRound ? false : anyQualified ? row.qualified : undefined,
      };
    });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(complete ? "complete" : "progress");
    const result = await saveHeatScore({ matchId: match.id, complete, rows: payload });
    setSaving(null);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(complete ? "Heat completed." : "Progress saved.");
    if (result.data) setRows(rowFromMatch(result.data));
    onSaved();
  };

  return (
    <div className="grid gap-3">
      {/* event, heat and status are already in the page header; keep only how to enter results */}
      <p className="text-sm text-[var(--ops-text-muted)]">
        {track
          ? "Enter minutes, seconds and milliseconds. Time is saved in seconds."
          : `Best mark from ${match.attemptCount} attempts. Foul is X. NM if every attempt is a foul.`}
      </p>
      {/* one card per athlete: fields stack on a phone, line up in columns from md */}
      <ol className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const athlete = match.participants.find((item) => item.id === row.participantId);
          const invalid = Boolean(fieldErrors[row.participantId]);
          const place = ranked[index];
          return (
            <li
              key={row.participantId}
              className={cn(
                "grid gap-2 rounded-xl border bg-[var(--ops-surface)] p-2.5 md:items-center",
                track
                  ? finalRound
                    ? "md:grid-cols-[2.5rem_minmax(8rem,1fr)_6.5rem_auto_2.5rem]"
                    : "md:grid-cols-[2.5rem_minmax(8rem,1fr)_6.5rem_auto_auto_2.5rem]"
                  : finalRound
                    ? "md:grid-cols-[2.5rem_minmax(8rem,1fr)_6.5rem_5.5rem_auto_2.5rem]"
                    : "md:grid-cols-[2.5rem_minmax(8rem,1fr)_6.5rem_5.5rem_auto_auto_2.5rem]",
                invalid ? "border-[var(--ops-danger)]" : "border-[var(--ops-line)]",
              )}
            >
              <div className="flex items-center gap-3 md:contents">
                <span
                  aria-label={`Lane ${athlete?.lane ?? index + 1}`}
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--ops-board-muted)] text-base leading-5 font-medium tabular-nums"
                >
                  {athlete?.lane ?? index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-5 font-medium">{athlete?.name ?? (relay ? "Team" : "Athlete")}</p>
                  {orgCityLine(athlete?.orgName, athlete?.city) ? (
                    <p className="truncate text-sm text-[var(--ops-text-muted)]">{orgCityLine(athlete?.orgName, athlete?.city)}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm leading-5 font-medium tabular-nums md:hidden",
                    place != null ? "bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]" : "text-[var(--ops-text-muted)]",
                  )}
                  aria-label={`Place ${place ?? "none"}`}
                >
                  {place ?? "—"}
                </span>
              </div>
              <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--ops-text-muted)]">
                <span className="md:sr-only">Status</span>
                <SoftSelect
                  value={row.resultCode}
                  onChange={(event) =>
                    patch(row.participantId, {
                      resultCode: event.target.value as AthleticsResultCode,
                    })
                  }
                  aria-label={`Status for ${athlete?.name ?? "athlete"}`}
                  className={fieldClass}
                >
                  {ATHLETICS_RESULT_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code.toUpperCase()}
                    </option>
                  ))}
                </SoftSelect>
              </label>
              <div className="flex flex-col gap-1 text-xs font-semibold text-[var(--ops-text-muted)]">
                <span className="md:sr-only">{track ? "Time" : "Best mark"}</span>
                {track ? (
                  <TimePartsInput
                    value={row.time}
                    disabled={row.resultCode !== "ok"}
                    invalid={invalid}
                    onChange={(time) => patch(row.participantId, { time })}
                  />
                ) : (
                  <input
                    aria-label={`Best mark for ${athlete?.name ?? "athlete"}`}
                    value={
                      bestFieldMark(row.attempts) != null
                        ? formatMark(bestFieldMark(row.attempts), "").trim()
                        : row.mark
                    }
                    readOnly
                    className={invalid ? fieldErrorClass : fieldClass}
                  />
                )}
              </div>
              {track ? null : (
                <div className="flex flex-col gap-1 text-xs font-semibold text-[var(--ops-text-muted)]">
                  <span className="md:sr-only">Attempts</span>
                  <div className="flex flex-wrap gap-2">
                    {row.attempts.map((attempt, attemptIndex) => (
                      <AttemptSlot
                        key={attemptIndex}
                        attempt={attempt}
                        text={row.attemptInputs[attemptIndex] ?? ""}
                        index={attemptIndex}
                        disabled={row.resultCode !== "ok"}
                        onChange={(nextAttempt, nextText) => {
                          const next = [...row.attempts];
                          const texts = [...row.attemptInputs];
                          next[attemptIndex] = nextAttempt;
                          texts[attemptIndex] = nextText;
                          patch(row.participantId, { attempts: next, attemptInputs: texts });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {finalRound ? null : (
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--ops-line-strong)] px-3 text-sm leading-5 font-medium has-[:checked]:border-[var(--ops-primary)] has-[:checked]:bg-[var(--ops-primary-soft)]">
                  <input
                    type="checkbox"
                    checked={row.qualified}
                    onChange={(event) => patch(row.participantId, { qualified: event.target.checked })}
                    className="size-5 accent-[var(--ops-primary)]"
                  />
                  Qualified
                </label>
              )}
              <span className="hidden text-center font-mono text-sm leading-5 font-medium md:block" aria-label={`Place ${place ?? "none"}`}>
                {place ?? "—"}
              </span>
            </li>
          );
        })}
      </ol>
      <StickyActionBar>
        <SoftButton disabled={Boolean(saving)} onClick={() => void submit(false)}>
          {saving === "progress" ? "Saving…" : "Save progress"}
        </SoftButton>
        <SoftButton
          variant="primary"
          disabled={Boolean(saving)}
          onClick={() => void submit(true)}
        >
          {saving === "complete" ? "Saving…" : "Complete"}
        </SoftButton>
      </StickyActionBar>
    </div>
  );
}
