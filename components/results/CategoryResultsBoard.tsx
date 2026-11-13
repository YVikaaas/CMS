"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, FixtureMatch, FixtureRoundType } from "@/lib/types/cms";
import { KnockoutResultsBoard } from "./KnockoutResultsBoard";
import { LeagueResultsBoard } from "./LeagueResultsBoard";
import { ResultsPhaseTabs } from "./ResultsPhaseTabs";
import { sortRoundTypesPresent } from "@/lib/utils/resultsBoard";
import { roundLabel } from "@/lib/utils/fixtures";

export function CategoryResultsBoard({
  fixture,
  matches,
  orgByTeamId,
  showTitle,
}: {
  fixture: Fixture;
  matches: FixtureMatch[];
  orgByTeamId: Record<string, string | null>;
  showTitle?: boolean;
}) {
  const rounds = useMemo(
    () => sortRoundTypesPresent(matches.map((row) => row.roundType)),
    [matches],
  );
  const [round, setRound] = useState<FixtureRoundType | "">(rounds[0] ?? "");

  useEffect(() => {
    if (rounds.length === 0) {
      setRound("");
      return;
    }
    if (!round || !rounds.includes(round)) setRound(rounds[0]!);
  }, [round, rounds]);

  const roundMatches = useMemo(
    () => matches.filter((row) => row.roundType === round),
    [matches, round],
  );

  if (matches.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      {showTitle ? (
        <div>
          <p className="text-[11px] font-extrabold tracking-wide text-[var(--ops-text-muted)] uppercase">
            {fixture.sportName}
          </p>
          <h2 className="text-base font-semibold">{fixture.categoryLabel}</h2>
        </div>
      ) : null}
      <ResultsPhaseTabs
        ariaLabel="Rounds"
        tabs={rounds.map((type) => ({ id: type, label: roundLabel(type) }))}
        value={round || rounds[0]!}
        onChange={setRound}
      />
      {round === "league" ? (
        <LeagueResultsBoard matches={roundMatches} orgByTeamId={orgByTeamId} />
      ) : (
        <KnockoutResultsBoard matches={roundMatches} orgByTeamId={orgByTeamId} />
      )}
    </section>
  );
}
