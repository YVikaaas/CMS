"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Collapse from "@mui/material/Collapse";
import Slide from "@mui/material/Slide";
import useMediaQuery from "@mui/material/useMediaQuery";
import { IconCheck } from "@tabler/icons-react";
import { toast } from "sonner";
import { TransitionGroup } from "react-transition-group";
import {
  addChampionshipSports,
  listCategories,
  listChampionshipOfferings,
  listSports,
} from "@/lib/services";
import type { Category, ChampionshipOffering, Gender, Sport } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";
import {
  agesForSportGender,
  genderLabel,
  groupCategoriesByGenderAge,
  offeredCategoryIds,
} from "@/lib/utils/eventFilter";
import { categoryEventName } from "@/lib/utils/labels";
import { SoftButton } from "./SoftButton";
import { SoftCard } from "./SoftCard";
import { Shimmer } from "./loading";

const GENDERS: Gender[] = ["male", "female"];

function toggleValue(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function setMany(current: Set<string>, ids: string[], on: boolean): Set<string> {
  const next = new Set(current);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next;
}

type SlideDir = "left" | "right" | "up";

function motionTimeout(ms: number) {
  return { appear: ms, enter: ms, exit: Math.round(ms * 0.8) };
}

function SlideStage({
  stageKey,
  direction,
  timeout,
  children,
}: {
  stageKey: string;
  direction: SlideDir;
  timeout: number;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <TransitionGroup>
        {stageKey ? (
          <Slide
            key={stageKey}
            direction={direction}
            timeout={motionTimeout(timeout)}
            appear
            onExiting={(node) => {
              node.style.position = "absolute";
              node.style.inset = "0";
              node.style.width = "100%";
            }}
          >
            <div>{children}</div>
          </Slide>
        ) : null}
      </TransitionGroup>
    </div>
  );
}

function TabCard({
  selected,
  title,
  hint,
  onClick,
  compact = false,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "box-border rounded-xl border text-left transition-[border-color,background-color] duration-150",
        compact ? "h-9 min-w-[4.5rem] px-3" : "min-h-[4.25rem] px-4 py-3",
        selected
          ? "border-[var(--ops-text)] bg-[var(--ops-primary-soft)]"
          : "border-[var(--ops-line-strong)] bg-[var(--ops-surface)] hover:bg-[var(--ops-surface-hover)]",
      )}
    >
      <span className={cn("flex gap-2", compact ? "h-full items-center" : "items-start")}>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-medium", compact ? "text-sm" : "text-[15px]")}>{title}</span>
          {hint ? <span className="mt-0.5 block truncate text-xs text-[var(--ops-text-muted)]">{hint}</span> : null}
        </span>
        <IconCheck
          size={compact ? 16 : 18}
          stroke={2}
          className={cn(
            "shrink-0 text-[var(--ops-primary)]",
            compact ? "" : "mt-0.5",
            selected ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
      </span>
    </button>
  );
}

function disciplineTitle(category: Category): string {
  return categoryEventName(category.name) ?? category.name;
}

function GenderColumn({
  gender,
  ages,
  selectedAges,
  leftover,
  selectedIds,
  timeout,
  onToggleAge,
  onToggleDiscipline,
  onToggleGroup,
}: {
  gender: Gender;
  ages: string[];
  selectedAges: Set<string>;
  leftover: Category[];
  selectedIds: Set<string>;
  timeout: number;
  onToggleAge: (age: string) => void;
  onToggleDiscipline: (id: string) => void;
  onToggleGroup: (ids: string[], on: boolean) => void;
}) {
  const groups = groupCategoriesByGenderAge(leftover).filter((group) => group.gender === gender);
  const agePicked = ages.some((age) => selectedAges.has(age));
  const ms = motionTimeout(timeout);

  return (
    <div className="flex min-h-48 flex-col gap-3 rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-board-muted)] p-4">
      <p className="text-[15px] font-semibold">{genderLabel(gender)}</p>
      {ages.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-muted)]">No age groups in the catalog.</p>
      ) : (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={`${genderLabel(gender)} age groups`}>
          {ages.map((age) => (
            <TabCard
              key={age}
              compact
              title={age}
              selected={selectedAges.has(age)}
              onClick={() => onToggleAge(age)}
            />
          ))}
        </div>
      )}
      <Collapse in={!agePicked} timeout={ms} unmountOnExit>
        <p className="text-sm text-[var(--ops-text-muted)]">Pick an age group.</p>
      </Collapse>
      <TransitionGroup>
        {agePicked && leftover.length === 0 ? (
          <Collapse key="empty" timeout={ms}>
            <p className="text-sm text-[var(--ops-text-muted)]">Every matching discipline is already on this event.</p>
          </Collapse>
        ) : null}
        {groups.map((group) => {
          const ids = group.items.map((item) => item.id);
          const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
          const allOn = selectedCount === ids.length;
          return (
            <Collapse key={group.key} timeout={ms}>
              <div className="flex flex-col gap-2 pb-4 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
                    {group.ageGroup}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--ops-primary)]"
                    onClick={() => onToggleGroup(ids, !allOn)}
                  >
                    {allOn ? "Clear" : "Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2" role="tablist" aria-label={`${group.label} disciplines`}>
                  {group.items.map((category) => (
                    <TabCard
                      key={category.id}
                      compact
                      title={disciplineTitle(category)}
                      selected={selectedIds.has(category.id)}
                      onClick={() => onToggleDiscipline(category.id)}
                    />
                  ))}
                </div>
              </div>
            </Collapse>
          );
        })}
      </TransitionGroup>
    </div>
  );
}

