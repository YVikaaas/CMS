"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import { CategoryNameInput } from "@/components/fields";
import { RoundChips } from "@/components/RoundChips";
import { SortTh, TableControls } from "@/components/table";
import {
  ChipFilter,
  PageHeader,
  SoftButton,
  SoftSelect,
  StatusBadge,
} from "@/components/ops";
import {
  archiveCategory,
  createCategory,
  listCategories,
  listSports,
  updateCategory,
} from "@/lib/services";
import {
  ATHLETICS_EVENTS,
  defaultAthleticsRoster,
  defaultParticipantsPerMatch,
  isRelayEvent,
} from "@/lib/utils/athletics";
import { cn } from "@/lib/utils/cn";
import {
  defaultCategoryFixtureConfig,
  fixtureConfigLabel,
  formatsForSport,
  isAthleticsSport,
  isFixtureRoundType,
  roundLabel,
  roundsForFormatFamily,
} from "@/lib/utils/fixtures";
import {
  agesForSportGender,
  genderLabel,
  gendersForSport,
} from "@/lib/utils/eventFilter";
import { categoryGroupLabel, categoryLabel } from "@/lib/utils/labels";
import type { Category, FixtureFormatType, FixtureRoundType, Gender, Sport } from "@/lib/types/cms";
import { compareNumber, compareText, matchesQuery, type SortState } from "@/lib/utils/table";
import { categoryNameError } from "@/lib/utils/validation";

type CategoryForm = {
  sportId: string;
  name: string;
  gender: Gender;
  ageGroup: string;
  ageMax: number;
  teamSize: number;
  maxTeamSize: number;
  format: FixtureFormatType;
  scoringStyle: string;
  participantsPerMatch: number;
  availableRounds: FixtureRoundType[];
};

const FIXTURE_FILTERS: Array<{ value: "" | FixtureFormatType; label: string }> = [
  { value: "", label: "All fixtures" },
  { value: "track_rounds", label: "Track rounds" },
  { value: "field_attempts", label: "Field attempts" },
  { value: "league_knockout", label: "League + bracket" },
  { value: "bracket_elimination", label: "Bracket elimination" },
];

function formFromSport(sportId: string, sport?: Sport | null, current?: Partial<CategoryForm>): CategoryForm {
  const athletics = isAthleticsSport(sport);
  const fixture = defaultCategoryFixtureConfig(sport, current?.name ?? "");
  return {
    sportId,
    name: current?.name ?? "",
    gender: current?.gender ?? "male",
    ageGroup: current?.ageGroup ?? "",
    ageMax: current?.ageMax ?? 10,
    teamSize: athletics ? defaultAthleticsRoster(current?.name ?? "").teamSize : (current?.teamSize ?? 5),
    maxTeamSize: athletics
      ? defaultAthleticsRoster(current?.name ?? "").maxTeamSize
      : (current?.maxTeamSize ?? 6),
    format: fixture.format,
    scoringStyle: fixture.scoringStyle,
    participantsPerMatch: fixture.participantsPerMatch,
    availableRounds: fixture.availableRounds,
  };
}

function formatChoices(athletics: boolean) {
  return athletics
    ? [
        { value: "track_rounds" as const, title: "Track rounds", hint: "Heats, then quarters, semi and final" },
        { value: "field_attempts" as const, title: "Field attempts", hint: "Qualifying, then final" },
      ]
    : [
        { value: "bracket_elimination" as const, title: "Bracket elimination", hint: "Knockout only" },
        { value: "league_knockout" as const, title: "League + bracket", hint: "League then knockout" },
      ];
}

function fixtureTone(format: FixtureFormatType) {
  if (format === "track_rounds") return "primary" as const;
  if (format === "field_attempts") return "info" as const;
  if (format === "league_knockout") return "success" as const;
  return "neutral" as const;
}

