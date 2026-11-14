"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ScoreAthleticsBoard } from "@/components/athletics/ScoreAthleticsBoard";
import { FixtureRankingBoard } from "@/components/results/FixtureRankingBoard";
import { ScoreMatchBoard } from "@/components/ScoreMatchBoard";
import {
  ChipFilter,
  EmptyState,
  EventFilters,
  PageHeader,
  SoftButton,
  SoftCard,
  SplitWorkspace,
  StatusBadge,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { listChampionshipMatches, listFixtures } from "@/lib/services";
import type { Fixture, FixtureMatch, Sport } from "@/lib/types/cms";
import {
  emptyEventFilter,
  isEventFilterComplete,
  matchPassesEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import { heatQueueHint, heatQueueTitle, isHeatMatch } from "@/lib/utils/athletics";
import { displayScore, uniqueRoundLabelsInOrder } from "@/lib/utils/fixtures";

const RANKING_TAB = "ranking";

function statusTone(status: FixtureMatch["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "in_progress") return "warning" as const;
  if (status === "cancelled" || status === "no_show") return "danger" as const;
  if (status === "scheduled") return "primary" as const;
  return "neutral" as const;
}

function ScoringDesk() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchQuery = searchParams.get("match");
  const { selected, loading } = useChampionship();
  const [filter, setFilter] = useState<EventFilterValue | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [ready, setReady] = useState(false);
  const [roundLabel, setRoundLabel] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matchQuery);
  const [playerPane, setPlayerPane] = useState(false);

  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const filtersReady = isEventFilterComplete(activeFilter);

  const load = useCallback(async () => {
    if (!selected) {
      setMatches([]);
      setFixtures([]);
      setReady(true);
      return;
    }
    const [matchRes, fixtureRes] = await Promise.all([
      listChampionshipMatches(selected.id),
      listFixtures(selected.id),
    ]);
    if (matchRes.error) toast.error(matchRes.error.message);
    if (fixtureRes.error) toast.error(fixtureRes.error.message);
    setMatches(matchRes.data ?? []);
    setFixtures(fixtureRes.data ?? []);
    setReady(true);
  }, [selected]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  useEffect(() => {
    if (matchQuery) setSelectedMatchId(matchQuery);
  }, [matchQuery]);

  const categoryMatches = useMemo(() => {
    return matches.filter((row) => {
      if (row.status === "cancelled") return false;
      return matchPassesEventFilter(row, activeFilter, sport?.name);
    });
  }, [activeFilter, sport, matches]);

  const fixture = useMemo(() => {
    if (!filtersReady) return null;
    return (
      fixtures.find(
        (row) =>
          row.sportId === activeFilter.sportId && row.categoryId === activeFilter.categoryId,
      ) ?? null
    );
  }, [activeFilter.categoryId, activeFilter.sportId, filtersReady, fixtures]);

  const rounds = useMemo(() => uniqueRoundLabelsInOrder(categoryMatches), [categoryMatches]);

  const roundTabs = useMemo(
    () => [
      ...rounds.map((label) => ({ value: label, label })),
      ...(fixture ? [{ value: RANKING_TAB, label: "Ranking" }] : []),
    ],
    [fixture, rounds],
  );

  useEffect(() => {
    const allowed = roundTabs.map((item) => item.value);
    if (allowed.length === 0) {
      setRoundLabel("");
      return;
    }
    if (!roundLabel || !allowed.includes(roundLabel)) setRoundLabel(allowed[0]!);
  }, [roundLabel, roundTabs]);

  const queue = useMemo(
    () => categoryMatches.filter((row) => row.roundLabel === roundLabel),
    [categoryMatches, roundLabel],
  );

  const selectedMatch = queue.find((row) => row.id === selectedMatchId) ?? categoryMatches.find((row) => row.id === selectedMatchId) ?? null;

  if (loading || !ready) {
    return <p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>;
  }
  if (!selected) {
    return (
      <EmptyState
        title="Select a championship"
        action={
          <Link href="/championships">
            <SoftButton variant="primary">Championships</SoftButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Scoring" hint="Pick sport, gender, age, then category. Then pick a round, a match, or ranking." />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value, meta) => {
          setFilter({ ...value });
          setSport(meta.sport);
        }}
      />
      {!filtersReady ? (
        <EmptyState title="Pick sport, gender, age, then category" hint="The scoreboard waits until the category name is selected." />
      ) : fixtures.length === 0 && matches.length === 0 ? (
        <EmptyState title="No matches yet" hint="Create a draw first." />
      ) : !fixture ? (
        <EmptyState title="No matches for this filter" hint="Try another sport / gender / age / category." />
      ) : (
        <>
      {roundTabs.length > 0 ? (
        <ChipFilter
          ariaLabel="Rounds"
          showAll={false}
          allowEmpty={false}
          value={roundLabel}
          onChange={(value) => {
            if (value) setRoundLabel(value);
          }}
          options={roundTabs}
          gapBefore={RANKING_TAB}
        />
      ) : null}
      {roundLabel === RANKING_TAB ? (
        <SoftCard>
          <FixtureRankingBoard fixture={fixture} onChanged={() => void load()} />
        </SoftCard>
      ) : (
      <SplitWorkspace
            splitAt="md"
            queue={
              <>
                <p className="text-sm font-semibold">
                  {queue.some((row) => isHeatMatch(row)) ? "Heats" : "Matches"}
                </p>
                {queue.length === 0 ? (
                  <p className="text-sm text-[var(--ops-text-muted)]">No matches for this filter.</p>
                ) : (
                  queue.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setSelectedMatchId(row.id);
                        setPlayerPane(false);
                        router.replace(`/gameplay/scoring?match=${row.id}`);
                      }}
                      className={`rounded-xl border px-3 py-3 text-left ${
                        selectedMatchId === row.id
                          ? "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)]"
                          : "border-[var(--ops-line)] bg-white hover:bg-[var(--ops-board-muted)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">
                          {isHeatMatch(row)
                            ? heatQueueTitle(row)
                            : `${row.team1Name} vs ${row.team2Name}`}
                        </p>
                        <StatusBadge tone={statusTone(row.status)}>
                          {row.status.replace("_", " ")}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                        {isHeatMatch(row) ? heatQueueHint(row) : displayScore(row)}
                      </p>
                    </button>
                  ))
                )}
              </>
            }
            board={
              selectedMatch ? (
                <SoftCard>
                  {isHeatMatch(selectedMatch) ? (
                    <ScoreAthleticsBoard
                      key={selectedMatch.id}
                      match={selectedMatch}
                      onSaved={() => void load()}
                    />
                  ) : (
                    <ScoreMatchBoard
                      key={selectedMatch.id}
                      match={selectedMatch}
                      initialPane={playerPane ? "players" : "score"}
                      onSaved={() => void load()}
                    />
                  )}
                </SoftCard>
              ) : (
                <EmptyState title="Select a match" hint="The scoreboard opens here." />
              )
            }
          />
      )}
        </>
      )}
    </div>
  );
}

export default function ScoringPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>}>
      <ScoringDesk />
    </Suspense>
  );
}
