"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fieldClass, fieldErrorClass } from "@/components/Modal";
import { SoftButton, SoftSelect, StickyActionBar } from "@/components/ops";
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
      <span className="text-[10px] font-semibold text-[var(--ops-text-muted)]">{index + 1}</span>
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
            ? "border-[var(--ops-danger)] bg-[var(--ops-danger)] text-white"
            : "border-[var(--ops-line)] bg-white text-[var(--ops-text)] hover:bg-[var(--ops-danger-soft)]",
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
    <div className="grid gap-4">
      <div>
        <p className="text-sm font-semibold">{match.matchLabel || (track ? "Heat" : "Flight")}</p>
        <p className="text-xs text-[var(--ops-text-muted)]">
          {track
            ? "Pick minutes, seconds and milliseconds (two places). Time is saved in seconds."
            : `Best mark from ${match.attemptCount} attempts. Tap Foul for a failed attempt (shown as X). NM if every attempt is a foul.`}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--ops-line)]">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Ln</th>
              <th className="px-3 py-2 font-medium">{relay ? "Team" : "Athlete"}</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">{track ? "Time" : "Mark"}</th>
              {track ? null : <th className="px-3 py-2 font-medium">Attempts</th>}
              {finalRound ? null : <th className="px-3 py-2 font-medium">Q</th>}
              <th className="px-3 py-2 font-medium">Place</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const athlete = match.participants.find((item) => item.id === row.participantId);
              const invalid = Boolean(fieldErrors[row.participantId]);
              return (
                <tr key={row.participantId} className="border-t border-[var(--ops-line)]">
                  <td className="px-3 py-2 font-mono text-xs">{athlete?.lane ?? index + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{athlete?.name ?? (relay ? "Team" : "Athlete")}</p>
                    {orgCityLine(athlete?.orgName, athlete?.city) ? (
                      <p className="text-[11px] text-[var(--ops-text-muted)]">
                        {orgCityLine(athlete?.orgName, athlete?.city)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <SoftSelect
                      value={row.resultCode}
                      onChange={(event) =>
                        patch(row.participantId, {
                          resultCode: event.target.value as AthleticsResultCode,
                        })
                      }
                      className={fieldClass}
                    >
                      {ATHLETICS_RESULT_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code.toUpperCase()}
                        </option>
                      ))}
                    </SoftSelect>
                  </td>
                  <td className="px-3 py-2">
                    {track ? (
                      <TimePartsInput
                        value={row.time}
                        disabled={row.resultCode !== "ok"}
                        invalid={invalid}
                        onChange={(time) => patch(row.participantId, { time })}
                      />
                    ) : (
                      <input
                        value={
                          bestFieldMark(row.attempts) != null
                            ? formatMark(bestFieldMark(row.attempts), "").trim()
                            : row.mark
                        }
                        readOnly
                        className={invalid ? fieldErrorClass : fieldClass}
                      />
                    )}
                  </td>
                  {track ? null : (
                    <td className="px-3 py-2">
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
                    </td>
                  )}
                  {finalRound ? null : (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.qualified}
                        onChange={(event) =>
                          patch(row.participantId, { qualified: event.target.checked })
                        }
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 font-mono">{ranked[index] ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
