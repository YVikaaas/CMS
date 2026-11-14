"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  eventIdentityEyebrow,
  eventIdentityTitle,
  genderLabel,
  gendersForSport,
  offeredCategories,
  offeredSports,
  readEventFilter,
  writeEventFilter,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import { EventIdentity } from "./EventIdentity";

function FilterChip({
  label,
  value,
  placeholder,
  disabled,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-[8.5rem] flex-1 flex-col gap-1 text-[11px] font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
      {label}
      <span className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "ops-control w-full appearance-none pr-8 font-semibold text-[var(--ops-text)]",
            !value && "text-[var(--ops-text-muted)]",
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--ops-text-muted)]"
        />
      </span>
    </label>
  );
}

export function EventFilters({
  championshipId,
  onlyWithExistingFixture = false,
  lockSportId,
  unlockInOrder = true,
  onChange,
}: {
  championshipId: string;
  onlyWithExistingFixture?: boolean;
  lockSportId?: string;
  unlockInOrder?: boolean;
  onChange?: (
    value: EventFilterValue,
    meta: { sport: Sport | null; category: Category | null; categories: Category[] },
  ) => void;
}) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [value, setValue] = useState<EventFilterValue>(() => emptyEventFilter(championshipId));
  const [ready, setReady] = useState(false);

  const liveSports = sports;
  const liveCategories = categories;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      emit(next, offered, cats);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [championshipId, emit, lockSportId, onlyWithExistingFixture]);

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
  const genderLocked = unlockInOrder && !value.sportId;
  const ageLocked = unlockInOrder && !value.gender;
  const categoryLocked = unlockInOrder && !value.ageGroup;
  const hasFilter = Boolean(value.sportId || value.gender || value.ageGroup || value.categoryId);

  if (!ready) {
    return <PageSkeleton kind="filters" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <FilterChip
          label="Sport"
          value={value.sportId}
          placeholder="All"
          disabled={Boolean(lockSportId)}
          options={liveSports.map((row) => ({ value: row.id, label: row.name }))}
          onChange={(sportId) => emit(applySport(value, sportId), liveSports, liveCategories)}
        />
        <FilterChip
          label="Gender"
          value={value.gender}
          placeholder={genderLocked ? "Pick sport first" : "All"}
          disabled={genderLocked}
          options={genderOptions.map((gender) => ({
            value: gender,
            label: genderLabel(gender),
          }))}
          onChange={(gender) =>
            emit(applyGender(value, gender as "" | Gender), liveSports, liveCategories)
          }
        />
        <FilterChip
          label="Age"
          value={value.ageGroup}
          placeholder={ageLocked ? "Pick gender first" : "All"}
          disabled={ageLocked}
          options={ageOptions.map((age) => ({ value: age, label: age }))}
          onChange={(ageGroup) => emit(applyAge(value, ageGroup, liveCategories), liveSports, liveCategories)}
        />
        <FilterChip
          label="Category"
          value={value.categoryId}
          placeholder={categoryLocked ? "Pick age first" : "All"}
          disabled={categoryLocked}
          options={categoryOptions}
          onChange={(categoryId) =>
            emit(applyCategory(value, categoryId, liveCategories), liveSports, liveCategories)
          }
        />
      </div>
      {hasFilter ? (
        <EventIdentity
          eyebrow={eventIdentityEyebrow(
            selectedSport?.name,
            value.gender,
            value.ageGroup,
            selectedCategory?.name || value.categoryName,
          )}
          title={eventIdentityTitle(
            value.gender,
            value.ageGroup,
            selectedCategory?.name || value.categoryName,
            selectedSport?.name,
          )}
        />
      ) : null}
    </div>
  );
}

export function useStoredEventFilter(championshipId: string): EventFilterValue {
  const [value, setValue] = useState(() => emptyEventFilter(championshipId));
  useEffect(() => {
    setValue(readEventFilter(championshipId));
  }, [championshipId]);
  return value;
}
