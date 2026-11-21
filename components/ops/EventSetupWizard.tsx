"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
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
import { isAthleticsSport } from "@/lib/utils/fixtures";
import { categoryEventName } from "@/lib/utils/labels";
import { PickGroup, PickItem, PickList } from "./PickList";
import { Shimmer } from "./loading";

const GENDERS: Gender[] = ["male", "female"];
const STEP_COUNT = 4;
type Step = 1 | 2 | 3 | 4;
type SlideDir = "left" | "right" | "up";

const STEPS: { title: string; explanation: string }[] = [
  {
    title: "Which sport?",
    explanation:
      "Pick a sport already on this championship to add more events or open it to edit. Or pick a new sport to add.",
  },
  {
    title: "Who is competing?",
    explanation: "Choose who this sport is for. Tap Boys, Girls, or both — whichever groups will compete.",
  },
  {
    title: "Which ages?",
    explanation: "U16 means athletes under 16 years old. Pick every age group that will compete.",
  },
  {
    title: "Which events?",
    explanation: "These are the races or matches. Leave them all on, or uncheck any you don’t need.",
  },
];

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
  badge,
  onClick,
  disabled = false,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "box-border min-h-[4.5rem] rounded-xl border-2 px-4 py-3 text-left transition-[border-color,background-color,color] duration-150",
        selected
          ? "border-[var(--ops-text)] bg-[var(--ops-primary)] text-[var(--ops-on-primary)]"
          : "border-[var(--ops-text)] bg-white text-[var(--ops-text)] hover:bg-[#f3fbf8]",
        disabled && "cursor-not-allowed opacity-50 hover:bg-white",
      )}
    >
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{title}</span>
            {badge ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                  selected
                    ? "bg-white text-[var(--ops-primary)]"
                    : "bg-[var(--ops-primary)] text-[var(--ops-on-primary)]",
                )}
              >
                {badge}
              </span>
            ) : null}
          </span>
          {hint ? (
            <span className={cn("mt-0.5 block text-xs", selected ? "text-white/85" : "text-[var(--ops-text-muted)]")}>
              {hint}
            </span>
          ) : null}
        </span>
        <IconCheck
          size={18}
          stroke={2.5}
          className={cn("mt-0.5 shrink-0", selected ? "text-white opacity-100" : "opacity-0")}
          aria-hidden
        />
      </span>
    </button>
  );
}

function formActionClass(kind: "primary" | "secondary", disabled?: boolean) {
  return cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold",
    kind === "primary" &&
      "border-2 border-[var(--ops-text)] bg-[var(--ops-primary)] text-[var(--ops-on-primary)] hover:bg-[var(--ops-primary-hover)]",
    kind === "secondary" &&
      "border-2 border-[var(--ops-text)] bg-white text-[var(--ops-text)] hover:bg-[#f3fbf8]",
    disabled && "pointer-events-none opacity-45",
  );
}

function FormAction({
  children,
  kind = "primary",
  disabled,
  loading,
  href,
  onClick,
}: {
  children: ReactNode;
  kind?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = formActionClass(kind, disabled || loading);
  if (href) {
    return (
      <Link href={href} className={className} aria-disabled={disabled || loading}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} disabled={disabled || loading} onClick={onClick}>
      {loading ? "Saving…" : children}
    </button>
  );
}

function AgeChip({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-xl border-2 px-4 text-sm font-semibold transition-[border-color,background-color,color] duration-150",
        selected
          ? "border-[var(--ops-text)] bg-[var(--ops-primary)] text-[var(--ops-on-primary)]"
          : "border-[var(--ops-text)] bg-white text-[var(--ops-text)] hover:bg-[#f3fbf8]",
      )}
    >
      {label}
    </button>
  );
}

function eventTitle(category: Category): string {
  return categoryEventName(category.name) ?? category.name;
}

function sportBlurb(sport: Sport): string {
  if (isAthleticsSport(sport)) return "Track and field races and jumps";
  const name = sport.name.toLowerCase();
  if (name.includes("basket")) return "Team basketball matches";
  if (sport.eventMode === "solo") return "Individual events";
  if (sport.eventMode === "team") return "Team matches";
  return "Team and individual events";
}

function sportCardHint(sport: Sport, leftoverCount: number, catalogCount: number, offered: boolean): string {
  if (catalogCount === 0) return "No events in the catalog yet";
  if (leftoverCount === 0 && offered) return "All events are already here — open to edit";
  if (offered) {
    return leftoverCount === 1 ? "1 event still to add" : `${leftoverCount} events still to add`;
  }
  return sportBlurb(sport);
}

