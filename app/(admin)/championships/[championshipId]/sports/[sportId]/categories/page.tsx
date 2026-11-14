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
import { useScopedChampionship } from "../../../../useScopedChampionship";
import {
  addChampionshipEvent,
  listCategories,
  listChampionshipOfferings,
  listSports,
  removeChampionshipEvent,
} from "@/lib/services";
import type { Category, ChampionshipOffering, Gender, Sport } from "@/lib/types/cms";
import {
  agesForSportGender,
  applyAge,
  applyGender,
  applySport,
  emptyEventFilter,
  genderLabel,
  gendersForSport,
  namesForSportGenderAge,
  writeEventFilter,
} from "@/lib/utils/eventFilter";
import { isRelayEvent } from "@/lib/utils/athletics";
import { isAthleticsSport } from "@/lib/utils/fixtures";
import { categoryEventName, categoryLabel } from "@/lib/utils/labels";
import { compareText, matchesQuery } from "@/lib/utils/table";

export default function ChampionshipCategoriesPage() {
  const router = useRouter();
  const params = useParams<{ championshipId: string; sportId: string }>();
  const { championshipId, sportId } = params;
  const { championship, loading } = useScopedChampionship(championshipId);
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offerings, setOfferings] = useState<ChampionshipOffering[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | Gender>("");
  const [ageFilter, setAgeFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ categoryId?: string }>({});

  const load = useCallback(async () => {
    const [sportRes, catRes, offerRes] = await Promise.all([
      listSports(),
      listCategories(sportId),
      listChampionshipOfferings(championshipId),
    ]);
    if (sportRes.error) toast.error(sportRes.error.message);
    if (catRes.error) toast.error(catRes.error.message);
    if (offerRes.error) toast.error(offerRes.error.message);
    setSports(sportRes.data ?? []);
    setCategories(catRes.data ?? []);
    setOfferings(offerRes.data ?? []);
  }, [championshipId, sportId]);

  useEffect(() => {
    if (championship) void load();
  }, [championship, load]);

  const sport = sports.find((item) => item.id === sportId) ?? null;
  const offering = offerings.find((item) => item.sportId === sportId);
  const assignedIds = new Set(offering?.categoryIds ?? []);
  const assigned = categories.filter((category) => assignedIds.has(category.id));
  const available = categories.filter((category) => !assignedIds.has(category.id));

  useEffect(() => {
    if (!available.some((item) => item.id === categoryId)) {
      setCategoryId(available[0]?.id ?? "");
    }
  }, [available, categoryId]);

  const genderOptions = useMemo(() => gendersForSport(assigned), [assigned]);
  const ageOptions = useMemo(
    () => agesForSportGender(assigned, genderFilter),
    [assigned, genderFilter],
  );
  const nameOptions = useMemo(
    () => namesForSportGenderAge(assigned, genderFilter, ageFilter),
    [assigned, genderFilter, ageFilter],
  );

  const visible = useMemo(() => {
    const filtered = assigned.filter((category) => {
      if (genderFilter && category.gender !== genderFilter) return false;
      if (ageFilter && category.ageGroup !== ageFilter) return false;
      if (nameFilter && category.name !== nameFilter) return false;
      return matchesQuery(
        search,
        categoryLabel(category),
        category.name,
        category.ageGroup,
        category.gender,
      );
    });
    return [...filtered].sort((a, b) => compareText(categoryLabel(a), categoryLabel(b), "asc"));
  }, [assigned, search, genderFilter, ageFilter, nameFilter]);

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

  const sportsHref = `/championships/${championshipId}/sports`;

  const openCategory = (category: Category) => {
    let next = applySport(emptyEventFilter(championshipId), sportId);
    next = applyGender(next, category.gender);
    next = applyAge(next, category.ageGroup, [category]);
    writeEventFilter(next);
    router.push(`${sportsHref}/${sportId}/categories/${category.id}/teams`);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepCrumbs
        items={[
          { href: "/championships", label: "Championships" },
          { href: sportsHref, label: championship.name },
          { label: sport?.name ?? "Sport" },
        ]}
      />
      <PageHeader
        title="Categories"
        hint="All assigned categories until you filter. Gender, then age, then name."
        action={
          <SoftButton
            variant="primary"
            onClick={() => setFormOpen(true)}
            disabled={!offering || available.length === 0}
          >
            Add category
          </SoftButton>
        }
      />

      {!offering ? (
        <EmptyState
          title="Assign this sport first"
          action={
            <Link href={sportsHref}>
              <SoftButton variant="primary">Sports</SoftButton>
            </Link>
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SoftSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search category"
        />
        <ChipFilter
          ariaLabel="Gender"
          value={genderFilter}
          onChange={(value) => {
            setGenderFilter(value);
            setAgeFilter("");
            setNameFilter("");
          }}
          options={genderOptions.map((gender) => ({
            value: gender,
            label: genderLabel(gender),
          }))}
        />
        <ChipFilter
          ariaLabel="Age"
          value={ageFilter}
          disabled={!genderFilter}
          onChange={(value) => {
            setAgeFilter(value);
            setNameFilter("");
          }}
          options={ageOptions.map((age) => ({ value: age, label: age }))}
        />
        <ChipFilter
          ariaLabel="Category"
          value={nameFilter}
          disabled={!ageFilter}
          onChange={setNameFilter}
          options={nameOptions.map((name) => ({ value: name, label: name }))}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={assigned.length === 0 ? "No categories yet" : "No matching categories"}
          hint={assigned.length === 0 ? "Add a category to continue." : "Clear a chip to see more."}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((category) => (
            <SoftCard key={category.id} interactive onClick={() => openCategory(category)}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{categoryLabel(category)}</p>
                <StatusBadge>{categoryEventName(category.name) ?? category.ageGroup}</StatusBadge>
              </div>
              <p className="mt-2 text-sm text-[var(--ops-text-muted)]">
                {isAthleticsSport(sport)
                  ? isRelayEvent(category.name)
                    ? "Relay teams of 4"
                    : "Individual athletes"
                  : `Roster ${category.teamSize}–${category.maxTeamSize}`}
              </p>
              <div
                className="mt-4 flex justify-end"
                onClick={(event) => event.stopPropagation()}
              >
                <SoftButton
                  variant="danger"
                  onClick={async () => {
                    if (!confirm(`Remove ${categoryLabel(category)}?`)) return;
                    const { error } = await removeChampionshipEvent(championshipId, category.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success("Category removed.");
                      await load();
                    }
                  }}
                >
                  Remove
                </SoftButton>
              </div>
            </SoftCard>
          ))}
        </div>
      )}

      <Modal open={formOpen} title="Add category" onClose={() => setFormOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!categoryId) {
              setFieldErrors({ categoryId: "Required" });
              toast.error("Fill the highlighted fields.");
              return;
            }
            setSaving(true);
            const { error } = await addChampionshipEvent(championshipId, sportId, categoryId);
            setSaving(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Category assigned.");
            setFormOpen(false);
            setFieldErrors({});
            await load();
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Category
            <SoftSelect
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setFieldErrors({});
              }}
              className={fieldErrors.categoryId ? fieldErrorClass : fieldClass}
            >
              {available.length === 0 ? (
                <option value="">No unused categories for this sport</option>
              ) : (
                available.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryLabel(category)}
                  </option>
                ))
              )}
            </SoftSelect>
          </label>
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving} disabled={!categoryId}>
              Add category
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
