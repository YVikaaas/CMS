"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import { IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconMapPin } from "@tabler/icons-react";
import { toast } from "sonner";
import { ScoreAthleticsBoard } from "@/components/athletics/ScoreAthleticsBoard";
import { FixtureRankingBoard } from "@/components/results/FixtureRankingBoard";
import { ScoreMatchBoard } from "@/components/ScoreMatchBoard";
import {
  ChipFilter,
  EmptyState,
  EventFilters,
  PageHeader,
  PageSkeleton,
  QueueMarker,
  QueueStrip,
  SoftButton,
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
import { formatMatchWhen } from "@/lib/utils/resultsBoard";

const RANKING_TAB = "ranking";

function matchName(row: FixtureMatch): string {
  return isHeatMatch(row) ? heatQueueTitle(row) : `${row.team1Name} vs ${row.team2Name}`;
}

function matchSub(row: FixtureMatch): string {
  if (isHeatMatch(row)) return heatQueueHint(row);
  return [formatMatchWhen(row.scheduledAt).replace("Time ", ""), displayScore(row)].filter(Boolean).join(" · ");
}

/** Strip marker: check when scored, LIVE while in progress, the match number otherwise. */
function matchMarker(row: FixtureMatch) {
  if (row.status === "completed") return <QueueMarker tone="done"><IconCheck size={18} stroke={3} /></QueueMarker>;
  if (row.status === "in_progress") return <QueueMarker tone="live">LIVE</QueueMarker>;
  return <QueueMarker tone="idle">{row.matchNumber}</QueueMarker>;
}

const STATUS_TEXT: Record<FixtureMatch["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "Live",
  completed: "Scored",
  cancelled: "Cancelled",
  no_show: "No show",
};

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

  // derived, not synced: a deep link opens its own round; otherwise the first tab
  const allowedTabs = roundTabs.map((item) => item.value);
  const activeTab = allowedTabs.includes(roundLabel)
    ? roundLabel
    : (categoryMatches.find((row) => row.id === selectedMatchId)?.roundLabel ?? allowedTabs[0] ?? "");

  const queue = useMemo(
    () => categoryMatches.filter((row) => row.roundLabel === activeTab),
    [categoryMatches, activeTab],
  );

  // never an empty "select a match" screen: the round opens on its first match
  const selectedMatch = queue.find((row) => row.id === selectedMatchId) ?? queue[0] ?? null;
  const position = selectedMatch ? queue.indexOf(selectedMatch) : -1;

  function pickMatch(id: string) {
    setSelectedMatchId(id);
    setPlayerPane(false);
    router.replace(`/gameplay/scoring?match=${id}`);
  }

  if (loading || !ready) {
    return <PageSkeleton kind="desk" />;
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
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader title="Scoring" />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value, meta) => {
          setFilter({ ...value });
          setSport(meta.sport);
        }}
      />
      {!filtersReady ? (
        <EmptyState title="Pick the event" hint="Choose sport, then gender, age and event. Each menu opens the next." />
      ) : fixtures.length === 0 && matches.length === 0 ? (
        <EmptyState title="No matches yet" hint="Create a draw first." />
      ) : !fixture ? (
        <EmptyState title="No draw for this event" hint="Change the event, or create its draw first." />
      ) : (
        <Card className="flex flex-col gap-3 p-3">
          {roundTabs.length > 1 ? (
            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 [&>div]:w-max [&>div]:max-w-none [&>div]:flex-nowrap">
              <ChipFilter
                ariaLabel="Rounds"
                showAll={false}
                allowEmpty={false}
                value={activeTab}
                onChange={(value) => {
                  if (!value) return;
                  setRoundLabel(value);
                  setSelectedMatchId(null);
                }}
                options={roundTabs}
                gapBefore={RANKING_TAB}
              />
            </div>
          ) : null}
          {activeTab === RANKING_TAB ? (
            <FixtureRankingBoard fixture={fixture} onChanged={() => void load()} />
          ) : queue.length === 0 ? (
            <p className="text-sm text-[var(--ops-text-muted)]">No matches in this round.</p>
          ) : (
            <>
              <QueueStrip
                ariaLabel={queue.some((row) => isHeatMatch(row)) ? "Heats" : "Matches"}
                selectedId={selectedMatch?.id ?? null}
                onPick={pickMatch}
                items={queue.map((row) => ({
                  id: row.id,
                  title: matchName(row),
                  subtitle: matchSub(row),
                  label: `${matchName(row)}, ${STATUS_TEXT[row.status]}`,
                  marker: matchMarker(row),
                }))}
              />
              {selectedMatch ? (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-2xl leading-tight font-semibold sm:text-3xl">
                        {matchName(selectedMatch)}
                        <span className="ml-2 align-middle text-base font-medium text-[var(--ops-text-muted)]">
                          {position + 1} of {queue.length} · {STATUS_TEXT[selectedMatch.status]}
                        </span>
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--ops-text-muted)]">
                        <span className="inline-flex items-center gap-1.5">
                          <IconClock size={16} aria-hidden />
                          {formatMatchWhen(selectedMatch.scheduledAt).replace("Time ", "")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <IconMapPin size={16} aria-hidden />
                          {selectedMatch.venue?.trim() || "Venue TBA"}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <IconButton
                        aria-label="Previous match"
                        disabled={position <= 0}
                        onClick={() => pickMatch(queue[position - 1]!.id)}
                        className="size-12 rounded-xl border border-[var(--ops-line)]"
                      >
                        <IconChevronLeft size={22} />
                      </IconButton>
                      <IconButton
                        aria-label="Next match"
                        disabled={position >= queue.length - 1}
                        onClick={() => pickMatch(queue[position + 1]!.id)}
                        className="size-12 rounded-xl border border-[var(--ops-line)]"
                      >
                        <IconChevronRight size={22} />
                      </IconButton>
                    </div>
                  </div>
                  {isHeatMatch(selectedMatch) ? (
                    <ScoreAthleticsBoard key={selectedMatch.id} match={selectedMatch} onSaved={() => void load()} />
                  ) : (
                    <ScoreMatchBoard
                      key={selectedMatch.id}
                      match={selectedMatch}
                      initialPane={playerPane ? "players" : "score"}
                      onSaved={() => void load()}
                    />
                  )}
                </>
              ) : null}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ScoringPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="desk" />}>
      <ScoringDesk />
    </Suspense>
  );
}
