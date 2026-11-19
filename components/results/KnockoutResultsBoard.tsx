"use client";

import { useMemo } from "react";
import type { FixtureMatch, FixtureRoundType } from "@/lib/types/cms";
import { roundLabel, roundNumber } from "@/lib/utils/fixtures";
import { sortKnockoutMatches, sortRoundTypesPresent } from "@/lib/utils/resultsBoard";
import { ResultMatchCard } from "./ResultMatchCard";

export function KnockoutResultsBoard({
  matches,
  orgByTeamId,
}: {
  matches: FixtureMatch[];
  orgByTeamId: Record<string, string | null>;
}) {
  const rounds = useMemo(
    () => sortRoundTypesPresent(matches.map((row) => row.roundType)),
    [matches],
  );
  const matchesByRound = useMemo(() => {
    const map = {} as Record<FixtureRoundType, FixtureMatch[]>;
    for (const type of rounds) {
      map[type] = sortKnockoutMatches(matches.filter((row) => row.roundType === type));
    }
    return map;
  }, [matches, rounds]);

  if (matches.length === 0) {
    return <p className="py-6 text-center text-sm leading-5 text-[var(--ops-text-muted)]">No matches yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-wide uppercase">Matches and scores</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {rounds.map((type) => (
          <section key={type} className="flex w-[min(100%,18rem)] shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold tracking-wide uppercase">{roundLabel(type)}</h4>
              <span className="text-xs text-[var(--ops-text-muted)]">Round {roundNumber(type)}</span>
            </div>
            {(matchesByRound[type] ?? []).map((match) => (
              <ResultMatchCard key={match.id} match={match} orgByTeamId={orgByTeamId} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
