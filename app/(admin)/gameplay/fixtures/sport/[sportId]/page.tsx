"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { RoundChips } from "@/components/RoundChips";
import {
  EmptyState,
  EventFilters,
  PageHeader,
  SoftButton,
  SoftCard,
  StatusBadge,
  StepCrumbs,
} from "@/components/ops";
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
import { cn } from "@/lib/utils/cn";
import {
  cscPassesEventFilter,
  emptyEventFilter,
  isEventFilterSelected,
  writeEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import {
  applyKnockoutPreset,
  formatLabel,
  PRESET_QF_FINAL,
  PRESET_SF_FINAL,
  roundLabel,
  roundsForFormat,
  validateFixtureRounds,
} from "@/lib/utils/fixtures";

const emptyForm = {
  cscId: "",
  formatType: "bracket_elimination" as FixtureFormatType,
  rounds: [] as FixtureRoundType[],
  status: "draft" as FixtureStatus,
  startDate: "",
  endDate: "",
};

const statusTone: Record<FixtureStatus, "neutral" | "primary" | "warning" | "success"> = {
  draft: "neutral",
  published: "primary",
  in_progress: "warning",
  completed: "success",
};

export default function FixtureSportPage() {
  const router = useRouter();
  const params = useParams<{ sportId: string }>();
  const sportId = params.sportId;
  const { selected, loading } = useChampionship();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [cscs, setCscs] = useState<CscOption[]>([]);
  const [ready, setReady] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<EventFilterValue | null>(null);

  const load = useCallback(async () => {
    if (!selected) {
      setFixtures([]);
      setCscs([]);
      setReady(true);
      return;
    }
    const [fixtureRes, cscRes] = await Promise.all([
      listFixtures(selected.id),
      listCscOptions({ championshipId: selected.id, sportId }),
    ]);
    if (fixtureRes.error) toast.error(fixtureRes.error.message);
    if (cscRes.error) toast.error(cscRes.error.message);
    setFixtures((fixtureRes.data ?? []).filter((row) => row.sportId === sportId));
    setCscs(cscRes.data ?? []);
    setReady(true);
  }, [selected, sportId]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  const sportName = cscs[0]?.sportName ?? fixtures[0]?.sportName ?? "Sport";
  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const filtersReady = isEventFilterSelected(activeFilter);
  const visibleCscs = useMemo(() => {
    if (!filtersReady) return [];
    return cscs.filter((row) => cscPassesEventFilter(row, activeFilter));
  }, [cscs, activeFilter, filtersReady]);
  const usedCscIds = useMemo(() => new Set(fixtures.map((item) => item.cscId)), [fixtures]);
  const selectedCsc = cscs.find((item) => item.id === form.cscId) ?? null;
  const roundChoices = selectedCsc
    ? roundsForFormat(form.formatType, selectedCsc.availableRounds)
    : [];

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = (cscId: string) => {
    const csc = cscs.find((item) => item.id === cscId);
    setEditingId(null);
    setForm({
      ...emptyForm,
      cscId,
      rounds:
        emptyForm.formatType === "league_knockout" && csc?.availableRounds.includes("league")
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
      toast.error("Fill the highlighted fields.");
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
    if (result.data) router.push(`/gameplay/fixtures/${result.data.id}`);
  };

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
      <StepCrumbs
        items={[
          { href: "/gameplay/fixtures", label: "Sports" },
          { label: sportName },
        ]}
      />
      <PageHeader title="Categories" hint="Pick gender, then age, then create or open the draw." />
      <EventFilters
        championshipId={selected.id}
        lockSportId={sportId}
        unlockInOrder
        onChange={(value) => setFilter({ ...value })}
      />
      {cscs.length === 0 ? (
        <EmptyState
          title="No categories offered"
          hint="Assign categories for this sport first."
          action={
            <Link href={`/championships/${selected.id}/sports/${sportId}/categories`}>
              <SoftButton variant="primary">Championship categories</SoftButton>
            </Link>
          }
        />
      ) : !activeFilter.gender ? (
        <EmptyState title="Pick gender" hint="Age unlocks after gender." />
      ) : !activeFilter.ageGroup ? (
        <EmptyState title="Pick age" hint="The draw appears after age is selected." />
      ) : visibleCscs.length === 0 ? (
        <EmptyState title="No categories for this filter" hint="Try another gender / age." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCscs.map((csc) => {
            const fixture = fixtures.find((row) => row.cscId === csc.id) ?? null;
            return (
              <SoftCard
                key={csc.id}
                interactive={Boolean(fixture)}
                onClick={() => {
                  if (!fixture || !selected) return;
                  writeEventFilter({
                    championshipId: selected.id,
                    sportId,
                    gender: csc.categoryGender,
                    ageGroup: csc.categoryLabel.replace(/^(Boys|Girls)\s+/, ""),
                    categoryId: csc.categoryId,
                  });
                  router.push(`/gameplay/fixtures/${fixture.id}`);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{csc.categoryLabel}</p>
                  {fixture ? (
                    <StatusBadge tone={statusTone[fixture.status]}>
                      {fixture.status.replace("_", " ")}
                    </StatusBadge>
                  ) : (
                    <StatusBadge>No draw</StatusBadge>
                  )}
                </div>
                {fixture ? (
                  <p className="mt-2 text-sm text-[var(--ops-text-muted)]">
                    {formatLabel(fixture.formatType)} · {fixture.matchCount} matches
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[var(--ops-text-muted)]">Create a draw to add matches.</p>
                )}
                <div
                  className="mt-4 flex justify-end gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  {fixture ? (
                    <>
                      <SoftButton onClick={() => openEdit(fixture)}>Edit</SoftButton>
                      <SoftButton
                        variant="danger"
                        onClick={async () => {
                          if (!confirm(`Delete fixture for ${csc.categoryLabel}?`)) return;
                          const { error } = await archiveFixture(fixture.id);
                          if (error) toast.error(error.message);
                          else await load();
                        }}
                      >
                        Delete
                      </SoftButton>
                    </>
                  ) : (
                    <SoftButton
                      variant="primary"
                      disabled={usedCscIds.has(csc.id)}
                      onClick={() => openCreate(csc.id)}
                    >
                      Create draw
                    </SoftButton>
                  )}
                </div>
              </SoftCard>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        title={editingId ? "Edit fixture" : "Create draw"}
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
                          ? "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)]"
                          : "border-[var(--ops-line)] hover:bg-[var(--ops-board-muted)]",
                      )}
                    >
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{option.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Rounds</p>
                <div className="flex flex-wrap gap-2">
                  <SoftButton
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
                  </SoftButton>
                  <SoftButton
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
                  </SoftButton>
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
            <SoftButton type="submit" variant="primary" loading={saving} disabled={!editingId && !form.cscId}>
              {editingId ? "Save changes" : "Create draw"}
            </SoftButton>
            <SoftButton type="button" onClick={closeForm}>
              Cancel
            </SoftButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
