"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import {
  ChipFilter,
  EmptyState,
  PageHeader,
  SoftButton,
  SoftCard,
  SoftSearch,
  SoftSelect,
  StatusBadge,
  StepCrumbs,
} from "@/components/ops";
import { useScopedChampionship } from "../../useScopedChampionship";
import {
  addChampionshipSport,
  listChampionshipOfferings,
  listSports,
  removeChampionshipSport,
} from "@/lib/services";
import type { ChampionshipOffering, Sport, SportEventMode } from "@/lib/types/cms";
import { applySport, emptyEventFilter, writeEventFilter } from "@/lib/utils/eventFilter";
import { compareText, matchesQuery } from "@/lib/utils/table";

export default function ChampionshipSportsPage() {
  const router = useRouter();
  const params = useParams<{ championshipId: string }>();
  const championshipId = params.championshipId;
  const { championship, loading } = useScopedChampionship(championshipId);
  const [sports, setSports] = useState<Sport[]>([]);
  const [offerings, setOfferings] = useState<ChampionshipOffering[]>([]);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"" | SportEventMode>("");
  const [formOpen, setFormOpen] = useState(false);
  const [sportId, setSportId] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ sportId?: string }>({});

  const load = useCallback(async () => {
    const [sportRes, offerRes] = await Promise.all([
      listSports(),
      listChampionshipOfferings(championshipId),
    ]);
    if (sportRes.error) toast.error(sportRes.error.message);
    if (offerRes.error) toast.error(offerRes.error.message);
    const allSports = sportRes.data ?? [];
    setSports(allSports);
    setOfferings(offerRes.data ?? []);
    const assigned = new Set((offerRes.data ?? []).map((item) => item.sportId));
    setSportId((current) =>
      current && !assigned.has(current)
        ? current
        : (allSports.find((sport) => !assigned.has(sport.id))?.id ?? ""),
    );
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

  if (loading) {
    return <p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>;
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
        hint="Pick a sport, then assign categories."
        action={
          <SoftButton variant="primary" onClick={() => setFormOpen(true)} disabled={available.length === 0}>
            Add sport
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

      <Modal open={formOpen} title="Add sport" onClose={() => setFormOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!sportId) {
              setFieldErrors({ sportId: "Required" });
              toast.error("Fill the highlighted fields.");
              return;
            }
            setSaving(true);
            const { error } = await addChampionshipSport(championshipId, sportId);
            setSaving(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Sport assigned.");
            setFormOpen(false);
            setFieldErrors({});
            await load();
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sport
            <SoftSelect
              value={sportId}
              onChange={(event) => {
                setSportId(event.target.value);
                setFieldErrors({});
              }}
              className={fieldErrors.sportId ? fieldErrorClass : fieldClass}
            >
              {available.length === 0 ? (
                <option value="">All sports are assigned</option>
              ) : (
                available.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name} ({sport.code})
                  </option>
                ))
              )}
            </SoftSelect>
          </label>
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving} disabled={!sportId}>
              Add sport
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
