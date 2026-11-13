"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Crumbs } from "@/components/crumbs";
import { Modal, fieldClass } from "@/components/Modal";
import { SortTh, TableControls } from "@/components/table";
import { useScopedChampionship } from "../../useScopedChampionship";
import {
  addChampionshipSport,
  listChampionshipOfferings,
  listSports,
  removeChampionshipSport,
} from "@/lib/services";
import type { ChampionshipOffering, Sport, SportEventMode } from "@/lib/types/cms";
import { compareText, matchesQuery, type SortState } from "@/lib/utils/table";

export default function ChampionshipSportsPage() {
  const router = useRouter();
  const params = useParams<{ championshipId: string }>();
  const championshipId = params.championshipId;
  const { championship, loading } = useScopedChampionship(championshipId);
  const [sports, setSports] = useState<Sport[]>([]);
  const [offerings, setOfferings] = useState<ChampionshipOffering[]>([]);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"" | SportEventMode>("");
  const [sort, setSort] = useState<SortState<"name" | "code" | "mode">>({
    key: "name",
    dir: "asc",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [sportId, setSportId] = useState("");
  const [saving, setSaving] = useState(false);

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
    return [...filtered].sort((a, b) => {
      if (sort.key === "code") return compareText(a.code, b.code, sort.dir);
      if (sort.key === "mode") return compareText(a.eventMode, b.eventMode, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [assigned, search, modeFilter, sort]);

  if (loading) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!championship) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Championship not found</h1>
        <Link href="/championships" className="mt-4 inline-block text-sm text-[var(--cms-action)]">
          Back to championships
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Crumbs
        items={[
          { href: "/championships", label: "Championships" },
          { label: championship.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{championship.name} · Sport</h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Click a sport to open its categories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={available.length === 0}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Add sport
        </button>
      </div>

      <TableControls search={search} onSearch={setSearch} placeholder="Search sport or code">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Mode
          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as "" | SportEventMode)}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="team">Team</option>
            <option value="solo">Solo</option>
            <option value="both">Both</option>
          </select>
        </label>
      </TableControls>

      <div className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[var(--cms-muted)]">
            <tr>
              <SortTh label="Sport" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Code" column="code" sort={sort} onSort={setSort} />
              <SortTh label="Mode" column="mode" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((sport) => {
              const eventCount =
                offerings.find((item) => item.sportId === sport.id)?.categoryIds.length ?? 0;
              return (
                <tr
                  key={sport.id}
                  className="cursor-pointer border-t border-[var(--cms-line)]"
                  onClick={() =>
                    router.push(`/championships/${championshipId}/sports/${sport.id}/categories`)
                  }
                >
                  <td className="px-4 py-3 font-medium text-[var(--cms-action)]">{sport.name}</td>
                  <td className="px-4 py-3">{sport.code}</td>
                  <td className="px-4 py-3 capitalize">{sport.eventMode}</td>
                  <td className="px-4 py-3">{eventCount}</td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="text-red-600"
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
                    </button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {assigned.length === 0 ? "No sports yet." : "No matching sports."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} title="Add sport" onClose={() => setFormOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!sportId) {
              toast.error("Sport is required.");
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
            await load();
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sport
            <select
              value={sportId}
              onChange={(event) => setSportId(event.target.value)}
              className={fieldClass}
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
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !sportId}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Add sport
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="h-10 rounded-lg border border-[var(--cms-line)] px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