export function EventSetupWizard({
  eventId,
  eventName,
  onAdded,
}: {
  eventId: string;
  eventName: string;
  onAdded?: () => void;
}) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offerings, setOfferings] = useState<ChampionshipOffering[]>([]);
  const [ready, setReady] = useState(false);
  const [sportId, setSportId] = useState("");
  const [ageKeys, setAgeKeys] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [slideDir, setSlideDir] = useState<SlideDir>("up");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const motionMs = reduceMotion ? 0 : 220;

  const load = useCallback(async () => {
    const [sportRes, catRes, offerRes] = await Promise.all([
      listSports(),
      listCategories(),
      listChampionshipOfferings(eventId),
    ]);
    if (sportRes.error) toast.error(sportRes.error.message);
    if (catRes.error) toast.error(catRes.error.message);
    if (offerRes.error) toast.error(offerRes.error.message);
    setSports(sportRes.data ?? []);
    setCategories(catRes.data ?? []);
    setOfferings(offerRes.data ?? []);
    setReady(true);
  }, [eventId]);

  useEffect(() => {
    setReady(false);
    setSportId("");
    setAgeKeys(new Set());
    setSelectedIds(new Set());
    void load();
  }, [eventId, load]);

  const assignedIds = useMemo(() => offeredCategoryIds(offerings), [offerings]);
  const sport = sports.find((row) => row.id === sportId) ?? null;
  const sportCategories = useMemo(
    () => (sportId ? categories.filter((row) => row.sportId === sportId) : []),
    [categories, sportId],
  );

  const leftover = useMemo(() => {
    if (!sportId || ageKeys.size === 0) return [];
    return sportCategories.filter((row) => {
      if (assignedIds.has(row.id)) return false;
      return ageKeys.has(`${row.gender}:${row.ageGroup}`);
    });
  }, [ageKeys, assignedIds, sportCategories, sportId]);

  const leftoverKey = leftover.map((row) => row.id).sort().join(",");
  useEffect(() => {
    setSelectedIds(new Set(leftoverKey ? leftoverKey.split(",") : []));
  }, [leftoverKey]);

  const pickSport = (id: string) => {
    if (id === sportId) return;
    const from = sports.findIndex((row) => row.id === sportId);
    const to = sports.findIndex((row) => row.id === id);
    if (!sportId) setSlideDir("up");
    else setSlideDir(to < from ? "right" : "left");
    setSportId(id);
    setAgeKeys(new Set());
    setSelectedIds(new Set());
  };

  const toggleAge = (gender: Gender, age: string) => {
    setAgeKeys(toggleValue(ageKeys, `${gender}:${age}`));
  };

  const onAdd = async () => {
    if (!sportId || selectedIds.size === 0) {
      toast.error("Select at least one discipline.");
      return;
    }
    setSaving(true);
    const { error } = await addChampionshipSports(eventId, [sportId], {
      categoriesBySport: { [sportId]: [...selectedIds] },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const count = selectedIds.size;
    toast.success(`Added ${count} ${count === 1 ? "discipline" : "disciplines"}.`);
    setSelectedIds(new Set());
    await load();
    onAdded?.();
  };

  const offeredSport = Boolean(sportId && offerings.some((row) => row.sportId === sportId));

  return (
    <SoftCard className="flex flex-col gap-5">
      <div>
        <p className="text-base font-semibold">Setup {eventName}</p>
        <p className="mt-0.5 text-sm text-[var(--ops-text-muted)]">
          Pick a sport, then add Boys and Girls age groups and disciplines.
        </p>
      </div>

      {!ready ? (
        <div className="grid gap-3">
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-48 w-full" />
        </div>
      ) : sports.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-muted)]">No sports in the catalog yet.</p>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold">Sport</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="tablist" aria-label="Sport">
              {sports.map((row) => (
                <TabCard
                  key={row.id}
                  title={row.name}
                  hint={row.code}
                  selected={sportId === row.id}
                  onClick={() => pickSport(row.id)}
                />
              ))}
            </div>
            {sport ? (
              <p className="mt-2 text-xs text-[var(--ops-text-muted)]">
                One sport at a time
                {offeredSport ? " · already on this event — add more below" : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--ops-text-muted)]">Select one sport.</p>
            )}
          </div>

          <Collapse in={Boolean(sportId)} timeout={motionTimeout(motionMs)}>
            <SlideStage stageKey={sportId} direction={slideDir} timeout={motionMs}>
              <div className="grid gap-4 md:grid-cols-2">
                {GENDERS.map((gender) => {
                  const ages = agesForSportGender(sportCategories, gender);
                  const selectedAges = new Set(
                    [...ageKeys]
                      .filter((key) => key.startsWith(`${gender}:`))
                      .map((key) => key.slice(gender.length + 1)),
                  );
                  return (
                    <GenderColumn
                      key={gender}
                      gender={gender}
                      ages={ages}
                      selectedAges={selectedAges}
                      leftover={leftover.filter((row) => row.gender === gender)}
                      selectedIds={selectedIds}
                      timeout={motionMs}
                      onToggleAge={(age) => toggleAge(gender, age)}
                      onToggleDiscipline={(id) => setSelectedIds(toggleValue(selectedIds, id))}
                      onToggleGroup={(ids, on) => setSelectedIds(setMany(selectedIds, ids, on))}
                    />
                  );
                })}
              </div>
            </SlideStage>
          </Collapse>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--ops-text-muted)]">
              {!sportId
                ? "Pick a sport to start."
                : ageKeys.size === 0
                  ? "Pick an age group in Boys or Girls."
                  : `${selectedIds.size} selected`}
            </p>
            <SoftButton
              variant="primary"
              loading={saving}
              disabled={!sportId || selectedIds.size === 0}
              onClick={() => void onAdd()}
            >
              {selectedIds.size > 0 ? `Add ${selectedIds.size}` : "Add"}
            </SoftButton>
          </div>
        </>
      )}
    </SoftCard>
  );
}
