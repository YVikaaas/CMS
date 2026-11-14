"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  EmptyState,
  EventFilters,
  PageHeader,
  SoftButton,
  SoftCard,
  StatusBadge,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { listChampionshipOfferings, listSports } from "@/lib/services";
import type { ChampionshipOffering, Sport } from "@/lib/types/cms";
import {
  applySport,
  emptyEventFilter,
  offeredSports,
  readEventFilter,
  writeEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";

export default function FixturesPage() {
  const router = useRouter();
  const { selected, loading } = useChampionship();
  const skipFilterNav = useRef(true);
  const [sports, setSports] = useState<Sport[]>([]);
  const [offerings, setOfferings] = useState<ChampionshipOffering[]>([]);
  const [filter, setFilter] = useState<EventFilterValue | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!selected) {
      setSports([]);
      setOfferings([]);
      setReady(true);
      return;
    }
    const [sportRes, offerRes] = await Promise.all([
      listSports(),
      listChampionshipOfferings(selected.id),
    ]);
    if (sportRes.error) toast.error(sportRes.error.message);
    if (offerRes.error) toast.error(offerRes.error.message);
    setOfferings(offerRes.data ?? []);
    setSports(offeredSports(sportRes.data ?? [], offerRes.data ?? []));
    setReady(true);
  }, [selected]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const visibleSports = useMemo(
    () => sports.filter((sport) => !activeFilter.sportId || sport.id === activeFilter.sportId),
    [sports, activeFilter.sportId],
  );

  const openSport = (sportId: string) => {
    if (!selected) return;
    const current = readEventFilter(selected.id);
    if (current.sportId !== sportId) {
      writeEventFilter(applySport({ ...current, championshipId: selected.id }, sportId));
    }
    router.push(`/gameplay/fixtures/sport/${sportId}`);
  };

  if (loading || !ready) {
    return <p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>;
  }
  if (!selected) {
    return (
      <EmptyState
        title="Select a championship"
        hint="Floor pages use the championship in the header."
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
      <PageHeader title="Fixtures" hint="All sports until you pick one. Later chips narrow the list." />
      <EventFilters
        championshipId={selected.id}
        onChange={(value) => {
          setFilter({ ...value });
          if (skipFilterNav.current) {
            skipFilterNav.current = false;
            return;
          }
          if (value.sportId) openSport(value.sportId);
        }}
      />
      {sports.length === 0 ? (
        <EmptyState
          title="No sports offered"
          hint="Assign a sport to this championship first."
          action={
            <Link href={`/championships/${selected.id}/sports`}>
              <SoftButton variant="primary">Championship sports</SoftButton>
            </Link>
          }
        />
      ) : visibleSports.length === 0 ? (
        <EmptyState title="No sports for this filter" hint="Clear a chip to see more." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleSports.map((sport) => {
            const eventCount =
              offerings.find((item) => item.sportId === sport.id)?.categoryIds.length ?? 0;
            return (
              <SoftCard key={sport.id} interactive onClick={() => openSport(sport.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{sport.name}</p>
                    <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{sport.code}</p>
                  </div>
                  <StatusBadge>{sport.eventMode}</StatusBadge>
                </div>
                <p className="mt-3 text-sm text-[var(--ops-text-muted)]">
                  {eventCount} {eventCount === 1 ? "category" : "categories"}
                </p>
              </SoftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
