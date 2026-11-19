"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  listCategories,
  listChampionshipOfferings,
  listFixtures,
  listSports,
} from "@/lib/services";
import type { Category, Gender, Sport } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";
import { PageSkeleton } from "./loading";
import {
  agesForSportGender,
  applyAge,
  applyCategory,
  applyGender,
  applySport,
  categoriesForSportGenderAge,
  emptyEventFilter,
  eventIdentityTitle,
  genderLabel,
  gendersForSport,
  offeredCategories,
  offeredSports,
  isEventFilterComplete,
  readEventFilter,
  settleEventFilter,
  writeEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import Card from "@mui/material/Card";

type StepId = "sport" | "gender" | "age" | "category";

/** Filled menu: label above, rounded field, menu under it. Choosing a value opens the next one. */
function StepSelect({
  id,
  label,
  value,
  options,
  allLabel,
  disabled,
  open,
  onOpen,
  onClose,
  onPick,
}: {
  id: StepId;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
  disabled?: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPick: (value: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  const shown = selected?.label ?? (value === "" ? allLabel ?? "Choose" : "Choose");
  const choices = allLabel ? [{ value: "", label: allLabel }, ...options] : options;

  return (
    <div className="min-w-0">
      <p id={`${id}-label`} className="mb-1 px-1 text-[11px] leading-4 font-medium tracking-[0.5px] text-[var(--ops-text-muted)] uppercase">
        {label}
      </p>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open && !disabled}
        aria-labelledby={`${id}-label`}
        onClick={() => (open ? onClose() : onOpen())}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-full bg-[var(--ops-board-muted)] pr-2 pl-4 text-left text-sm leading-5 font-medium",
          "hover:bg-[var(--ops-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40",
          open && !disabled && "bg-[var(--ops-primary-soft)]",
          !selected && "text-[var(--ops-text-muted)]",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{shown}</span>
        <IconChevronDown size={18} aria-hidden className={cn("shrink-0 text-[var(--ops-text-muted)] transition-transform", open && "rotate-180")} />
      </button>
      <Menu
        anchorEl={buttonRef.current}
        open={open && !disabled}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              borderRadius: "16px",
              maxHeight: 280,
              minWidth: buttonRef.current?.offsetWidth ?? 160,
            },
          },
        }}
      >
        {choices.map((option) => (
          <MenuItem
            key={option.value || "all"}
            selected={option.value === value}
            onClick={() => onPick(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

export function EventFilters({
  championshipId,
  onlyWithExistingFixture = false,
  lockSportId,
  unlockInOrder = true,
  requireEvent = onlyWithExistingFixture,
  aside,
  onChange,
}: {
  championshipId: string;
  onlyWithExistingFixture?: boolean;
  lockSportId?: string;
  unlockInOrder?: boolean;
  /** The page needs a full event (sport → event). No "All" chips; folds away once picked. */
  requireEvent?: boolean;
  /** Right side of the event strip, e.g. a view switch. */
  aside?: ReactNode;
  onChange?: (
    value: EventFilterValue,
    meta: { sport: Sport | null; category: Category | null; categories: Category[] },
  ) => void;
}) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [value, setValue] = useState<EventFilterValue>(() => emptyEventFilter(championshipId));
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [openField, setOpenField] = useState<StepId | null>(null);
  const advancingTo = useRef<StepId | null>(null);
  const openTimer = useRef<number | null>(null);

  const liveSports = sports;
  const liveCategories = categories;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => () => {
    if (openTimer.current != null) window.clearTimeout(openTimer.current);
  }, []);

  const emit = useCallback((next: EventFilterValue, allSports: Sport[], allCategories: Category[]) => {
    writeEventFilter(next);
    setValue(next);
    const sport = allSports.find((row) => row.id === next.sportId) ?? null;
    const category = allCategories.find((row) => row.id === next.categoryId) ?? null;
    onChangeRef.current?.(next, { sport, category, categories: allCategories });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void (async () => {
      const [sportRes, categoryRes, offerRes, fixtureRes] = await Promise.all([
        listSports(),
        listCategories(),
        listChampionshipOfferings(championshipId),
        onlyWithExistingFixture ? listFixtures(championshipId) : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      const offerings = offerRes.data ?? [];
      const offered = offeredSports(sportRes.data ?? [], offerings);
      let cats = offeredCategories(categoryRes.data ?? [], offerings);
      if (onlyWithExistingFixture) {
        const fixtureCategoryIds = new Set((fixtureRes.data ?? []).map((row) => row.categoryId));
        cats = cats.filter((row) => fixtureCategoryIds.has(row.id));
      }
      setSports(offered);
      setCategories(cats);
      const stored = readEventFilter(championshipId);
      let next = stored.championshipId === championshipId ? stored : emptyEventFilter(championshipId);
      if (lockSportId && offered.some((row) => row.id === lockSportId)) {
        if (next.sportId !== lockSportId) next = applySport({ ...next, championshipId }, lockSportId);
      }
      if (next.sportId && !offered.some((row) => row.id === next.sportId)) {
        next = emptyEventFilter(championshipId);
      }
      if (next.categoryId) {
        const storedCategory = cats.find((row) => row.id === next.categoryId);
        if (!storedCategory) {
          next = { ...next, gender: "", ageGroup: "", categoryId: "", categoryName: "" };
        } else {
          next = {
            ...next,
            gender: storedCategory.gender,
            ageGroup: storedCategory.ageGroup,
            categoryName: storedCategory.name,
          };
        }
      } else {
        next = { ...next, categoryName: "" };
      }
      if (requireEvent) next = settleEventFilter(next, cats);
      emit(next, offered, cats);
      // a remembered event opens folded: on the ground you pick once, then work
      setOpen(!isEventFilterComplete(next));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [championshipId, emit, lockSportId, onlyWithExistingFixture, requireEvent]);

  const sportCats = useMemo(
    () => liveCategories.filter((row) => !value.sportId || row.sportId === value.sportId),
    [liveCategories, value.sportId],
  );
  const genderOptions = useMemo(() => gendersForSport(sportCats), [sportCats]);
  const ageOptions = useMemo(
    () => agesForSportGender(sportCats, value.gender),
    [sportCats, value.gender],
  );
  const categoryOptions = useMemo(
    () =>
      categoriesForSportGenderAge(sportCats, value.sportId, value.gender, value.ageGroup).map(
        (row) => ({ value: row.id, label: row.name }),
      ),
    [sportCats, value.sportId, value.gender, value.ageGroup],
  );

  const selectedSport = liveSports.find((row) => row.id === value.sportId) ?? null;
  const selectedCategory = liveCategories.find((row) => row.id === value.categoryId) ?? null;

  function pick(step: StepId, raw: string) {
    let next =
      step === "sport"
        ? applySport(value, raw)
        : step === "gender"
          ? applyGender(value, raw as "" | Gender)
          : step === "age"
            ? applyAge(value, raw, liveCategories)
            : applyCategory(value, raw, liveCategories);
    if (raw) next = settleEventFilter(next, liveCategories);
    emit(next, liveSports, liveCategories);
    const nextStep: StepId | null = !next.sportId
      ? null
      : !next.gender
        ? "gender"
        : !next.ageGroup
          ? "age"
          : !next.categoryId
            ? "category"
            : null;
    if (requireEvent && isEventFilterComplete(next)) {
      advancingTo.current = null;
      setOpen(false);
      setOpenField(null);
      return;
    }
    const follow = raw ? nextStep : null;
    advancingTo.current = follow;
    setOpenField(null);
    if (openTimer.current != null) window.clearTimeout(openTimer.current);
    if (!follow) return;
    // wait until the click that closed this menu has finished, then open the next one
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      if (advancingTo.current === follow) setOpenField(follow);
    }, 30);
  }

  const closeField = (step: StepId) => {
    if (advancingTo.current && advancingTo.current !== step) return;
    advancingTo.current = null;
    setOpenField((current) => (current === step ? null : current));
  };

  if (!ready) {
    return <PageSkeleton kind="filters" />;
  }

  const eventName = selectedCategory?.name || value.categoryName;
  const title = eventIdentityTitle(value.gender, value.ageGroup, eventName, selectedSport?.name);
  // the title already says "Boys U16 100m"; the eyebrow only adds the sport
  const eyebrow = title && selectedSport ? selectedSport.name : "";
  const all = requireEvent ? undefined : "All";

  // One card: the event strip on top, then four outlined selects.
  const genderLocked = unlockInOrder && !value.sportId;
  const ageLocked = unlockInOrder && !value.gender;
  const eventLocked = unlockInOrder && !value.ageGroup;

  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-12 items-center gap-2 bg-[var(--ops-primary)] px-4 py-1 text-[var(--ops-on-primary)]">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setOpen(!open)}>
          <p className="truncate text-[11px] leading-4 font-medium tracking-[0.5px] uppercase opacity-80">{eyebrow || "Event"}</p>
          <p className="truncate text-base leading-6 font-medium">
            {title || (requireEvent ? "Pick an event" : "All sports")}
          </p>
        </div>
        {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Hide event picker" : "Change event"}
          onClick={() => setOpen(!open)}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm leading-5 font-medium hover:bg-white/15"
        >
          <span className="hidden sm:inline">{open ? "Done" : "Change"}</span>
          <IconChevronDown size={18} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        <div className="p-3">
          {liveSports.length === 0 ? (
            <p className="text-sm leading-5 text-[var(--ops-text-muted)]">
              {onlyWithExistingFixture ? "No event has a draw yet." : "No sports offered in this championship."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StepSelect
                id="sport"
                label="Sport"
                value={value.sportId}
                allLabel={all}
                disabled={Boolean(lockSportId)}
                open={openField === "sport"}
                options={liveSports.map((row) => ({ value: row.id, label: row.name }))}
                onOpen={() => setOpenField("sport")}
                onClose={() => closeField("sport")}
                onPick={(raw) => pick("sport", raw)}
              />
              <StepSelect
                id="gender"
                label="Gender"
                value={value.gender}
                allLabel={all}
                disabled={genderLocked}
                open={openField === "gender"}
                options={genderOptions.map((gender) => ({ value: gender, label: genderLabel(gender) }))}
                onOpen={() => setOpenField("gender")}
                onClose={() => closeField("gender")}
                onPick={(raw) => pick("gender", raw)}
              />
              <StepSelect
                id="age"
                label="Age"
                value={value.ageGroup}
                allLabel={all}
                disabled={ageLocked}
                open={openField === "age"}
                options={ageOptions.map((age) => ({ value: age, label: age }))}
                onOpen={() => setOpenField("age")}
                onClose={() => closeField("age")}
                onPick={(raw) => pick("age", raw)}
              />
              <StepSelect
                id="category"
                label="Event"
                value={value.categoryId}
                allLabel={all}
                disabled={eventLocked}
                open={openField === "category"}
                options={categoryOptions}
                onOpen={() => setOpenField("category")}
                onClose={() => closeField("category")}
                onPick={(raw) => pick("category", raw)}
              />
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export function useStoredEventFilter(championshipId: string): EventFilterValue {
  const [value, setValue] = useState(() => emptyEventFilter(championshipId));
  useEffect(() => {
    setValue(readEventFilter(championshipId));
  }, [championshipId]);
  return value;
}
