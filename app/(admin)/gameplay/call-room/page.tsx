"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@mui/material/Card";
import { IconArrowRight, IconCheck, IconClock, IconMapPin } from "@tabler/icons-react";
import { toast } from "sonner";
import { CallRoomBoard } from "@/components/callRoom/CallRoomBoard";
import {
  ChipFilter,
  EmptyState,
  ActionDock,
  EventFilters,
  PageHeader,
  PageSkeleton,
  QueueMarker,
  QueueStrip,
  SoftButton,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { getCallRoomBoard, getCallRoomSheet, listCallRoomAttendance, saveCallRoomSheet } from "@/lib/services";
import type { CallRoomAction, CallRoomAttendanceRow, CallRoomSheet, FixtureMatch, Sport } from "@/lib/types/cms";
import {
  emptyEventFilter,
  isEventFilterComplete,
  matchPassesEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import { heatQueueTitle, isHeatMatch } from "@/lib/utils/athletics";
import { applyCallRoomChange, callRoomProgress, callRoomQueueDone, callRoomQueueHint, callRoomQueueProgress } from "@/lib/utils/callRoom";
import { cn } from "@/lib/utils/cn";
import { formatMatchWhen } from "@/lib/utils/resultsBoard";
import { uniqueRoundLabelsInOrder } from "@/lib/utils/fixtures";

function queueName(row: FixtureMatch): string {
  return isHeatMatch(row) ? heatQueueTitle(row) : `${row.team1Name} vs ${row.team2Name}`;
}

function when(row: FixtureMatch): string {
  return formatMatchWhen(row.scheduledAt).replace("Time ", "");
}

/** Heat / match chips with a marked-count marker: green check when everyone is marked. */
function HeatStrip({
  queue,
  selectedId,
  attendance,
  onPick,
}: {
  queue: FixtureMatch[];
  selectedId: string | null;
  attendance: CallRoomAttendanceRow[];
  onPick: (id: string) => void;
}) {
  return (
    <QueueStrip
      ariaLabel={queue.some((row) => isHeatMatch(row)) ? "Heats" : "Matches"}
      selectedId={selectedId}
      onPick={onPick}
      items={queue.map((row) => {
        const progress = callRoomQueueProgress(row, attendance);
        const marked = progress ? progress.present + progress.absent : 0;
        const done = callRoomQueueDone(row, attendance);
        return {
          id: row.id,
          title: queueName(row),
          subtitle: when(row),
          label: `${queueName(row)}, ${when(row)}, ${callRoomQueueHint(row, attendance)}`,
          marker: (
            <QueueMarker tone={done ? "done" : marked > 0 ? "busy" : "idle"}>
              {done ? <IconCheck size={18} stroke={3} /> : progress ? `${marked}/${progress.total}` : "–"}
            </QueueMarker>
          ),
        };
      })}
    />
  );
}

/** Match title: Material title-large, 22/28. */
function HeatHeader({ match, position, count }: { match: FixtureMatch; position: number; count: number }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-[22px] leading-7 font-medium">
        {queueName(match)}
        <span className="ml-2 text-sm leading-5 font-medium text-[var(--ops-text-muted)]">
          {position} of {count}
        </span>
      </h2>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--ops-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <IconClock size={16} aria-hidden />
          {when(match)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconMapPin size={16} aria-hidden />
          {match.venue?.trim() || "Venue TBA"}
        </span>
      </p>
    </div>
  );
}

function CallRoomDesk() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchQuery = searchParams.get("match");
  const { selected, loading } = useChampionship();
  const [filter, setFilter] = useState<EventFilterValue | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [attendance, setAttendance] = useState<CallRoomAttendanceRow[]>([]);
  const [ready, setReady] = useState(false);
  const [roundLabel, setRoundLabel] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matchQuery);
  const [sheet, setSheet] = useState<CallRoomSheet | null>(null);
  const [saving, setSaving] = useState(false);
  const pickedCategory = useRef("");

  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const filtersReady = isEventFilterComplete(activeFilter);

  const load = useCallback(async () => {
    if (!selected) {
      setMatches([]);
      setAttendance([]);
      setReady(true);
      return;
    }
    const board = await getCallRoomBoard(selected.id);
    if (board.error) toast.error(board.error.message);
    setMatches(board.data?.matches ?? []);
    setAttendance(board.data?.attendance ?? []);
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

  const rounds = useMemo(() => uniqueRoundLabelsInOrder(categoryMatches), [categoryMatches]);
  // derived, not synced: a deep link opens its own round; otherwise the first round
  const activeRound = rounds.includes(roundLabel)
    ? roundLabel
    : (categoryMatches.find((row) => row.id === selectedMatchId)?.roundLabel ?? rounds[0] ?? "");

  const queue = useMemo(
    () => categoryMatches.filter((row) => row.roundLabel === activeRound),
    [categoryMatches, activeRound],
  );

  // never a dead "select a heat" screen: fall back to the round's first heat
  const selectedMatch = queue.find((row) => row.id === selectedMatchId) ?? queue[0] ?? null;
  const position = selectedMatch ? queue.indexOf(selectedMatch) : -1;
  const nextMatch = position >= 0 ? (queue[position + 1] ?? null) : null;
  const nextRound = rounds[rounds.indexOf(activeRound) + 1] ?? null;

  useEffect(() => {
    if (!selectedMatch) {
      setSheet(null);
      return;
    }
    let active = true;
    void getCallRoomSheet(selectedMatch).then((result) => {
      if (!active) return;
      if (result.error) {
        toast.error(result.error.message);
        setSheet(null);
        return;
      }
      setSheet(result.data);
    });
    return () => {
      active = false;
    };
  }, [selectedMatch]);

  function pickMatch(id: string) {
    setSelectedMatchId(id);
    router.replace(`/gameplay/call-room?match=${id}`);
  }

  function goNext() {
    if (nextMatch) {
      pickMatch(nextMatch.id);
    } else if (nextRound) {
      setRoundLabel(nextRound);
      setSelectedMatchId(null);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleChange(next: CallRoomSheet, action: CallRoomAction) {
    if (!selectedMatch) return;
    const previous = sheet;
    setSheet(next);
    setSaving(true);
    const result = await saveCallRoomSheet(next);
    setSaving(false);
    if (result.error) {
      setSheet(previous);
      toast.error(result.error.message);
      return;
    }
    setSheet(result.data);
    // bulk marks are the one easy mistake on the ground: offer a one-tap undo
    if (action.type === "rest" && previous) {
      const count = previous.units.filter((unit) => !unit.mark).length;
      toast.success(`${count} marked ${action.mark}`, {
        duration: 10_000,
        action: { label: "Undo", onClick: () => void handleChange(previous, { type: "unit", key: "", mark: "" }) },
      });
    }
    const attendanceRes = await listCallRoomAttendance(matches.map((row) => row.id));
    if (attendanceRes.data) setAttendance(attendanceRes.data);
  }

  if (loading || !ready) {
    return <PageSkeleton kind="desk" />;
  }
  if (!selected) {
    return (
      <EmptyState
        title="Select an event"
        action={
          <Link href="/events">
            <SoftButton variant="primary">Events</SoftButton>
          </Link>
        }
      />
    );
  }

  const liveSheet = selectedMatch && sheet && sheet.matchId === selectedMatch.id ? sheet : null;
  const progress = liveSheet ? callRoomProgress(liveSheet) : null;
  const left = liveSheet ? liveSheet.units.filter((unit) => !unit.mark).length : 0;
  const heat = selectedMatch ? isHeatMatch(selectedMatch) : true;
  const nextLabel = nextMatch ? (heat ? "Next heat" : "Next match") : nextRound ? `Next: ${nextRound}` : null;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader title="Call Room" />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value, meta) => {
          setFilter({ ...value });
          setSport(meta.sport);
          if (value.categoryId !== pickedCategory.current) {
            pickedCategory.current = value.categoryId;
            setRoundLabel("");
          }
        }}
      />
      {!filtersReady ? (
        <EmptyState
          title="Pick the event"
          hint="Choose sport, then boys/girls, age, and the race or match."
        />
      ) : matches.length === 0 ? (
        <EmptyState title="No matches yet" hint="Create a draw first." />
      ) : categoryMatches.length === 0 ? (
        <EmptyState title="No matches for this event" hint="Change the event, or create its draw first." />
      ) : (
        <Card className="flex flex-col gap-3 p-3">
          {rounds.length > 1 ? (
            // one sideways-scrolling row, like the heat strip
            <div className="-mx-3 overflow-x-auto px-3 [&>div]:w-max [&>div]:max-w-none [&>div]:flex-nowrap">
            <ChipFilter
              ariaLabel="Rounds"
              showAll={false}
              allowEmpty={false}
              value={activeRound}
              onChange={(value) => {
                if (!value) return;
                setRoundLabel(value);
                setSelectedMatchId(null);
              }}
              options={rounds.map((label) => ({ value: label, label }))}
            />
            </div>
          ) : null}
          {queue.length === 0 ? (
            <p className="text-sm text-[var(--ops-text-muted)]">No heats in this round.</p>
          ) : (
            <HeatStrip queue={queue} selectedId={selectedMatch?.id ?? null} attendance={attendance} onPick={pickMatch} />
          )}
          {selectedMatch ? (
            <>
              <HeatHeader match={selectedMatch} position={position + 1} count={queue.length} />
              {liveSheet ? (
                <CallRoomBoard sheet={liveSheet} saving={saving} onChange={(next, action) => void handleChange(next, action)} />
              ) : (
                <PageSkeleton kind="board" />
              )}
            </>
          ) : null}
        </Card>
      )}

      {filtersReady && liveSheet && progress && progress.total > 0 ? (
        // thumb zone: the three things you do between heats, always in reach
        <ActionDock>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm font-medium tabular-nums" aria-live="polite">
              {saving ? (
                <span className="text-[var(--ops-text-muted)]">Saving…</span>
              ) : left === 0 ? (
                <span className="text-[var(--ops-success)]">All {progress.total} marked · saved</span>
              ) : (
                <span>
                  <strong className="text-[var(--ops-warning)]">{left} left</strong>
                  <span className="text-[var(--ops-text-muted)]"> of {liveSheet.units.length} · saved</span>
                </span>
              )}
            </p>
            <div className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 sm:ml-auto sm:flex sm:w-auto">
              <SoftButton
                disabled={saving || left === 0}
                onClick={() => void handleChange(applyCallRoomChange(liveSheet, { type: "rest", mark: "present" }), { type: "rest", mark: "present" })}
                className="px-3 whitespace-nowrap"
              >
                Rest present
              </SoftButton>
              <SoftButton
                disabled={saving || left === 0}
                onClick={() => void handleChange(applyCallRoomChange(liveSheet, { type: "rest", mark: "absent" }), { type: "rest", mark: "absent" })}
                className="px-3 whitespace-nowrap"
              >
                Rest absent
              </SoftButton>
              {nextLabel ? (
                <SoftButton
                  variant={left === 0 ? "primary" : "default"}
                  onClick={goNext}
                  endIcon={<IconArrowRight size={18} />}
                >
                  <span className="sm:hidden">Next</span>
                  <span className="hidden sm:inline">{nextLabel}</span>
                </SoftButton>
              ) : (
                <span className="inline-flex h-10 items-center justify-center text-sm leading-5 text-[var(--ops-text-muted)]">Last heat</span>
              )}
            </div>
          </div>
        </ActionDock>
      ) : null}
    </div>
  );
}

export default function CallRoomPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="desk" />}>
      <CallRoomDesk />
    </Suspense>
  );
}
