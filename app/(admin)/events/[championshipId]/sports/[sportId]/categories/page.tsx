"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import IconButton from "@mui/material/IconButton";
import { IconChevronRight, IconTrash } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { TableCard, TableExport, TablePager, TableSearch } from "@/components/table";
import { exportTable } from "@/lib/utils/exportTable";
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
  SoftSelect,
  useConfirm,
} from "@/components/ops";
import { useScopedChampionship } from "../../../../useScopedChampionship";
import {
  addChampionshipEvents,
  listCategories,
  listChampionshipOfferings,
  listSports,
  listTeams,
  removeChampionshipEvent,
} from "@/lib/services";
import type { Category, ChampionshipOffering, Gender, Sport, Team } from "@/lib/types/cms";
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
import { isRelayEvent, isSoloAthleticsEvent } from "@/lib/utils/athletics";
import { isAthleticsSport } from "@/lib/utils/fixtures";
import { categoryEventName, categoryGroupLabel, categoryLabel } from "@/lib/utils/labels";
import { compareNumber, compareText, matchesQuery, pageRows, type SortState } from "@/lib/utils/table";

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

function isSoloCategory(sport: Sport | null, category: Category): boolean {
  if (isAthleticsSport(sport)) return isSoloAthleticsEvent(category.name);
  return category.teamSize <= 1;
}

function entryStats(
  sport: Sport | null,
  category: Category,
  teams: Team[],
): { solo: boolean; count: number; label: string } {
  const solo = isSoloCategory(sport, category);
  const rows = teams.filter((team) => team.categoryId === category.id);
  const count = solo
    ? rows.reduce((sum, team) => sum + team.memberCount, 0) || rows.length
    : rows.length;
  const unit = solo ? (count === 1 ? "athlete" : "athletes") : count === 1 ? "team" : "teams";
  return { solo, count, label: `${count} ${unit}` };
}

