"use client";

import type { FixtureMatch, HeatParticipant } from "@/lib/types/cms";
import { displayAthleticsMark, heatQueueTitle, isRelayEvent } from "@/lib/utils/athletics";
import { categoryNameFromLabel, orgCityLine } from "@/lib/utils/labels";
import { isResultScoreVisible } from "@/lib/utils/resultsBoard";
import { StatusBadge } from "@/components/ops";

function placeText(row: HeatParticipant): string {
  if (row.place != null) return String(row.place);
  return "—";
}

function HeatTable({
  match,
}: {
  match: FixtureMatch;
}) {
  const visible = isResultScoreVisible(match.status);
  const athletes = [...match.participants].sort((a, b) => {
    if (a.place != null && b.place != null) return a.place - b.place;
    if (a.place != null) return -1;
    if (b.place != null) return 1;
    return a.lane - b.lane;
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-surface)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ops-line)] px-4 py-3">
        <div>
          <p className="font-semibold">{heatQueueTitle(match)}</p>
          {match.venue ? (
            <p className="text-xs text-[var(--ops-text-muted)]">{match.venue}</p>
          ) : null}
        </div>
        <StatusBadge
          tone={
            match.status === "completed"
              ? "success"
              : match.status === "in_progress"
                ? "warning"
                : "neutral"
          }
        >
          {match.status.replace("_", " ")}
        </StatusBadge>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]">
          <tr>
            <th className="px-4 py-2 font-medium">Place</th>
            <th className="px-4 py-2 font-medium">Ln</th>
            <th className="px-4 py-2 font-medium">
              {isRelayEvent(categoryNameFromLabel(match.categoryLabel)) ? "Team" : "Athlete"}
            </th>
            <th className="px-4 py-2 font-medium">
              {match.formatType === "track_rounds" ? "Time" : "Mark"}
            </th>
            <th className="px-4 py-2 font-medium">Q</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((row) => (
            <tr key={row.id} className="border-t border-[var(--ops-line)]">
              <td className="px-4 py-2 font-mono font-semibold">{visible ? placeText(row) : "—"}</td>
              <td className="px-4 py-2 font-mono text-xs">{row.lane || "—"}</td>
              <td className="px-4 py-2">
                <p className="font-medium">{row.name}</p>
                {orgCityLine(row.orgName, row.city) ? (
                  <p className="text-[11px] text-[var(--ops-text-muted)]">
                    {orgCityLine(row.orgName, row.city)}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-2 font-mono">
                {visible ? displayAthleticsMark(row) : "—"}
              </td>
              <td className="px-4 py-2 text-xs font-semibold uppercase">
                {visible && row.qualified ? "Q" : ""}
              </td>
            </tr>
          ))}
          {athletes.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-[var(--ops-text-muted)]">
                {isRelayEvent(categoryNameFromLabel(match.categoryLabel))
                  ? "No teams in this heat."
                  : "No athletes in this heat."}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function AthleticsResultsBoard({ matches }: { matches: FixtureMatch[] }) {
  const heats = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
  if (heats.length === 0) {
    return <p className="text-sm text-[var(--ops-text-muted)]">No heats in this round.</p>;
  }
  return (
    <div className="grid gap-4">
      {heats.map((match) => (
        <HeatTable key={match.id} match={match} />
      ))}
    </div>
  );
}
