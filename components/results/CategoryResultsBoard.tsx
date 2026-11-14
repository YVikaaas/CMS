"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, FixtureMatch, FixtureRoundType } from "@/lib/types/cms";
import { AthleticsResultsBoard } from "./AthleticsResultsBoard";
import { FixtureRankingBoard } from "./FixtureRankingBoard";
import { KnockoutResultsBoard } from "./KnockoutResultsBoard";
import { LeagueResultsBoard } from "./LeagueResultsBoard";
import { ResultsPhaseTabs } from "./ResultsPhaseTabs";
import { sortRoundTypesPresent } from "@/lib/utils/resultsBoard";
import { isAthleticsFormat } from "@/lib/utils/athletics";
import { roundLabel } from "@/lib/utils/fixtures";

type ResultsTab = FixtureRoundType | "ranking";

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
  const tabs = useMemo(
    () => [
      ...rounds.map((type) => ({ id: type as ResultsTab, label: roundLabel(type) })),
      { id: "ranking" as const, label: "Ranking" },
    ],
    [rounds],
  );
  const [tab, setTab] = useState<ResultsTab>(rounds[0] ?? "ranking");

  useEffect(() => {
    const allowed = tabs.map((item) => item.id);
    if (!allowed.includes(tab)) setTab(allowed[0] ?? "ranking");
  }, [tab, tabs]);

  const roundMatches = useMemo(
    () => (tab === "ranking" ? [] : matches.filter((row) => row.roundType === tab)),
    [matches, tab],
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
      <ResultsPhaseTabs ariaLabel="Rounds" tabs={tabs} value={tab} onChange={setTab} />
      {tab === "ranking" ? (
        <FixtureRankingBoard fixture={fixture} readOnly />
      ) : isAthleticsFormat(fixture.formatType) ? (
        <AthleticsResultsBoard matches={roundMatches} />
      ) : tab === "league" ? (
        <LeagueResultsBoard matches={roundMatches} orgByTeamId={orgByTeamId} />
      ) : (
        <KnockoutResultsBoard matches={roundMatches} orgByTeamId={orgByTeamId} />
      )}
    </section>
  );
}
