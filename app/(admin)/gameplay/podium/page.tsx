"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PodiumBoard } from "@/components/podium/PodiumBoard";
import { EmptyState, EventFilters, PageHeader, PageSkeleton, SoftButton, SoftCard, StatusBadge } from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { getPodiumSheet, listFixtures, setPodiumDelivery } from "@/lib/services";
import type { Fixture, PodiumSheet } from "@/lib/types/cms";
import {
  emptyEventFilter,
  fixturePassesEventFilter,
  isEventFilterComplete,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import { podiumDeliveryLabel } from "@/lib/utils/podium";

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
        title="Podium"
        hint="Lock 1st, 2nd and 3rd on scoring, then mark medal delivery here."
      />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value) => {
          setFilter({ ...value });
        }}
      />
      {!filtersReady ? (
        <EmptyState
          title="Pick sport, gender, age, then category"
          hint="Podium waits until the category name is selected."
        />
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
        <SoftCard className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-[var(--ops-text-muted)]">{sheet.sportName}</p>
              <p className="font-semibold">{sheet.categoryLabel}</p>
            </div>
            <StatusBadge tone={podiumDeliveryLabel(sheet.holders) === "All delivered" ? "success" : "warning"}>
              {podiumDeliveryLabel(sheet.holders)}
            </StatusBadge>
          </div>
          <PodiumBoard holders={sheet.holders} savingId={savingId} onDeliver={(id, delivered) => void onDeliver(id, delivered)} />
        </SoftCard>
      ) : (
        <PageSkeleton kind="board" />
      )}
    </div>
  );
}
