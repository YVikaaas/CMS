"use client";

import { useMemo } from "react";
import type { FixtureMatch } from "@/lib/types/cms";
import { ResultMatchCard } from "./ResultMatchCard";
import { sortKnockoutMatches } from "@/lib/utils/resultsBoard";

export function LeagueResultsBoard({
  matches,
  orgByTeamId,
}: {
  matches: FixtureMatch[];
  orgByTeamId: Record<string, string | null>;
}) {
  const visible = useMemo(() => sortKnockoutMatches(matches), [matches]);

  if (visible.length === 0) {
    return <p className="py-8 text-center text-xs font-semibold text-[var(--ops-text-muted)]">No league matches yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((match) => (
        <ResultMatchCard key={match.id} match={match} orgByTeamId={orgByTeamId} />
      ))}
    </div>
  );
}
