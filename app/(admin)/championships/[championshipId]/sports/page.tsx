"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import {
  ChipFilter,
  EmptyState,
  PageHeader,
  PageSkeleton,
  PickItem,
  PickList,
  PickToolbar,
  SoftButton,
  SoftCard,
  SoftSearch,
  StatusBadge,
  StepCrumbs,
} from "@/components/ops";
import { useScopedChampionship } from "../../useScopedChampionship";
import {
  addChampionshipSports,
  listCategories,
  listChampionshipOfferings,
  listSports,
  removeChampionshipSport,
} from "@/lib/services";
import type { Category, ChampionshipOffering, Sport, SportEventMode } from "@/lib/types/cms";
import { applySport, emptyEventFilter, writeEventFilter } from "@/lib/utils/eventFilter";
import { compareText, matchesQuery } from "@/lib/utils/table";

function toggleId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export default function ChampionshipSportsPage() {
  const router = useRouter();
  const params = useParams<{ championshipId: string }>();
  const championshipId = params.championshipId;
  const { championship, loading } = useScopedChampionship(championshipId);
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offerings, setOfferings] = useState<ChampionshipOffering[]>([]);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"" | SportEventMode>("");
  const [formOpen, setFormOpen] = useState(false);
  const [pickSearch, setPickSearch] = useState("");
  const [pickMode, setPickMode] = useState<"" | SportEventMode>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeCategories, setIncludeCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [sportRes, catRes, offerRes] = await Promise.all([
      listSports(),
      listCategories(),
      listChampionshipOfferings(championshipId),
    ]);
    if (sportRes.error) toast.error(sportRes.error.message);
    if (catRes.error) toast.error(catRes.error.message);
    if (offerRes.error) toast.error(offerRes.error.message);
    setSports(sportRes.data ?? []);
    setCategories(catRes.data ?? []);
    setOfferings(offerRes.data ?? []);
    setReady(true);
  }, [championshipId]);

  useEffect(() => {
    if (championship) void load();
  }, [championship, load]);

  const assignedIds = useMemo(
    () => new Set(offerings.map((item) => item.sportId)),
    [offerings],
  );
  const assigned = sports.filter((sport) => assignedIds.has(sport.id));
  const available = sports.filter((sport) => !assignedIds.has(sport.id));

  const visible = useMemo(() => {
    const filtered = assigned.filter((sport) => {
      if (modeFilter && sport.eventMode !== modeFilter) return false;
      return matchesQuery(search, sport.name, sport.code, sport.eventMode);
    });
    return [...filtered].sort((a, b) => compareText(a.name, b.name, "asc"));
  }, [assigned, search, modeFilter]);

  const pickVisible = useMemo(() => {
    const filtered = available.filter((sport) => {
      if (pickMode && sport.eventMode !== pickMode) return false;
      return matchesQuery(pickSearch, sport.name, sport.code, sport.eventMode);
    });
    return [...filtered].sort((a, b) => compareText(a.name, b.name, "asc"));
  }, [available, pickMode, pickSearch]);

  const categoriesBySport = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const category of categories) {
      const list = map.get(category.sportId) ?? [];
      list.push(category);
      map.set(category.sportId, list);
    }
    return map;
  }, [categories]);

  const selectedCategoryCount = useMemo(() => {
    if (!includeCategories) return 0;
    return [...selectedIds].reduce(
      (total, sportId) => total + (categoriesBySport.get(sportId)?.length ?? 0),
      0,
    );
  }, [categoriesBySport, includeCategories, selectedIds]);

  if (loading || (championship && !ready)) {
    return <PageSkeleton kind="cards" />;
  }
  if (!championship) {
    return (
      <EmptyState
        title="Championship not found"
        action={
          <Link href="/championships">
            <SoftButton variant="primary">Back to championships</SoftButton>
          </Link>
        }
      />
    );
  }

  const openSport = (sport: Sport) => {
    writeEventFilter(applySport(emptyEventFilter(championshipId), sport.id));
    router.push(`/championships/${championshipId}/sports/${sport.id}/categories`);
  };

  const openForm = () => {
    setPickSearch("");
    setPickMode(modeFilter);
    setIncludeCategories(assigned.length === 0);
    setListError(false);
    const next = available.filter((sport) => !modeFilter || sport.eventMode === modeFilter);
    setSelectedIds(next.length > 0 && next.length <= 8 ? new Set(next.map((sport) => sport.id)) : new Set());
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepCrumbs
        items={[
          { href: "/championships", label: "Championships" },
          { label: championship.name },
        ]}
      />
      <PageHeader
        title="Sports"
        hint="Pick one or more sports, then assign categories."
        action={
          <SoftButton variant="primary" onClick={openForm} disabled={available.length === 0}>
            Add sports
          </SoftButton>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SoftSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search sport or code"
        />
        <ChipFilter
          ariaLabel="Mode"
          value={modeFilter}
          onChange={setModeFilter}
          options={[
            { value: "team", label: "Team" },
            { value: "solo", label: "Solo" },
            { value: "both", label: "Both" },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={assigned.length === 0 ? "No sports yet" : "No matching sports"}
          hint="Add a sport to continue."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((sport) => {
            const eventCount =
              offerings.find((item) => item.sportId === sport.id)?.categoryIds.length ?? 0;
            return (
              <SoftCard key={sport.id} interactive onClick={() => openSport(sport)}>
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
                <div
                  className="mt-4 flex justify-end"
                  onClick={(event) => event.stopPropagation()}
                >
                  <SoftButton
                    variant="danger"
                    onClick={async () => {
                      if (!confirm(`Remove ${sport.name} from this championship?`)) return;
                      const { error } = await removeChampionshipSport(championshipId, sport.id);
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Sport removed.");
                        await load();
                      }
                    }}
                  >
                    Remove
                  </SoftButton>
                </div>
              </SoftCard>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        title="Add sports"
        wide
        onClose={() => setFormOpen(false)}
      >
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (selectedIds.size === 0) {
              setListError(true);
              toast.error("Select at least one sport.");
              return;
            }
            const categoriesBySportPayload: Record<string, string[]> = {};
            if (includeCategories) {
              for (const sportId of selectedIds) {
                categoriesBySportPayload[sportId] = (categoriesBySport.get(sportId) ?? []).map(
                  (category) => category.id,
                );
              }
            }
            setSaving(true);
            const { error } = await addChampionshipSports(championshipId, [...selectedIds], {
              categoriesBySport: includeCategories ? categoriesBySportPayload : undefined,
            });
            setSaving(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            const sportLabel = selectedIds.size === 1 ? "sport" : "sports";
            toast.success(
              includeCategories && selectedCategoryCount > 0
                ? `Added ${selectedIds.size} ${sportLabel} and ${selectedCategoryCount} categories.`
                : `Added ${selectedIds.size} ${sportLabel}.`,
            );
            setFormOpen(false);
            setSelectedIds(new Set());
            setListError(false);
            await load();
          }}
        >
          <SoftSearch
            value={pickSearch}
            onChange={(event) => setPickSearch(event.target.value)}
            placeholder="Search remaining sports"
          />
          <ChipFilter
            ariaLabel="Mode"
            value={pickMode}
            onChange={setPickMode}
            options={[
              { value: "team", label: "Team" },
              { value: "solo", label: "Solo" },
              { value: "both", label: "Both" },
            ]}
          />
          <PickToolbar
            selected={selectedIds.size}
            visible={pickVisible.length}
            onSelectVisible={() => setSelectedIds(new Set(pickVisible.map((sport) => sport.id)))}
            onClear={() => setSelectedIds(new Set())}
          />
          {pickVisible.length === 0 ? (
            <EmptyState title="No remaining sports" hint="Every matching sport is already assigned." />
          ) : (
            <PickList invalid={listError}>
              {pickVisible.map((sport) => {
                const leftover = categoriesBySport.get(sport.id)?.length ?? 0;
                return (
                  <PickItem
                    key={sport.id}
                    title={`${sport.name} (${sport.code})`}
                    hint={`${sport.eventMode} · ${leftover} ${leftover === 1 ? "category" : "categories"} in catalog`}
                    checked={selectedIds.has(sport.id)}
                    onToggle={() => {
                      setSelectedIds((current) => toggleId(current, sport.id));
                      setListError(false);
                    }}
                  />
                );
              })}
            </PickList>
          )}
          <label className="flex items-start gap-3 rounded-xl border border-[var(--ops-line)] px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={includeCategories}
              onChange={(event) => setIncludeCategories(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--ops-primary)]"
            />
            <span>
              <span className="block font-medium">Also assign every category</span>
              <span className="mt-0.5 block text-[var(--ops-text-muted)]">
                Adds the full catalog for the selected sports. Leave off to pick gender and age on the next page.
              </span>
            </span>
          </label>
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving} disabled={selectedIds.size === 0}>
              {includeCategories && selectedCategoryCount > 0
                ? `Add ${selectedIds.size} sports + ${selectedCategoryCount} categories`
                : selectedIds.size === 1
                  ? "Add sport"
                  : `Add ${selectedIds.size} sports`}
            </SoftButton>
            <SoftButton type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </SoftButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