export default function ChampionshipCategoriesPage() {
  const confirm = useConfirm();
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [sort, setSort] = useState<SortState<"label" | "gender" | "age" | "entries">>({
    key: "label",
    dir: "asc",
  });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
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
    const [sportRes, catRes, offerRes, teamRes] = await Promise.all([
      listSports(),
      listCategories(sportId),
      listChampionshipOfferings(championshipId),
      listTeams({ championshipId, sportId }),
    ]);
    if (sportRes.error) toast.error(sportRes.error.message);
    if (catRes.error) toast.error(catRes.error.message);
    if (offerRes.error) toast.error(offerRes.error.message);
    if (teamRes.error) toast.error(teamRes.error.message);
    setSports(sportRes.data ?? []);
    setCategories(catRes.data ?? []);
    setOfferings(offerRes.data ?? []);
    setTeams(teamRes.data ?? []);
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
    return [...filtered].sort((a, b) => {
      if (sort.key === "gender") return compareText(a.gender, b.gender, sort.dir);
      if (sort.key === "age") return compareText(a.ageGroup, b.ageGroup, sort.dir);
      if (sort.key === "entries") {
        return compareNumber(
          entryStats(sport, a, teams).count,
          entryStats(sport, b, teams).count,
          sort.dir,
        );
      }
      return compareText(categoryLabel(a), categoryLabel(b), sort.dir);
    });
  }, [assigned, search, genderFilter, ageFilter, nameFilter, sort, sport, teams]);
  const paged = pageRows(visible, page, perPage);

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
        title="Event not found"
        action={
          <Link href="/events">
            <SoftButton variant="primary">Back to events</SoftButton>
          </Link>
        }
      />
    );
  }

  const sportsHref = `/events/${championshipId}/sports`;

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
      <PageHeader
        crumbs={[
          { href: "/events", label: "Events" },
          { href: sportsHref, label: championship.name },
          { label: sport?.name ?? "Sport" },
        ]}
       
        title="Categories"
        hint="All assigned categories until you filter. Add many at once with gender and age."
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

      <TableCard
        title="Categories"
        search={<TableSearch value={search} onChange={setSearch} placeholder="Search category" />}
        count={visible.length}
        filters={[
          {
            id: "gender",
            label: "Gender",
            value: genderFilter,
            options: genderOptions.map((gender) => ({ value: gender, label: genderLabel(gender) })),
            onChange: (value) => {
              setGenderFilter(value as typeof genderFilter);
              setAgeFilter("");
              setNameFilter("");
            },
          },
          {
            id: "age",
            label: "Age",
            value: ageFilter,
            disabled: !genderFilter,
            allLabel: genderFilter ? "All" : "Pick gender",
            options: ageOptions.map((age) => ({ value: age, label: age })),
            onChange: (value) => {
              setAgeFilter(value);
              setNameFilter("");
            },
          },
          {
            id: "event",
            label: "Name",
            value: nameFilter,
            disabled: !ageFilter,
            allLabel: ageFilter ? "All" : "Pick age",
            options: nameOptions.map((name) => ({ value: name, label: name })),
            onChange: setNameFilter,
          },
        ]}
        onClearAll={() => {
          setSearch("");
          setGenderFilter("");
          setAgeFilter("");
          setNameFilter("");
        }}
        exportMenu={
          <TableExport
            count={visible.length}
            onExport={(format) =>
              exportTable(
                visible,
                [
                  { header: "Category", value: (row) => categoryLabel(row) },
                  { header: "Gender", value: (row) => genderLabel(row.gender) },
                  { header: "Age group", value: (row) => row.ageGroup },
                  {
                    header: "Entries",
                    value: (row) => entryStats(sport, row, teams).label,
                  },
                ],
                `${sport?.name ?? "sport"} categories`,
                format,
              )
            }
          />
        }
        toolbar={
          <SoftSelect
            size="small"
            value={sort.key}
            aria-label="Sort"
            className="min-w-[8.5rem] [&_.MuiSelect-select]:font-medium"
            startIcon={<span className="text-sm text-[var(--ops-text-muted)]">Sort</span>}
            onChange={(event) => {
              const key = event.target.value as typeof sort.key;
              setSort({ key, dir: key === "entries" ? "desc" : "asc" });
            }}
          >
            <option value="label">Category</option>
            <option value="gender">Gender</option>
            <option value="age">Age</option>
            <option value="entries">Entries</option>
          </SoftSelect>
        }
        action={
          <SoftButton variant="primary" onClick={openForm} disabled={!offering || available.length === 0}>
            Add categories
          </SoftButton>
        }
        footer={
          <TablePager count={visible.length} page={paged.page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        }
        plain
      >
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--ops-text-muted)]">
            {assigned.length === 0 ? "No categories yet." : "No matching categories."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {paged.rows.map((category) => {
              const event = categoryEventName(category.name);
              const title = event ?? categoryLabel(category);
              const hint = event ? categoryGroupLabel(category) : `${genderLabel(category.gender)} · ${category.ageGroup}`;
              const entries = entryStats(sport, category, teams);
              return (
                <SoftCard
                  key={category.id}
                  interactive
                  padding="sm"
                  role="link"
                  tabIndex={0}
                  className="flex items-center gap-3"
                  onClick={() => openCategory(category)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCategory(category);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{title}</p>
                    <p className="truncate text-xs text-[var(--ops-text-muted)]">{hint}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg leading-6 font-medium tabular-nums">{entries.count}</p>
                    <p className="text-xs text-[var(--ops-text-muted)]">
                      {entries.solo
                        ? entries.count === 1
                          ? "athlete"
                          : "athletes"
                        : entries.count === 1
                          ? "team"
                          : "teams"}
                    </p>
                  </div>
                  <IconButton
                    color="error"
                    aria-label={`Remove ${categoryLabel(category)}`}
                    title="Remove"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (
                        !(await confirm({
                          title: `Remove ${categoryLabel(category)}?`,
                          message: "It is taken off this sport for this event.",
                          confirmLabel: "Remove",
                        }))
                      ) {
                        return;
                      }
                      const { error } = await removeChampionshipEvent(championshipId, category.id);
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Category removed.");
                        await load();
                      }
                    }}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                  <IconChevronRight
                    size={18}
                    aria-hidden
                    className="shrink-0 text-[var(--ops-text-muted)]"
                  />
                </SoftCard>
              );
            })}
          </div>
        )}
      </TableCard>

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
              ariaLabel="Name"
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
