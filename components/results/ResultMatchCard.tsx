"use client";

import { Trophy } from "lucide-react";
import type { FixtureMatch, FixtureParticipantResult } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";
import {
  formatMatchId,
  formatMatchWhen,
  isResultScoreVisible,
} from "@/lib/utils/resultsBoard";
import { sidePoints } from "@/lib/utils/fixtures";

function TeamRow({
  name,
  org,
  result,
  points,
  scoreVisible,
  compact,
}: {
  name: string;
  org?: string | null;
  result: FixtureParticipantResult;
  points: number | null;
  scoreVisible: boolean;
  compact?: boolean;
}) {
  const empty = !name.trim();
  const winner = result === "winner";
  const bye = result === "bye";
  return (
    <div
      className={cn(
        "grid min-h-[3.25rem] grid-cols-[1fr_auto] items-center gap-3 px-3 py-2",
        winner && scoreVisible && !bye && "bg-emerald-500/[0.06]",
        compact && winner && scoreVisible && !bye && "rounded-lg ring-1 ring-emerald-500/25",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "truncate text-[12px] font-bold leading-tight",
              empty ? "text-[var(--ops-text-muted)] uppercase tracking-wide" : "text-[var(--ops-text)]",
            )}
          >
            {empty ? "TBD" : name}
          </p>
          {bye && scoreVisible ? (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-amber-700 uppercase ring-1 ring-amber-500/40">
              Bye
            </span>
          ) : (
            winner &&
            scoreVisible && <Trophy size={14} className="mt-0.5 shrink-0 text-amber-500" aria-label="Winner" />
          )}
        </div>
        {org ? <p className="truncate text-[10px] font-semibold text-[var(--ops-text-muted)]">{org}</p> : null}
      </div>
      <div className="flex w-[4.5rem] shrink-0 flex-col items-end justify-center border-l-2 border-[var(--ops-line)] pl-3">
        {scoreVisible && !bye ? (
          <span className="font-mono text-[16px] font-bold tabular-nums leading-none text-[var(--ops-text)]">
            {sidePoints(points)}
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-[var(--ops-text-muted)]">—</span>
        )}
      </div>
    </div>
  );
}

export function ResultMatchCard({
  match,
  orgByTeamId,
  variant = "league",
}: {
  match: FixtureMatch;
  orgByTeamId: Record<string, string | null>;
  variant?: "league" | "bracket";
}) {
  const scoreVisible = isResultScoreVisible(match.status);
  const live = match.status === "in_progress";

  return (
    <article
      className={cn(
        "flex min-h-[7.5rem] flex-col overflow-hidden bg-white",
        variant === "league"
          ? "rounded-sm border-2 border-[var(--ops-line)]"
          : "h-full rounded-xl border border-[var(--ops-line)] shadow-[var(--ops-shadow-card)]",
      )}
    >
      <header
        className={cn(
          "flex items-center gap-2 border-b-2 border-[var(--ops-line)] bg-[var(--ops-board-muted)] px-3 py-2",
          variant === "bracket" && "min-h-11 border-b",
        )}
      >
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums ring-1 ring-[var(--ops-line)]">
          {formatMatchId(match.matchLabel, match.matchNumber)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[var(--ops-text-muted)]">
          {formatMatchWhen(match.scheduledAt)}
        </span>
        {live ? (
          <span className="rounded-full bg-[var(--ops-success-soft)] px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-[var(--ops-success)] uppercase">
            Live
          </span>
        ) : null}
      </header>
      <div className="flex flex-1 flex-col divide-y-2 divide-[var(--ops-line)]">
        <TeamRow
          name={match.team1Name}
          org={orgByTeamId[match.team1Id]}
          result={match.team1ResultStatus}
          points={match.team1Points}
          scoreVisible={scoreVisible}
          compact={variant === "bracket"}
        />
        <TeamRow
          name={match.team2Name}
          org={orgByTeamId[match.team2Id]}
          result={match.team2ResultStatus}
          points={match.team2Points}
          scoreVisible={scoreVisible}
          compact={variant === "bracket"}
        />
      </div>
    </article>
  );
}
