"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { listChampionshipMatches } from "@/lib/services";
import type { FixtureMatch, Sport } from "@/lib/types/cms";
import {
  emptyEventFilter,
  isEventFilterSelected,
  matchPassesEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import { displayScore } from "@/lib/utils/fixtures";

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
  const [ready, setReady] = useState(false);
  const [roundLabel, setRoundLabel] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matchQuery);
  const [playerPane, setPlayerPane] = useState(false);

  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const filtersReady = isEventFilterSelected(activeFilter);

  const load = useCallback(async () => {
    if (!selected) {
      setMatches([]);
      setReady(true);
      return;
    }
    const result = await listChampionshipMatches(selected.id);
    if (result.error) toast.error(result.error.message);
    setMatches(result.data ?? []);
    setReady(true);
  }, [selected]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  useEffect(() => {
    if (matchQuery) setSelectedMatchId(matchQuery);
  }, [matchQuery]);

  const categoryMatches = useMemo(() => {
    if (!filtersReady) return [];
    return matches.filter((row) => {
      if (row.status === "cancelled") return false;
      return matchPassesEventFilter(row, activeFilter, sport?.name);
    });
  }, [filtersReady, activeFilter, sport, matches]);

  const rounds = useMemo(() => {
    const labels = [...new Set(categoryMatches.map((row) => row.roundLabel))];
    return labels;
  }, [categoryMatches]);

  useEffect(() => {
    if (rounds.length === 0) {
      setRoundLabel("");
      return;
    }
    if (!roundLabel || !rounds.includes(roundLabel)) setRoundLabel(rounds[0]!);
  }, [roundLabel, rounds]);

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
      <PageHeader title="Scoring" hint="Pick sport, gender, then age. Then pick a round and a match." />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value, meta) => {
          setFilter({ ...value });
          setSport(meta.sport);
        }}
      />
      {!filtersReady ? (
        <EmptyState title="Pick sport, then gender, then age" hint="The scoreboard waits until the category is selected." />
      ) : (
        <>
      {rounds.length > 0 ? (
        <ChipFilter
          ariaLabel="Rounds"
          showAll={false}
          allowEmpty={false}
          value={roundLabel}
          onChange={(value) => {
            if (value) setRoundLabel(value);
          }}
          options={rounds.map((label) => ({ value: label, label }))}
        />
      ) : null}
      <SplitWorkspace
            splitAt="md"
            queue={
              <>
                <p className="text-sm font-semibold">Matches</p>
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
                        <p className="font-semibold">{row.team1Name} vs {row.team2Name}</p>
                        <StatusBadge tone={statusTone(row.status)}>
                          {row.status.replace("_", " ")}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{displayScore(row)}</p>
                    </button>
                  ))
                )}
              </>
            }
            board={
              selectedMatch ? (
                <SoftCard>
                  <ScoreMatchBoard
                    key={selectedMatch.id}
                    match={selectedMatch}
                    initialPane={playerPane ? "players" : "score"}
                    onSaved={() => void load()}
                  />
                </SoftCard>
              ) : (
                <EmptyState title="Select a match" hint="The scoreboard opens here." />
              )
            }
          />
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
