"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { RoundChips } from "@/components/RoundChips";
import { SortTh, TableControls } from "@/components/table";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import {
  archiveFixture,
  createFixture,
  listCscOptions,
  listFixtures,
  updateFixture,
} from "@/lib/services";
import type {
  CscOption,
  Fixture,
  FixtureFormatType,
  FixtureRoundType,
  FixtureStatus,
} from "@/lib/types/cms";
import {
  applyKnockoutPreset,
  formatLabel,
  PRESET_QF_FINAL,
  PRESET_SF_FINAL,
  roundLabel,
  roundsForFormat,
  validateFixtureRounds,
} from "@/lib/utils/fixtures";
import { cn } from "@/lib/utils/cn";
import { compareNumber, compareText, matchesQuery, type SortState } from "@/lib/utils/table";

const emptyForm = {
  cscId: "",
  formatType: "bracket_elimination" as FixtureFormatType,
  rounds: [] as FixtureRoundType[],
  status: "draft" as FixtureStatus,
  startDate: "",
  endDate: "",
};

export default function FixturesPage() {
  const router = useRouter();
  const { selected, loading } = useChampionship();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [cscs, setCscs] = useState<CscOption[]>([]);
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<"" | FixtureFormatType>("");
  const [sort, setSort] = useState<SortState<"category" | "sport" | "format" | "status" | "matches">>({
    key: "category",
    dir: "asc",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    if (!selected) {
      setFixtures([]);
      setCscs([]);
      return;
    }
    const [fixtureRes, cscRes] = await Promise.all([
      listFixtures(selected.id),
      listCscOptions({ championshipId: selected.id }),
    ]);
    if (fixtureRes.error) toast.error(fixtureRes.error.message);
    if (cscRes.error) toast.error(cscRes.error.message);
    setFixtures(fixtureRes.data ?? []);
    setCscs(cscRes.data ?? []);
  }, [selected]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  const usedCscIds = useMemo(() => new Set(fixtures.map((item) => item.cscId)), [fixtures]);
  const availableCscs = cscs.filter((item) => !usedCscIds.has(item.id));
  const selectedCsc = cscs.find((item) => item.id === form.cscId) ?? null;
  const roundChoices = selectedCsc
    ? roundsForFormat(form.formatType, selectedCsc.availableRounds)
    : [];

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    const first = availableCscs[0];
    setEditingId(null);
    setForm({
      ...emptyForm,
      cscId: first?.id ?? "",
      rounds:
        first && emptyForm.formatType === "league_knockout" && first.availableRounds.includes("league")
          ? ["league"]
          : [],
    });
    setFormOpen(true);
  };

  const openEdit = (row: Fixture) => {
    setEditingId(row.id);
    setForm({
      ...emptyForm,
      cscId: row.cscId,
      formatType: row.formatType,
      status: row.status,
      startDate: row.startDate ?? "",
      endDate: row.endDate ?? "",
    });
    setFormOpen(true);
  };

  const setFormat = (formatType: FixtureFormatType) => {
    setForm((current) => {
      const csc = cscs.find((item) => item.id === current.cscId);
      const allowed = new Set(roundsForFormat(formatType, csc?.availableRounds ?? []));
      const nextRounds = current.rounds.filter((round) => allowed.has(round));
      if (formatType === "league_knockout" && allowed.has("league") && !nextRounds.includes("league")) {
        nextRounds.unshift("league");
      }
      return { ...current, formatType, rounds: nextRounds };
    });
  };

  const toggleRound = (round: string) => {
    const typed = round as FixtureRoundType;
    setForm((current) => {
      if (current.formatType === "league_knockout" && typed === "league") return current;
      const has = current.rounds.includes(typed);
      if (has) return { ...current, rounds: current.rounds.filter((item) => item !== typed) };
      return { ...current, rounds: [...current.rounds, typed] };
    });
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    if (editingId) {
      const result = await updateFixture(editingId, {
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      setSaving(false);
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Fixture updated.");
      closeForm();
      await load();
      return;
    }
    const roundsErr = validateFixtureRounds(form.formatType, form.rounds);
    if (roundsErr) {
      setSaving(false);
      toast.error(roundsErr);
      return;
    }
    if (!form.cscId) {
      setSaving(false);
      toast.error("Category is required.");
      return;
    }
    const result = await createFixture({
      cscId: form.cscId,
      formatType: form.formatType,
      rounds: form.rounds,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Fixture created.");
    closeForm();
    await load();
  };

  const visible = useMemo(() => {
    const filtered = fixtures.filter((row) => {
      if (formatFilter && row.formatType !== formatFilter) return false;
      return matchesQuery(
        search,
        row.categoryLabel,
        row.sportName,
        formatLabel(row.formatType),
        row.status,
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "sport") return compareText(a.sportName, b.sportName, sort.dir);
      if (sort.key === "format") {
        return compareText(formatLabel(a.formatType), formatLabel(b.formatType), sort.dir);
      }
      if (sort.key === "status") return compareText(a.status, b.status, sort.dir);
      if (sort.key === "matches") return compareNumber(a.matchCount, b.matchCount, sort.dir);
      return compareText(a.categoryLabel, b.categoryLabel, sort.dir);
    });
  }, [fixtures, search, formatFilter, sort]);

  if (loading) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!selected) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Fixtures</h1>
        <p className="mt-2 text-sm text-[var(--cms-muted)]">
          Select a championship to manage fixtures.
        </p>
        <Link
          href="/championships"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white"
        >
          Championship management
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{selected.name} · Fixtures</h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Click a fixture to open its matches. One draw per offered category.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={availableCscs.length === 0}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Add fixture
        </button>
      </div>

      <TableControls search={search} onSearch={setSearch} placeholder="Search category or sport">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Format
          <select
            value={formatFilter}
            onChange={(event) => setFormatFilter(event.target.value as "" | FixtureFormatType)}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="league_knockout">League + bracket</option>
            <option value="bracket_elimination">Bracket elimination</option>
          </select>
        </label>
      </TableControls>

      <div className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[var(--cms-muted)]">
            <tr>
              <SortTh label="Category" column="category" sort={sort} onSort={setSort} />
              <SortTh label="Sport" column="sport" sort={sort} onSort={setSort} />
              <SortTh label="Format" column="format" sort={sort} onSort={setSort} />
              <SortTh label="Status" column="status" sort={sort} onSort={setSort} />
              <SortTh label="Matches" column="matches" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-[var(--cms-line)]"
                onClick={() => router.push(`/gameplay/fixtures/${row.id}/matches`)}
              >
                <td className="px-4 py-3 font-medium text-[var(--cms-action)]">{row.categoryLabel}</td>
                <td className="px-4 py-3">{row.sportName}</td>
                <td className="px-4 py-3">{formatLabel(row.formatType)}</td>
                <td className="px-4 py-3 capitalize">{row.status.replace("_", " ")}</td>
                <td className="px-4 py-3">{row.matchCount}</td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="mr-3 text-[var(--cms-action)]"
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      if (!confirm(`Delete fixture for ${row.categoryLabel}?`)) return;
                      const { error } = await archiveFixture(row.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {fixtures.length === 0 ? "No fixtures yet." : "No matching fixtures."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        title={editingId ? "Edit fixture" : "Add fixture"}
        onClose={closeForm}
        wide
      >
        <form onSubmit={onSave} className="grid gap-4">
          {editingId ? (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as FixtureStatus,
                  }))
                }
                className={fieldClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Category
                <select
                  value={form.cscId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cscId: event.target.value,
                      rounds:
                        current.formatType === "league_knockout"
                          ? ["league"]
                          : [],
                    }))
                  }
                  className={fieldClass}
                >
                  {availableCscs.length === 0 ? (
                    <option value="">All categories already have a fixture</option>
                  ) : (
                    availableCscs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sportName} · {item.categoryLabel}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Format</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      {
                        value: "bracket_elimination" as const,
                        title: "Bracket elimination",
                        hint: "Knockout only",
                      },
                      {
                        value: "league_knockout" as const,
                        title: "League + bracket",
                        hint: "League then knockout",
                      },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormat(option.value)}
                      className={cn(
                        "rounded-xl border p-4 text-left",
                        form.formatType === option.value
                          ? "border-[var(--cms-action)] bg-slate-50"
                          : "border-[var(--cms-line)] hover:bg-slate-50",
                      )}
                    >
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className="mt-1 text-xs text-[var(--cms-muted)]">{option.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Rounds</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--cms-action)]"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        rounds: applyKnockoutPreset(
                          current.formatType,
                          PRESET_QF_FINAL,
                          selectedCsc?.availableRounds ?? [],
                        ),
                      }))
                    }
                  >
                    Knockout (QF–Final)
                  </button>
                  <span className="text-[var(--cms-muted)]">·</span>
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--cms-action)]"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        rounds: applyKnockoutPreset(
                          current.formatType,
                          PRESET_SF_FINAL,
                          selectedCsc?.availableRounds ?? [],
                        ),
                      }))
                    }
                  >
                    Knockout (SF–Final)
                  </button>
                </div>
                <RoundChips
                  options={roundChoices.map((round) => ({
                    value: round,
                    label: roundLabel(round),
                    locked: form.formatType === "league_knockout" && round === "league",
                  }))}
                  selected={form.rounds}
                  onSelect={toggleRound}
                />
              </div>
            </>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Start date
            <input
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, startDate: event.target.value }))
              }
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            End date
            <input
              type="date"
              value={form.endDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, endDate: event.target.value }))
              }
              className={fieldClass}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || (!editingId && !form.cscId)}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingId ? "Save changes" : "Add fixture"}
            </button>
            <button
              type="button"
              onClick={closeForm}
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
