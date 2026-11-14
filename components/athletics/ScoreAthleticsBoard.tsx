"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fieldClass, fieldErrorClass } from "@/components/Modal";
import { SoftButton, SoftSelect, StickyActionBar } from "@/components/ops";
import { saveHeatScore } from "@/lib/services";
import type { AthleticsResultCode, FieldAttempt, FixtureMatch } from "@/lib/types/cms";
import { orgCityLine } from "@/lib/utils/labels";
import {
  ATHLETICS_RESULT_CODES,
  bestFieldMark,
  fieldAttemptSlots,
  formatMark,
  padFieldAttempts,
  formatTimeMs,
  isRelayEvent,
  parseMarkInput,
  parseTimeToMs,
  rankAthletics,
  sanitizeMarkInput,
  sanitizeTimeInput,
} from "@/lib/utils/athletics";
import { categoryNameFromLabel } from "@/lib/utils/labels";

type RowState = {
  participantId: string;
  resultCode: AthleticsResultCode;
  time: string;
  mark: string;
  qualified: boolean;
  attempts: FieldAttempt[];
};

function rowFromMatch(match: FixtureMatch): RowState[] {
  const field = match.formatType === "field_attempts";
  const slots = fieldAttemptSlots(match);
  return match.participants.map((row) => ({
    participantId: row.id,
    resultCode: row.resultCode,
    time: formatTimeMs(row.timeMs),
    mark: row.mark == null ? "" : String(row.mark),
    qualified: row.qualified,
    attempts: field ? padFieldAttempts(row.attempts, slots) : [],
  }));
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
          timeMs: parseTimeToMs(row.time),
          mark: track
            ? null
            : bestFieldMark(row.attempts) ?? parseMarkInput(row.mark),
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
      const timeMs = parseTimeToMs(row.time);
      const mark = track ? null : bestFieldMark(row.attempts) ?? parseMarkInput(row.mark);
      if (complete && row.resultCode === "ok" && track && timeMs == null) {
        nextErrors[row.participantId] = "Required";
      }
      if (complete && row.resultCode === "ok" && !track && mark == null) {
        nextErrors[row.participantId] = "Required";
      }
      if (row.time && track && timeMs == null) nextErrors[row.participantId] = "Invalid";
      if (row.mark && !track && mark == null) nextErrors[row.participantId] = "Invalid";
      return {
        participantId: row.participantId,
        resultCode: row.resultCode,
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
            ? "Times, DNS / DNF / DQ, then place."
            : `Best mark from ${match.attemptCount} attempts. NM / FOUL / DNS / DQ.`}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--ops-line)]">
        <table className="w-full min-w-[40rem] text-left text-sm">
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
                      <input
                        value={row.time}
                        placeholder="12.34"
                        disabled={row.resultCode !== "ok"}
                        onChange={(event) =>
                          patch(row.participantId, { time: sanitizeTimeInput(event.target.value) })
                        }
                        className={invalid ? fieldErrorClass : fieldClass}
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
                      <div className="flex flex-wrap gap-1">
                        {row.attempts.map((attempt, attemptIndex) => {
                          const label = String(attemptIndex + 1);
                          return (
                            <div key={attemptIndex} className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-semibold text-[var(--ops-text-muted)]">
                                {label}
                              </span>
                              <input
                                value={
                                  attempt.status === "foul"
                                    ? "X"
                                    : attempt.mark == null
                                      ? ""
                                      : String(attempt.mark)
                                }
                                placeholder={label}
                                disabled={row.resultCode !== "ok"}
                                onChange={(event) => {
                                  const raw = event.target.value;
                                  const next = [...row.attempts];
                                  if (raw.trim().toUpperCase() === "X") {
                                    next[attemptIndex] = { mark: null, status: "foul" };
                                  } else {
                                    const cleaned = sanitizeMarkInput(raw);
                                    next[attemptIndex] = {
                                      mark: cleaned ? parseMarkInput(cleaned) : null,
                                      status: "ok",
                                    };
                                  }
                                  patch(row.participantId, { attempts: next });
                                }}
                                className="w-16 rounded-lg border border-[var(--ops-line)] px-2 py-1 text-sm"
                              />
                            </div>
                          );
                        })}
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