function sportBadge(leftoverCount: number, catalogCount: number, offered: boolean): string {
  if (catalogCount === 0) return "No events";
  if (offered && leftoverCount === 0) return "Edit";
  if (offered) return "Add more";
  return "Add";
}

function genderBlurb(gender: Gender): string {
  return gender === "male" ? "Boys’ races and matches" : "Girls’ races and matches";
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
  const [step, setStep] = useState<Step>(1);
  const [sportId, setSportId] = useState("");
  const [genders, setGenders] = useState<Set<Gender>>(new Set());
  const [ageKeys, setAgeKeys] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState<SlideDir>("left");
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
    setStep(1);
    setSportId("");
    setGenders(new Set());
    setAgeKeys(new Set());
    setSelectedIds(new Set());
    setSuccess(null);
    void load();
  }, [eventId, load]);

  const assignedIds = useMemo(() => offeredCategoryIds(offerings), [offerings]);
  const sport = sports.find((row) => row.id === sportId) ?? null;
  const offeredSportIds = useMemo(() => new Set(offerings.map((row) => row.sportId)), [offerings]);
  const onChampionship = useMemo(
    () => sports.filter((row) => offeredSportIds.has(row.id)),
    [offeredSportIds, sports],
  );
  const notOnChampionship = useMemo(
    () => sports.filter((row) => !offeredSportIds.has(row.id)),
    [offeredSportIds, sports],
  );
  const editHref = sportId ? `/events/${eventId}/sports/${sportId}/categories` : "";

  const leftoverBySport = useMemo(() => {
    const leftover = new Map<string, number>();
    const catalog = new Map<string, number>();
    for (const row of categories) {
      catalog.set(row.sportId, (catalog.get(row.sportId) ?? 0) + 1);
      if (assignedIds.has(row.id)) continue;
      leftover.set(row.sportId, (leftover.get(row.sportId) ?? 0) + 1);
    }
    return { leftover, catalog };
  }, [assignedIds, categories]);

  const sportLeftover = useMemo(() => {
    if (!sportId) return [];
    return categories.filter((row) => row.sportId === sportId && !assignedIds.has(row.id));
  }, [assignedIds, categories, sportId]);

  const leftover = useMemo(() => {
    if (ageKeys.size === 0) return [];
    return sportLeftover.filter((row) => ageKeys.has(`${row.gender}:${row.ageGroup}`));
  }, [ageKeys, sportLeftover]);
  const canEditOnly = Boolean(sportId && sportLeftover.length === 0 && offeredSportIds.has(sportId));

  const leftoverKey = leftover.map((row) => row.id).sort().join(",");
  useEffect(() => {
    setSelectedIds(new Set(leftoverKey ? leftoverKey.split(",") : []));
  }, [leftoverKey]);

  const resetBelowSport = () => {
    setGenders(new Set());
    setAgeKeys(new Set());
    setSelectedIds(new Set());
  };

  const pickSport = (id: string) => {
    if (id === sportId) return;
    setSportId(id);
    resetBelowSport();
    setSuccess(null);
  };

  const toggleGender = (gender: Gender) => {
    const next = new Set(genders);
    if (next.has(gender)) {
      next.delete(gender);
      setAgeKeys(new Set([...ageKeys].filter((key) => !key.startsWith(`${gender}:`))));
    } else {
      next.add(gender);
    }
    setGenders(next);
  };

  const toggleAge = (gender: Gender, age: string) => {
    setAgeKeys(toggleValue(ageKeys, `${gender}:${age}`));
  };

  const canContinue = (() => {
    if (step === 1) return Boolean(sportId) && sportLeftover.length > 0;
    if (step === 2) {
      if (genders.size === 0) return false;
      return sportLeftover.some((row) => genders.has(row.gender));
    }
    if (step === 3) return leftover.length > 0;
    return selectedIds.size > 0;
  })();

  const statusText = (() => {
    if (step === 1) {
      if (!sportId) return "Choose a sport to add, or one already here to add more events or edit.";
      if ((leftoverBySport.catalog.get(sportId) ?? 0) === 0) {
        return "This sport has no events in the catalog yet. Add them under Catalog → Sports first.";
      }
      if (sportLeftover.length === 0) {
        return `Every ${sport?.name ?? "this sport"} event is already on this championship. Open it to review or edit.`;
      }
      return offeredSportIds.has(sportId)
        ? `${sport?.name ?? "This sport"} is already here — continue to add more events.`
        : `${sport?.name ?? "This sport"} is new — continue to add it.`;
    }
    if (step === 2) {
      if (genders.size === 0) return "Tap Boys, Girls, or both.";
      if (!sportLeftover.some((row) => genders.has(row.gender))) {
        return "Every event for that group is already on this championship. Pick the other group, or go back.";
      }
      return genders.size === 2
        ? "Boys and Girls — continue to pick ages."
        : `${[...genders].map(genderLabel).join("")} — continue to pick ages.`;
    }
    if (step === 3) {
      if (ageKeys.size === 0) return "Pick at least one age group.";
      if (leftover.length === 0) return "Those ages have no events left to add. Pick a different age.";
      const n = leftover.length;
      return `${n} ${n === 1 ? "event" : "events"} ready — continue to review them.`;
    }
    if (selectedIds.size === 0) return "Select at least one event to add.";
    const n = selectedIds.size;
    return `${n} ${n === 1 ? "event" : "events"} selected.`;
  })();

  const goNext = () => {
    if (step >= STEP_COUNT || !canContinue) return;
    setSlideDir("left");
    setStep((current) => (current + 1) as Step);
  };

  const goBack = () => {
    if (step <= 1) return;
    setSlideDir("right");
    if (step === 2) resetBelowSport();
    setStep((current) => (current - 1) as Step);
  };

  const onAdd = async () => {
    if (!sportId || selectedIds.size === 0) {
      toast.error("Select at least one event.");
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
    const name = sport?.name ?? "This sport";
    toast.success(`Added ${count} ${count === 1 ? "event" : "events"}.`);
    setSuccess(`${name} is on this championship. Add another sport, or you’re done.`);
    setStep(1);
    setSportId("");
    resetBelowSport();
    setSlideDir("right");
    await load();
    onAdded?.();
  };

  const copy = STEPS[step - 1];

  return (
    <section
      aria-labelledby="event-setup-title"
      className="scroll-mt-24 overflow-hidden rounded-2xl border-2 border-[var(--ops-primary)] bg-[#d8eee8] shadow-[4px_4px_0_var(--ops-text)]"
    >
      <header className="bg-[var(--ops-primary)] px-5 py-4 text-[var(--ops-on-primary)]">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase opacity-90">Championship setup form</p>
        <h2 id="event-setup-title" className="mt-1 text-lg font-semibold">
          Set up {eventName} — 4 easy steps
        </h2>
        <p className="mt-1 text-sm opacity-90">
          This is the form that puts sports on the championship. Add a new sport, or add more events to one already here.
        </p>
      </header>

      <div className="flex flex-col gap-5 p-5">
      {success ? (
        <p
          role="status"
          className="rounded-xl border border-[var(--ops-primary)]/30 bg-white px-4 py-3 text-sm"
        >
          {success}
        </p>
      ) : null}

      {!ready ? (
        <div className="grid gap-3">
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-48 w-full" />
        </div>
      ) : sports.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--ops-text-muted)]">
            No sports in the catalog yet. Add them under Catalog → Sports first.
          </p>
          <FormAction href="/masters/sports">Open Catalog → Sports</FormAction>
        </div>
      ) : (
        <>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Step {step} of {STEP_COUNT}
              </p>
            </div>
            <div className="mb-4 flex gap-1.5" aria-hidden>
              {STEPS.map((_, index) => (
                <span
                  key={STEPS[index].title}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    index < step ? "bg-[var(--ops-primary)]" : "bg-white",
                  )}
                />
              ))}
            </div>
            <p className="text-lg font-semibold">{copy.title}</p>
            <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{copy.explanation}</p>
          </div>

          <SlideStage stageKey={String(step)} direction={slideDir} timeout={motionMs}>
            {step === 1 ? (
              <div className="flex flex-col gap-5">
                {onChampionship.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-semibold">Already on this championship</p>
                      <p className="text-xs text-[var(--ops-text-muted)]">
                        Add more events, or open a sport to edit if everything is already added.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="tablist" aria-label="Sports already on this championship">
                      {onChampionship.map((row) => (
                        <TabCard
                          key={row.id}
                          title={row.name}
                          badge={sportBadge(
                            leftoverBySport.leftover.get(row.id) ?? 0,
                            leftoverBySport.catalog.get(row.id) ?? 0,
                            true,
                          )}
                          hint={sportCardHint(
                            row,
                            leftoverBySport.leftover.get(row.id) ?? 0,
                            leftoverBySport.catalog.get(row.id) ?? 0,
                            true,
                          )}
                          selected={sportId === row.id}
                          onClick={() => pickSport(row.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {notOnChampionship.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-semibold">Not on this championship yet</p>
                      <p className="text-xs text-[var(--ops-text-muted)]">Pick one of these to add it.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="tablist" aria-label="Sports you can add">
                      {notOnChampionship.map((row) => (
                        <TabCard
                          key={row.id}
                          title={row.name}
                          badge={sportBadge(
                            leftoverBySport.leftover.get(row.id) ?? 0,
                            leftoverBySport.catalog.get(row.id) ?? 0,
                            false,
                          )}
                          hint={sportCardHint(
                            row,
                            leftoverBySport.leftover.get(row.id) ?? 0,
                            leftoverBySport.catalog.get(row.id) ?? 0,
                            false,
                          )}
                          selected={sportId === row.id}
                          onClick={() => pickSport(row.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="tablist" aria-label="Who is competing">
                {GENDERS.map((gender) => {
                  const leftoverCount = sportLeftover.filter((row) => row.gender === gender).length;
                  const noneLeft = leftoverCount === 0;
                  return (
                    <TabCard
                      key={gender}
                      title={genderLabel(gender)}
                      hint={
                        noneLeft
                          ? "All events already on this championship"
                          : `${genderBlurb(gender)} · ${leftoverCount} ${leftoverCount === 1 ? "event" : "events"} to add`
                      }
                      selected={genders.has(gender)}
                      disabled={noneLeft}
                      onClick={() => toggleGender(gender)}
                    />
                  );
                })}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-5">
                {GENDERS.filter((gender) => genders.has(gender)).map((gender) => {
                  const ages = agesForSportGender(sportLeftover, gender);
                  return (
                    <div key={gender} className="flex flex-col gap-2">
                      <p className="text-sm font-semibold">{genderLabel(gender)}</p>
                      {ages.length === 0 ? (
                        <p className="text-sm text-[var(--ops-text-muted)]">
                          No age groups left to add for {genderLabel(gender).toLowerCase()}.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2" role="group" aria-label={`${genderLabel(gender)} ages`}>
                          {ages.map((age) => (
                            <AgeChip
                              key={age}
                              label={age}
                              selected={ageKeys.has(`${gender}:${age}`)}
                              onClick={() => toggleAge(gender, age)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {step === 4 ? (
              leftover.length === 0 ? (
                <p className="text-sm text-[var(--ops-text-muted)]">
                  Every matching event is already on this championship.
                </p>
              ) : (
                <PickList className="max-h-[28rem] border-2 border-[var(--ops-text)] bg-white">
                  {groupCategoriesByGenderAge(leftover).map((group) => {
                    const ids = group.items.map((item) => item.id);
                    const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
                    const allOn = selectedCount === ids.length;
                    return (
                      <div key={group.key}>
                        <PickGroup
                          title={group.label}
                          hint={`${selectedCount} of ${ids.length} selected`}
                          checked={allOn}
                          indeterminate={selectedCount > 0 && !allOn}
                          onToggle={() => setSelectedIds(setMany(selectedIds, ids, !allOn))}
                        />
                        {group.items.map((category) => (
                          <PickItem
                            key={category.id}
                            inset
                            title={eventTitle(category)}
                            checked={selectedIds.has(category.id)}
                            onToggle={() => setSelectedIds(toggleValue(selectedIds, category.id))}
                          />
                        ))}
                      </div>
                    );
                  })}
                </PickList>
              )
            ) : null}
          </SlideStage>

          <p className="text-sm text-[var(--ops-text-muted)]">{statusText}</p>

          <div className="sticky bottom-0 z-10 mt-1 flex w-full flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--ops-text)] bg-[#d8eee8] py-3">
              {step > 1 ? (
                <FormAction kind="secondary" onClick={goBack} disabled={saving}>
                  Back
                </FormAction>
              ) : (
                <span />
              )}
              {step === 1 && canEditOnly ? (
                <FormAction href={editHref}>Open {sport?.name ?? "sport"} to edit</FormAction>
              ) : step < STEP_COUNT ? (
                <FormAction disabled={!canContinue} onClick={goNext}>
                  Continue
                </FormAction>
              ) : (
                <FormAction loading={saving} disabled={!canContinue} onClick={() => void onAdd()}>
                  {selectedIds.size > 0
                    ? `Add ${selectedIds.size} ${selectedIds.size === 1 ? "event" : "events"} to championship`
                    : "Add to championship"}
                </FormAction>
              )}
          </div>
        </>
      )}
      </div>
    </section>
  );
}