export default function CategoriesPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterSport, setFilterSport] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | Gender>("");
  const [ageFilter, setAgeFilter] = useState("");
  const [fixtureFilter, setFixtureFilter] = useState<"" | FixtureFormatType>("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<"name" | "category" | "sport" | "fixture" | "roster">>({
    key: "name",
    dir: "asc",
  });
  const [form, setForm] = useState<CategoryForm>(() => formFromSport(""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ sportId?: string; name?: string; ageGroup?: string }>({});

  const load = async () => {
    const [sportsRes, catsRes] = await Promise.all([listSports(), listCategories()]);
    if (sportsRes.error) toast.error(sportsRes.error.message);
    if (catsRes.error) toast.error(catsRes.error.message);
    setSports(sportsRes.data ?? []);
    setCategories(catsRes.data ?? []);
    setForm((current) => {
      if (current.sportId) return current;
      const sport = sportsRes.data?.[0];
      return formFromSport(sport?.id ?? "", sport, current);
    });
  };

  useEffect(() => {
    void load();
  }, []);

  const sportOf = (id: string) => sports.find((row) => row.id === id);
  const sportName = (id: string) => sportOf(id)?.name ?? "";
  const formSport = sportOf(form.sportId);
  const athleticsForm = isAthleticsSport(formSport);
  const fixtureOptions = formatsForSport(formSport);

  const scopedCategories = useMemo(
    () => categories.filter((row) => !filterSport || row.sportId === filterSport),
    [categories, filterSport],
  );
  const genderOptions = useMemo(() => gendersForSport(scopedCategories), [scopedCategories]);
  const ageOptions = useMemo(
    () => agesForSportGender(scopedCategories, genderFilter),
    [scopedCategories, genderFilter],
  );
  const fixtureFilterOptions = useMemo(() => {
    const remaining = scopedCategories.filter((row) => {
      if (genderFilter && row.gender !== genderFilter) return false;
      if (ageFilter && row.ageGroup !== ageFilter) return false;
      return true;
    });
    const present = new Set(remaining.map((row) => row.fixtureConfig.format));
    return FIXTURE_FILTERS.filter((option) => !option.value || present.has(option.value));
  }, [scopedCategories, genderFilter, ageFilter]);

  const visible = useMemo(() => {
    const filtered = categories.filter((row) => {
      if (filterSport && row.sportId !== filterSport) return false;
      if (genderFilter && row.gender !== genderFilter) return false;
      if (ageFilter && row.ageGroup !== ageFilter) return false;
      if (fixtureFilter && row.fixtureConfig.format !== fixtureFilter) return false;
      return matchesQuery(
        search,
        row.name,
        categoryLabel(row),
        categoryGroupLabel(row),
        sportName(row.sportId),
        fixtureConfigLabel(row.fixtureConfig),
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "sport") {
        return compareText(sportName(a.sportId), sportName(b.sportId), sort.dir);
      }
      if (sort.key === "category") {
        return compareText(categoryGroupLabel(a), categoryGroupLabel(b), sort.dir);
      }
      if (sort.key === "fixture") {
        return compareText(fixtureConfigLabel(a.fixtureConfig), fixtureConfigLabel(b.fixtureConfig), sort.dir);
      }
      if (sort.key === "roster") {
        return compareNumber(a.teamSize, b.teamSize, sort.dir);
      }
      return compareText(a.name, b.name, sort.dir);
    });
  }, [categories, filterSport, fixtureFilter, genderFilter, ageFilter, search, sort, sports]);

  const close = () => {
    setOpen(false);
    setEditingId(null);
    const sport = sportOf(filterSport) ?? sports[0];
    setForm(formFromSport(sport?.id ?? "", sport));
    setFieldErrors({});
  };

  const applyFormat = (format: FixtureFormatType) => {
    const allowed = fixtureOptions.includes(format)
      ? format
      : defaultCategoryFixtureConfig(formSport, form.name).format;
    const familyRounds = roundsForFormatFamily(allowed);
    setForm((current) => {
      let kept = current.availableRounds.filter((round) => familyRounds.includes(round));
      if (allowed === "league_knockout" && !kept.includes("league")) {
        kept = ["league", ...kept];
      }
      return {
        ...current,
        format: allowed,
        scoringStyle:
          allowed === "field_attempts" && current.scoringStyle === "height"
            ? "height"
            : defaultCategoryFixtureConfig(formSport, current.name).scoringStyle,
        participantsPerMatch: defaultParticipantsPerMatch(allowed),
        availableRounds: kept.length > 0 ? kept : familyRounds,
      };
    });
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { sportId?: string; name?: string; ageGroup?: string } = {};
    if (!form.sportId) nextErrors.sportId = "Required";
    if (!form.ageGroup.trim()) nextErrors.ageGroup = "Required";
    const categoryNameErr = categoryNameError(form.name, athleticsForm ? "Event" : "Name");
    if (categoryNameErr) nextErrors.name = categoryNameErr;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      gender: form.gender,
      ageGroup: form.ageGroup,
      ageMax: form.ageMax,
      teamSize: form.teamSize,
      maxTeamSize: form.maxTeamSize,
      format: form.format,
      scoringStyle: form.scoringStyle,
      participantsPerMatch: form.participantsPerMatch,
      availableRounds: form.availableRounds,
    };
    const result = editingId
      ? await updateCategory(editingId, payload)
      : await createCategory({ sportId: form.sportId, ...payload });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Category updated." : "Category created.");
    close();
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Category"
        hint="All categories until you filter. Sport, then gender, then age, then fixture."
        action={
          <SoftButton
            variant="primary"
            onClick={() => {
              setEditingId(null);
              const sport = sportOf(filterSport) ?? sports[0];
              setForm(formFromSport(sport?.id ?? "", sport));
              setFieldErrors({});
              setOpen(true);
            }}
          >
            Add category
          </SoftButton>
        }
      />

      <TableControls
        search={search}
        onSearch={setSearch}
        placeholder="Search name, category, or fixture"
      >
        <ChipFilter
          ariaLabel="Sport"
          value={filterSport}
          onChange={(value) => {
            setFilterSport(value);
            setGenderFilter("");
            setAgeFilter("");
            setFixtureFilter("");
          }}
          options={sports.map((sport) => ({ value: sport.id, label: sport.name }))}
        />
        <ChipFilter
          ariaLabel="Gender"
          value={genderFilter}
          disabled={!filterSport}
          onChange={(value) => {
            setGenderFilter(value);
            setAgeFilter("");
            setFixtureFilter("");
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
            setFixtureFilter("");
          }}
          options={ageOptions.map((age) => ({ value: age, label: age }))}
        />
        <SoftSelect
          value={fixtureFilter}
          disabled={!ageFilter}
          onChange={(event) => setFixtureFilter(event.target.value as "" | FixtureFormatType)}
        >
          {fixtureFilterOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </SoftSelect>
      </TableControls>

      <div className="overflow-x-auto rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]">
            <tr>
              <SortTh label="Name" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Category" column="category" sort={sort} onSort={setSort} />
              <SortTh label="Sport" column="sport" sort={sort} onSort={setSort} />
              <SortTh label="Fixture" column="fixture" sort={sort} onSort={setSort} />
              <SortTh label="Roster" column="roster" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-[var(--cms-line)]">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{categoryGroupLabel(row)}</td>
                <td className="px-4 py-3">{sportName(row.sportId)}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={fixtureTone(row.fixtureConfig.format)}>
                    {fixtureConfigLabel(row.fixtureConfig)}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  {isAthleticsSport(sportOf(row.sportId))
                    ? isRelayEvent(row.name)
                      ? "Relay 4"
                      : "Solo"
                    : `${row.teamSize}/${row.maxTeamSize}`}
                </td>
                <td className="px-4 py-3 text-right">
                  <SoftButton
                    className="mr-2"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        sportId: row.sportId,
                        name: row.name,
                        gender: row.gender,
                        ageGroup: row.ageGroup,
                        ageMax: row.ageMax,
                        teamSize: row.teamSize,
                        maxTeamSize: row.maxTeamSize,
                        format: row.fixtureConfig.format,
                        scoringStyle: row.fixtureConfig.scoringStyle,
                        participantsPerMatch: row.fixtureConfig.participantsPerMatch,
                        availableRounds: row.fixtureConfig.availableRounds,
                      });
                      setFieldErrors({});
                      setOpen(true);
                    }}
                  >
                    Edit
                  </SoftButton>
                  <SoftButton
                    variant="danger"
                    onClick={async () => {
                      if (!confirm("Archive this category?")) return;
                      const { error } = await archiveCategory(row.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    Archive
                  </SoftButton>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {categories.length === 0
                    ? "No categories yet."
                    : "No matching categories."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editingId ? "Edit category" : "Add category"}
        onClose={close}
        wide
      >
        <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sport
            <select
              value={form.sportId}
              disabled={Boolean(editingId)}
              onChange={(event) => {
                const sportId = event.target.value;
                const sport = sportOf(sportId);
                const name =
                  isAthleticsSport(sport) && form.name.trim().toLowerCase() === "basketball"
                    ? ""
                    : form.name;
                setForm(formFromSport(sportId, sport, { ...form, name }));
                setFieldErrors((prev) => ({ ...prev, sportId: undefined }));
              }}
              className={`${fieldErrors.sportId ? fieldErrorClass : fieldClass} disabled:bg-[var(--ops-board-muted)]`}
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {athleticsForm ? "Event" : "Name"}
            <CategoryNameInput
              value={form.name}
              list={athleticsForm ? "athletics-events" : undefined}
              placeholder={athleticsForm ? "100m" : "Basketball"}
              onChange={(value) => {
                if (athleticsForm) {
                  const inferred = defaultCategoryFixtureConfig(formSport, value);
                  const roster = defaultAthleticsRoster(value);
                  setForm((current) => ({
                    ...current,
                    name: value,
                    format: inferred.format,
                    scoringStyle: inferred.scoringStyle,
                    participantsPerMatch: inferred.participantsPerMatch,
                    teamSize: roster.teamSize,
                    maxTeamSize: roster.maxTeamSize,
                  }));
                } else {
                  setForm((current) => ({ ...current, name: value }));
                }
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={fieldErrors.name ? fieldErrorClass : fieldClass}
            />
            {athleticsForm ? (
              <datalist id="athletics-events">
                {ATHLETICS_EVENTS.map((event) => (
                  <option key={event.name} value={event.name} />
                ))}
              </datalist>
            ) : null}
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Gender
            <select
              value={form.gender}
              onChange={(event) =>
                setForm((current) => ({ ...current, gender: event.target.value as Gender }))
              }
              className={fieldClass}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Age group
            <input
              value={form.ageGroup}
              placeholder="U14"
              onChange={(event) => {
                setForm((current) => ({ ...current, ageGroup: event.target.value }));
                setFieldErrors((prev) => ({ ...prev, ageGroup: undefined }));
              }}
              className={fieldErrors.ageGroup ? fieldErrorClass : fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Age max
            <input
              type="number"
              min={1}
              value={form.ageMax}
              onChange={(event) =>
                setForm((current) => ({ ...current, ageMax: Number(event.target.value) }))
              }
              className={fieldClass}
            />
          </label>
          {athleticsForm ? (
            <p className="sm:col-span-2 text-sm text-[var(--ops-text-muted)]">
              {isRelayEvent(form.name)
                ? "Relay teams enter — roster is 4."
                : "Solo event — athletes enter one by one, not as a team."}
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Team size
                <input
                  type="number"
                  min={1}
                  value={form.teamSize}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, teamSize: Number(event.target.value) }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Max roster
                <input
                  type="number"
                  min={1}
                  value={form.maxTeamSize}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maxTeamSize: Number(event.target.value) }))
                  }
                  className={fieldClass}
                />
              </label>
            </>
          )}
          {athleticsForm ? null : (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Athletes / sides
              <input
                type="number"
                min={1}
                max={99}
                value={form.participantsPerMatch}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    participantsPerMatch: Number(event.target.value),
                  }))
                }
                className={fieldClass}
              />
            </label>
          )}
          <div className="grid gap-2 sm:col-span-2">
            <p className="text-sm font-medium">Fixture type</p>
            {editingId && athleticsForm ? (
              <p className="text-sm text-[var(--ops-text-muted)]">
                {form.format === "field_attempts" ? "Field attempts" : "Track rounds"} is stored on
                this category and does not change.
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {formatChoices(athleticsForm).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={Boolean(editingId) && athleticsForm}
                  onClick={() => applyFormat(option.value)}
                  className={cn(
                    "rounded-xl border p-4 text-left",
                    form.format === option.value
                      ? "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)]"
                      : "border-[var(--ops-line)] hover:bg-[var(--ops-board-muted)]",
                    editingId && athleticsForm && "cursor-not-allowed opacity-60",
                  )}
                >
                  <p className="text-sm font-semibold">{option.title}</p>
                  <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{option.hint}</p>
                </button>
              ))}
            </div>
          </div>
          {form.format === "field_attempts" ? (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Scoring
              <select
                value={form.scoringStyle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scoringStyle: event.target.value }))
                }
                className={fieldClass}
              >
                <option value="distance">Distance</option>
                <option value="height">Height</option>
              </select>
            </label>
          ) : (
            <p className="self-end text-sm text-[var(--ops-text-muted)]">
              Scoring {form.scoringStyle === "simple" ? "points" : form.scoringStyle}
            </p>
          )}
          <div className="grid gap-2 sm:col-span-2">
            <p className="text-sm font-medium">Available rounds</p>
            <RoundChips
              options={roundsForFormatFamily(form.format).map((round) => ({
                value: round,
                label: roundLabel(round),
              }))}
              selected={form.availableRounds}
              onSelect={(value) => {
                if (!isFixtureRoundType(value)) return;
                setForm((current) => {
                  const has = current.availableRounds.includes(value);
                  if (has && current.availableRounds.length === 1) return current;
                  return {
                    ...current,
                    availableRounds: has
                      ? current.availableRounds.filter((round) => round !== value)
                      : [...current.availableRounds, value],
                  };
                });
              }}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              {editingId ? "Save changes" : "Add category"}
            </SoftButton>
            <SoftButton type="button" onClick={close}>
              Cancel
            </SoftButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
