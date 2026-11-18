"use client";

import { IconTrophy } from "@tabler/icons-react";
import { StatusBadge } from "@/components/ops";
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
        winner && scoreVisible && !bye && "bg-[var(--ops-success-soft)]",
        compact && winner && scoreVisible && !bye && "rounded-lg",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm font-semibold leading-tight",
              empty ? "text-[var(--ops-text-muted)] uppercase tracking-wide" : "text-[var(--ops-text)]",
            )}
          >
            {empty ? "TBD" : name}
          </p>
          {bye && scoreVisible ? (
            <StatusBadge tone="warning">Bye</StatusBadge>
          ) : (
            winner &&
            scoreVisible && <IconTrophy size={14} className="mt-0.5 shrink-0 text-[var(--ops-success)]" aria-label="Winner" />
          )}
        </div>
        {org ? <p className="truncate text-xs text-[var(--ops-text-muted)]">{org}</p> : null}
      </div>
      <div className="flex w-[4.5rem] shrink-0 flex-col items-end justify-center border-l-2 border-[var(--ops-line)] pl-3">
        {scoreVisible && !bye ? (
          <span className="text-base font-semibold tabular-nums leading-none text-[var(--ops-text)]">
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
        "soft-card flex min-h-[7.5rem] flex-col overflow-hidden",
        variant === "bracket" && "h-full",
      )}
    >
      <header
        className={cn(
          "flex items-center gap-2 border-b border-[var(--ops-line)] bg-[var(--ops-board-muted)] px-3 py-2",
          variant === "bracket" && "min-h-11 border-b",
        )}
      >
        <span className="text-sm font-semibold tabular-nums">
          {formatMatchId(match.matchLabel, match.matchNumber)}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--ops-text-muted)]">
          {formatMatchWhen(match.scheduledAt)}
        </span>
        {live ? <StatusBadge tone="success">Live</StatusBadge> : null}
      </header>
      <div className="flex flex-1 flex-col divide-y divide-[var(--ops-line)]">
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
