"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import {
  ChipFilter,
  EmptyState,
  PageHeader,
  PageSkeleton,
  PickGroup,
  PickItem,
  PickList,
  PickToolbar,
  SoftButton,
  SoftCard,
  SoftSearch,
  StatusBadge,
  StepCrumbs,
} from "@/components/ops";
import { useScopedChampionship } from "../../../../useScopedChampionship";
import {
  addChampionshipEvents,
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
  groupCategoriesByGenderAge,
  namesForSportGenderAge,
  writeEventFilter,
} from "@/lib/utils/eventFilter";
import { isRelayEvent } from "@/lib/utils/athletics";
import { isAthleticsSport } from "@/lib/utils/fixtures";
import { categoryEventName, categoryLabel } from "@/lib/utils/labels";
import { compareText, matchesQuery } from "@/lib/utils/table";

function toggleId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function setIds(current: Set<string>, ids: string[], on: boolean): Set<string> {
  const next = new Set(current);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next;
}

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
  const [pickSearch, setPickSearch] = useState("");
  const [pickGender, setPickGender] = useState<"" | Gender>("");
  const [pickAge, setPickAge] = useState("");
  const [pickName, setPickName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState(false);
  const [ready, setReady] = useState(false);

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
    setReady(true);
  }, [championshipId, sportId]);

  useEffect(() => {
    if (championship) void load();
  }, [championship, load]);

  const sport = sports.find((item) => item.id === sportId) ?? null;
  const offering = offerings.find((item) => item.sportId === sportId);
  const assignedIds = new Set(offering?.categoryIds ?? []);
  const assigned = categories.filter((category) => assignedIds.has(category.id));
  const available = categories.filter((category) => !assignedIds.has(category.id));

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

  const pickGenderOptions = useMemo(() => gendersForSport(available), [available]);
  const pickAgeOptions = useMemo(
    () => agesForSportGender(available, pickGender),
    [available, pickGender],
  );
  const pickNameOptions = useMemo(
    () => namesForSportGenderAge(available, pickGender, pickAge),
    [available, pickGender, pickAge],
  );

  const pickVisible = useMemo(() => {
    const filtered = available.filter((category) => {
      if (pickGender && category.gender !== pickGender) return false;
      if (pickAge && category.ageGroup !== pickAge) return false;
      if (pickName && category.name !== pickName) return false;
      return matchesQuery(
        pickSearch,
        categoryLabel(category),
        category.name,
        category.ageGroup,
        category.gender,
      );
    });
    return [...filtered].sort((a, b) => compareText(categoryLabel(a), categoryLabel(b), "asc"));
  }, [available, pickGender, pickAge, pickName, pickSearch]);

  const pickGroups = useMemo(() => groupCategoriesByGenderAge(pickVisible), [pickVisible]);

  useEffect(() => {
    if (!pickAge || pickAgeOptions.includes(pickAge)) return;
    setPickAge("");
    setPickName("");
  }, [pickAge, pickAgeOptions]);

  useEffect(() => {
    if (!pickName || pickNameOptions.includes(pickName)) return;
    setPickName("");
  }, [pickName, pickNameOptions]);

  if (loading || (championship && !ready)) {
    return <PageSkeleton kind="cards" />;
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

  const openForm = () => {
    const nextGender = genderFilter && pickGenderOptions.includes(genderFilter) ? genderFilter : "";
    const ages = agesForSportGender(available, nextGender);
    const nextAge = ageFilter && ages.includes(ageFilter) ? ageFilter : "";
    const names = namesForSportGenderAge(available, nextGender, nextAge);
    const nextName = nameFilter && names.includes(nameFilter) ? nameFilter : "";
    const matching = available.filter((category) => {
      if (nextGender && category.gender !== nextGender) return false;
      if (nextAge && category.ageGroup !== nextAge) return false;
      if (nextName && category.name !== nextName) return false;
      return true;
    });
    setPickSearch("");
    setPickGender(nextGender);
    setPickAge(nextAge);
    setPickName(nextName);
    setListError(false);
    const focused = Boolean(nextGender || nextAge || nextName);
    setSelectedIds(
      focused || matching.length <= 12
        ? new Set(matching.map((category) => category.id))
        : new Set(),
    );
    setFormOpen(true);
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
        hint="All assigned categories until you filter. Add many at once with gender and age."
        action={
          <SoftButton
            variant="primary"
            onClick={openForm}
            disabled={!offering || available.length === 0}
          >
            Add categories
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

      <Modal open={formOpen} title="Add categories" wide onClose={() => setFormOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (selectedIds.size === 0) {
              setListError(true);
              toast.error("Select at least one category.");
              return;
            }
            setSaving(true);
            const { error } = await addChampionshipEvents(championshipId, sportId, [...selectedIds]);
            setSaving(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success(
              selectedIds.size === 1 ? "Category assigned." : `Added ${selectedIds.size} categories.`,
            );
            setFormOpen(false);
            setSelectedIds(new Set());
            setListError(false);
            await load();
          }}
        >
          <SoftSearch
            value={pickSearch}
            onChange={(event) => setPickSearch(event.target.value)}
            placeholder="Search remaining categories"
          />
          <ChipFilter
            ariaLabel="Gender"
            value={pickGender}
            onChange={(value) => {
              setPickGender(value);
              setPickAge("");
              setPickName("");
            }}
            options={pickGenderOptions.map((gender) => ({
              value: gender,
              label: genderLabel(gender),
            }))}
          />
          <ChipFilter
            ariaLabel="Age"
            value={pickAge}
            onChange={(value) => {
              setPickAge(value);
              setPickName("");
            }}
            options={pickAgeOptions.map((age) => ({ value: age, label: age }))}
          />
          {pickNameOptions.length > 1 ? (
            <ChipFilter
              ariaLabel="Event"
              value={pickName}
              onChange={setPickName}
              options={pickNameOptions.map((name) => ({
                value: name,
                label: categoryEventName(name) ?? name,
              }))}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {pickGenderOptions.map((gender) => (
              <SoftButton
                key={gender}
                type="button"
                onClick={() => {
                  const ids = available
                    .filter((category) => category.gender === gender)
                    .map((category) => category.id);
                  setPickGender(gender);
                  setPickAge("");
                  setPickName("");
                  setSelectedIds(new Set(ids));
                  setListError(false);
                }}
              >
                All {genderLabel(gender).toLowerCase()}
              </SoftButton>
            ))}
            {pickAgeOptions.length <= 8
              ? pickAgeOptions.map((age) => (
                  <SoftButton
                    key={age}
                    type="button"
                    onClick={() => {
                      const ids = available
                        .filter((category) => {
                          if (pickGender && category.gender !== pickGender) return false;
                          return category.ageGroup === age;
                        })
                        .map((category) => category.id);
                      setPickAge(age);
                      setPickName("");
                      setSelectedIds(new Set(ids));
                      setListError(false);
                    }}
                  >
                    All {pickGender ? `${genderLabel(pickGender).toLowerCase()} ${age}` : age}
                  </SoftButton>
                ))
              : null}
          </div>
          <PickToolbar
            selected={selectedIds.size}
            visible={pickVisible.length}
            onSelectVisible={() =>
              setSelectedIds(new Set(pickVisible.map((category) => category.id)))
            }
            onClear={() => setSelectedIds(new Set())}
          />
          {pickVisible.length === 0 ? (
            <EmptyState
              title="No remaining categories"
              hint="Clear a chip or assign this sport from the catalog."
            />
          ) : (
            <PickList invalid={listError}>
              {pickGroups.map((group) => {
                const ids = group.items.map((item) => item.id);
                const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
                const allOn = selectedCount === ids.length;
                const someOn = selectedCount > 0 && !allOn;
                if (group.items.length === 1) {
                  const only = group.items[0];
                  if (!only) return null;
                  return (
                    <PickItem
                      key={only.id}
                      title={categoryLabel(only)}
                      hint={
                        isAthleticsSport(sport)
                          ? isRelayEvent(only.name)
                            ? "Relay teams of 4"
                            : "Individual athletes"
                          : `Roster ${only.teamSize}–${only.maxTeamSize}`
                      }
                      checked={selectedIds.has(only.id)}
                      onToggle={() => {
                        setSelectedIds((current) => toggleId(current, only.id));
                        setListError(false);
                      }}
                    />
                  );
                }
                return (
                  <div key={group.key}>
                    <PickGroup
                      title={group.label}
                      hint={`${selectedCount} of ${ids.length} selected`}
                      checked={allOn}
                      indeterminate={someOn}
                      onToggle={() => {
                        setSelectedIds((current) => setIds(current, ids, !allOn));
                        setListError(false);
                      }}
                    />
                    {group.items.map((category) => (
                      <PickItem
                        key={category.id}
                        inset
                        title={categoryEventName(category.name) ?? category.name}
                        hint={
                          isRelayEvent(category.name)
                            ? "Relay teams of 4"
                            : isAthleticsSport(sport)
                              ? "Individual athletes"
                              : `Roster ${category.teamSize}–${category.maxTeamSize}`
                        }
                        checked={selectedIds.has(category.id)}
                        onToggle={() => {
                          setSelectedIds((current) => toggleId(current, category.id));
                          setListError(false);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </PickList>
          )}
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving} disabled={selectedIds.size === 0}>
              {selectedIds.size === 1
                ? "Add category"
                : `Add ${selectedIds.size || ""} categories`.trim()}
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
