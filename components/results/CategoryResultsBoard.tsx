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
}: {
  fixture: Fixture;
  matches: FixtureMatch[];
  orgByTeamId: Record<string, string | null>;
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
  const [teamRanking, setTeamRanking] = useState(false);
  const athletics = isAthleticsFormat(fixture.formatType);
  const teamKnockout = !athletics && rounds.some((type) => type !== "league");

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
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--ops-primary)] px-4 py-3 text-[var(--ops-on-primary)]">
        <p className="text-sm font-semibold">
          {fixture.sportName} · {fixture.categoryLabel}
        </p>
        {teamKnockout ? (
          <button
            type="button"
            onClick={() => setTeamRanking((current) => !current)}
            className="shrink-0 text-sm font-semibold"
          >
            {teamRanking ? "Matches" : "Final rankings"}
          </button>
        ) : null}
      </div>
      {teamKnockout ? (
        teamRanking ? (
          <FixtureRankingBoard fixture={fixture} readOnly />
        ) : (
          <KnockoutResultsBoard matches={matches} orgByTeamId={orgByTeamId} />
        )
      ) : (
        <>
          <ResultsPhaseTabs ariaLabel="Rounds" tabs={tabs} value={tab} onChange={setTab} />
          {tab === "ranking" ? (
            <FixtureRankingBoard fixture={fixture} readOnly />
          ) : athletics ? (
            <AthleticsResultsBoard matches={roundMatches} />
          ) : (
            <LeagueResultsBoard matches={roundMatches} orgByTeamId={orgByTeamId} />
          )}
        </>
      )}
    </section>
  );
}
