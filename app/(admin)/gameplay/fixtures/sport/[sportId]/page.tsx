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
  writeEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import {
  clampAttemptCount,
  clampHeatLanes,
  defaultFieldAttemptPlan,
  isAthleticsFormat,
} from "@/lib/utils/athletics";
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
  lanes: 8,
  roundAttempts: {} as Record<string, number>,
  status: "draft" as FixtureStatus,
  startDate: "",
  endDate: "",
};

function attemptsForRounds(rounds: FixtureRoundType[]) {
  const next: Record<string, number> = {};
  for (const round of rounds) {
    next[round] = defaultFieldAttemptPlan(round).attemptCount;
  }
  return next;
}

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
  const visibleCscs = useMemo(() => {
    return cscs.filter((row) => cscPassesEventFilter(row, activeFilter));
  }, [cscs, activeFilter]);
  const usedCscIds = useMemo(() => new Set(fixtures.map((item) => item.cscId)), [fixtures]);
  const selectedCsc = cscs.find((item) => item.id === form.cscId) ?? null;
  const athleticsDraw = selectedCsc
    ? isAthleticsFormat(selectedCsc.defaultFormat)
    : isAthleticsFormat(form.formatType);
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
    const formatType = csc?.defaultFormat ?? emptyForm.formatType;
    setEditingId(null);
    setForm({
      ...emptyForm,
      cscId,
      formatType,
      rounds: roundsForFormat(formatType, csc?.availableRounds ?? []),
      lanes: clampHeatLanes(csc?.participantsPerMatch ?? 8),
      roundAttempts: attemptsForRounds(roundsForFormat(formatType, csc?.availableRounds ?? [])),
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
      const allowed = roundsForFormat(formatType, csc?.availableRounds ?? []);
      const allowedSet = new Set(allowed);
      let nextRounds = current.rounds.filter((round) => allowedSet.has(round));
      if (nextRounds.length === 0) nextRounds = [...allowed];
      if (formatType === "league_knockout" && allowedSet.has("league") && !nextRounds.includes("league")) {
        nextRounds.unshift("league");
      }
      return { ...current, formatType, rounds: nextRounds };
    });
  };

  const toggleRound = (round: string) => {
    const typed = round as FixtureRoundType;
    setForm((current) => {
      if (
        current.formatType === "league_knockout" &&
        (typed === "league" || typed === "semi_final" || typed === "final")
      ) {
        return current;
      }
      const has = current.rounds.includes(typed);
      if (has) return { ...current, rounds: current.rounds.filter((item) => item !== typed) };
      return {
        ...current,
        rounds: [...current.rounds, typed],
        roundAttempts: {
          ...current.roundAttempts,
          [typed]: current.roundAttempts[typed] ?? defaultFieldAttemptPlan(typed).attemptCount,
        },
      };
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
      participantsPerMatch: form.lanes,
      roundAttempts:
        form.formatType === "field_attempts"
          ? Object.fromEntries(
              form.rounds.map((round) => [
                round,
                {
                  attemptCount:
                    form.roundAttempts[round] ?? defaultFieldAttemptPlan(round).attemptCount,
                  extraAttemptCount: 0,
                },
              ]),
            )
          : undefined,
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
      <PageHeader title="Categories" hint="All categories for this sport until you filter." />
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
      ) : visibleCscs.length === 0 ? (
        <EmptyState title="No categories for this filter" hint="Clear a chip to see more." />
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
                    ageGroup: csc.categoryAgeGroup,
                    categoryId: csc.categoryId,
                    categoryName: csc.categoryName,
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
                  <p className="mt-2 text-sm text-[var(--ops-text-muted)]">
                    {formatLabel(csc.defaultFormat)}. Create a draw to add matches.
                  </p>
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
              {athleticsDraw ? (
                <p className="text-sm text-[var(--ops-text-muted)]">
                  {formatLabel(form.formatType)} is set on the category and does not change.
                </p>
              ) : (
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
              )}
              {form.formatType === "track_rounds" ? (
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Lanes per heat
                  <input
                    type="number"
                    min={2}
                    max={24}
                    value={form.lanes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lanes: clampHeatLanes(Number(event.target.value)),
                      }))
                    }
                    className={fieldClass}
                  />
                </label>
              ) : null}
              {form.formatType === "field_attempts" ? (
                <div className="grid gap-3">
                  <p className="text-sm font-medium">Attempts per athlete</p>
                  <p className="text-xs text-[var(--ops-text-muted)]">
                    Unique for each round. Default is 3 in qualifying and 2 in the final.
                  </p>
                  {form.rounds.map((round) => {
                    const attempts =
                      form.roundAttempts[round] ?? defaultFieldAttemptPlan(round).attemptCount;
                    return (
                      <label
                        key={round}
                        className="grid grid-cols-[1fr_6rem] items-end gap-2 text-sm font-medium"
                      >
                        <span className="pb-2">{roundLabel(round)}</span>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={attempts}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              roundAttempts: {
                                ...current.roundAttempts,
                                [round]: clampAttemptCount(
                                  Number(event.target.value),
                                  defaultFieldAttemptPlan(round).attemptCount,
                                ),
                              },
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}
              <div className="grid gap-2">
                <p className="text-sm font-medium">Rounds</p>
                {athleticsDraw ? null : (
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
                )}
                <RoundChips
                  options={roundChoices.map((round) => ({
                    value: round,
                    label: roundLabel(round),
                    locked:
                      form.formatType === "league_knockout" &&
                      (round === "league" || round === "semi_final" || round === "final"),
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
