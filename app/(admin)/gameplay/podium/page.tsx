"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PodiumBoard } from "@/components/podium/PodiumBoard";
import { EmptyState, EventFilters, PageHeader, PageSkeleton, SoftButton, SoftCard } from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { getPodiumSheet, listFixtures, setPodiumDelivery } from "@/lib/services";
import type { Fixture, PodiumSheet } from "@/lib/types/cms";
import {
  emptyEventFilter,
  fixturePassesEventFilter,
  isEventFilterComplete,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";

export default function PodiumPage() {
  const { selected, loading } = useChampionship();
  const [filter, setFilter] = useState<EventFilterValue | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [sheet, setSheet] = useState<PodiumSheet | null>(null);
  const [ready, setReady] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const filtersReady = isEventFilterComplete(activeFilter);

  const load = useCallback(async () => {
    if (!selected) {
      setFixtures([]);
      setReady(true);
      return;
    }
    const result = await listFixtures(selected.id);
    if (result.error) toast.error(result.error.message);
    setFixtures(result.data ?? []);
    setReady(true);
  }, [selected]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  const fixture = useMemo(() => {
    if (!filtersReady) return null;
    return (
      fixtures.find(
        (row) =>
          fixturePassesEventFilter(row, activeFilter) &&
          row.sportId === activeFilter.sportId &&
          row.categoryId === activeFilter.categoryId,
      ) ?? null
    );
  }, [activeFilter, filtersReady, fixtures]);

  useEffect(() => {
    if (!fixture?.rankingLockedAt) {
      setSheet(null);
      return;
    }
    let active = true;
    void getPodiumSheet(fixture.id).then((result) => {
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
  }, [fixture]);

  async function onDeliver(rankingId: string, delivered: boolean) {
    if (!fixture) return;
    setSavingId(rankingId);
    const result = await setPodiumDelivery(rankingId, delivered);
    setSavingId(null);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    const next = await getPodiumSheet(fixture.id);
    if (next.error) toast.error(next.error.message);
    else setSheet(next.data);
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

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader title="Podium" />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value) => {
          setFilter({ ...value });
        }}
      />
      {!filtersReady ? (
        <EmptyState title="Pick the event" hint="Choose sport, then gender, age and event. Each menu opens the next." />
      ) : !fixture ? (
        <EmptyState title="No draw for this filter" hint="Create a fixture first." />
      ) : !fixture.rankingLockedAt ? (
        <EmptyState
          title="Ranking is not locked"
          hint="Set 1st, 2nd and 3rd on the scoring ranking tab, save, then lock. This category appears here after that."
          action={
            <Link href="/gameplay/scoring">
              <SoftButton variant="primary">Scoring</SoftButton>
            </Link>
          }
        />
      ) : sheet ? (
        // the event is named once, in the picker strip; this card is just the hand-out sheet
        <SoftCard className="flex flex-col gap-3">
          <PodiumBoard holders={sheet.holders} savingId={savingId} onDeliver={(id, delivered) => void onDeliver(id, delivered)} />
        </SoftCard>
      ) : (
        <PageSkeleton kind="board" />
      )}
    </div>
  );
}
