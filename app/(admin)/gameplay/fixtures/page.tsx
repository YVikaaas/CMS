"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SortTh, TableCard } from "@/components/table";
import {
  EmptyState,
  EventFilters,
  PageHeader,
  PageSkeleton,
  SoftButton,
  StatusBadge,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { listChampionshipOfferings, listSports } from "@/lib/services";
import type { ChampionshipOffering, Sport } from "@/lib/types/cms";
import { compareNumber, compareText, type SortState } from "@/lib/utils/table";
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
  const [sort, setSort] = useState<SortState<"name" | "code" | "mode" | "categories">>({
    key: "name",
    dir: "asc",
  });

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
  const visibleSports = useMemo(() => {
    const filtered = sports.filter((sport) => !activeFilter.sportId || sport.id === activeFilter.sportId);
    const count = (sportId: string) => offerings.find((item) => item.sportId === sportId)?.categoryIds.length ?? 0;
    return [...filtered].sort((a, b) => {
      if (sort.key === "code") return compareText(a.code, b.code, sort.dir);
      if (sort.key === "mode") return compareText(a.eventMode, b.eventMode, sort.dir);
      if (sort.key === "categories") return compareNumber(count(a.id), count(b.id), sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [sports, activeFilter.sportId, offerings, sort]);

  const openSport = (sportId: string) => {
    if (!selected) return;
    const current = readEventFilter(selected.id);
    if (current.sportId !== sportId) {
      writeEventFilter(applySport({ ...current, championshipId: selected.id }, sportId));
    }
    router.push(`/gameplay/fixtures/sport/${sportId}`);
  };

  if (loading || !ready) {
    return <PageSkeleton kind="table" />;
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
        <TableCard title="Sports">
          <table>
            <thead>
              <tr>
                <SortTh label="Sport" column="name" sort={sort} onSort={setSort} />
                <SortTh label="Code" column="code" sort={sort} onSort={setSort} />
                <SortTh label="Mode" column="mode" sort={sort} onSort={setSort} />
                <SortTh label="Categories" column="categories" sort={sort} onSort={setSort} />
              </tr>
            </thead>
            <tbody>
              {visibleSports.map((sport) => {
                const eventCount =
                  offerings.find((item) => item.sportId === sport.id)?.categoryIds.length ?? 0;
                return (
                  <tr key={sport.id}>
                    <td>
                      <button type="button" className="font-semibold" onClick={() => openSport(sport.id)}>
                        {sport.name}
                      </button>
                    </td>
                    <td>{sport.code}</td>
                    <td>
                      <StatusBadge>{sport.eventMode}</StatusBadge>
                    </td>
                    <td>{eventCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}
