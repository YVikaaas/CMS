"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CallRoomBoard } from "@/components/callRoom/CallRoomBoard";
import {
  ChipFilter,
  EmptyState,
  EventFilters,
  PageHeader,
  SoftButton,
  SplitWorkspace,
  StatusBadge,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { getCallRoomSheet, listCallRoomAttendance, listChampionshipMatches, saveCallRoomSheet } from "@/lib/services";
import type { CallRoomAction, CallRoomAttendanceRow, CallRoomSheet, FixtureMatch, Sport } from "@/lib/types/cms";
import {
  emptyEventFilter,
  isEventFilterComplete,
  matchPassesEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import { heatQueueTitle, isHeatMatch } from "@/lib/utils/athletics";
import { callRoomQueueHint, callRoomQueueTone } from "@/lib/utils/callRoom";
import { uniqueRoundLabelsInOrder } from "@/lib/utils/fixtures";

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

  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const filtersReady = isEventFilterComplete(activeFilter);

  const load = useCallback(async () => {
    if (!selected) {
      setMatches([]);
      setAttendance([]);
      setReady(true);
      return;
    }
    const matchRes = await listChampionshipMatches(selected.id);
    if (matchRes.error) toast.error(matchRes.error.message);
    const nextMatches = matchRes.data ?? [];
    setMatches(nextMatches);
    const attendanceRes = await listCallRoomAttendance(nextMatches.map((row) => row.id));
    if (attendanceRes.error) toast.error(attendanceRes.error.message);
    setAttendance(attendanceRes.data ?? []);
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

  const selectedMatch =
    queue.find((row) => row.id === selectedMatchId) ??
    categoryMatches.find((row) => row.id === selectedMatchId) ??
    null;

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

  async function handleChange(next: CallRoomSheet, _action: CallRoomAction) {
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
    const attendanceRes = await listCallRoomAttendance(matches.map((row) => row.id));
    if (attendanceRes.data) setAttendance(attendanceRes.data);
  }

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
      <PageHeader
        title="Call Room"
        hint="Pick sport, gender, age, then category. Mark who is in for each match."
      />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value, meta) => {
          setFilter({ ...value });
          setSport(meta.sport);
        }}
      />
      {!filtersReady ? (
        <EmptyState
          title="Pick sport, gender, age, then category"
          hint="Call room waits until the category name is selected."
        />
      ) : matches.length === 0 ? (
        <EmptyState title="No matches yet" hint="Create a draw first." />
      ) : categoryMatches.length === 0 ? (
        <EmptyState title="No matches for this filter" hint="Try another sport / gender / age / category." />
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
                <p className="text-sm font-semibold">{queue.some((row) => isHeatMatch(row)) ? "Heats" : "Matches"}</p>
                {queue.length === 0 ? (
                  <p className="text-sm text-[var(--ops-text-muted)]">No matches for this filter.</p>
                ) : (
                  queue.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setSelectedMatchId(row.id);
                        router.replace(`/gameplay/call-room?match=${row.id}`);
                      }}
                      className={`rounded-xl border px-3 py-3 text-left ${
                        selectedMatchId === row.id
                          ? "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)]"
                          : "border-[var(--ops-line)] bg-white hover:bg-[var(--ops-board-muted)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">
                          {isHeatMatch(row) ? heatQueueTitle(row) : `${row.team1Name} vs ${row.team2Name}`}
                        </p>
                        <StatusBadge tone={callRoomQueueTone(row, attendance)}>
                          {callRoomQueueHint(row, attendance)}
                        </StatusBadge>
                      </div>
                    </button>
                  ))
                )}
              </>
            }
            board={
              selectedMatch && sheet && sheet.matchId === selectedMatch.id ? (
                <CallRoomBoard sheet={sheet} saving={saving} onChange={(next, action) => void handleChange(next, action)} />
              ) : selectedMatch ? (
                <p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>
              ) : (
                <EmptyState title="Select a match" hint="Present and absent opens here." />
              )
            }
          />
        </>
      )}
    </div>
  );
}

export default function CallRoomPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>}>
      <CallRoomDesk />
    </Suspense>
  );
}
