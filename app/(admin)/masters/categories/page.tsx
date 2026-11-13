"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import { SortTh } from "@/components/table";
import { ChipFilter, PageHeader, SoftButton, SoftSearch, SoftSelect } from "@/components/ops";
import {
  archiveCategory,
  createCategory,
  listCategories,
  listSports,
  updateCategory,
} from "@/lib/services";
import { categoryLabel } from "@/lib/utils/labels";
import type { Category, Gender, Sport } from "@/lib/types/cms";
import { compareNumber, compareText, matchesQuery, type SortState } from "@/lib/utils/table";
import { nameError } from "@/lib/utils/validation";

const empty = {
  sportId: "",
  name: "",
  gender: "male" as Gender,
  ageGroup: "",
  ageMax: 10,
  teamSize: 5,
  maxTeamSize: 6,
};

export default function CategoriesPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterSport, setFilterSport] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | Gender>("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<"category" | "sport" | "roster">>({
    key: "category",
    dir: "asc",
  });
  const [form, setForm] = useState(empty);
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
    setForm((current) => ({
      ...current,
      sportId: current.sportId || sportsRes.data?.[0]?.id || "",
    }));
  };

  useEffect(() => {
    void load();
  }, []);

  const sportName = (id: string) => sports.find((row) => row.id === id)?.name ?? "";

  const visible = useMemo(() => {
    const filtered = categories.filter((row) => {
      if (filterSport && row.sportId !== filterSport) return false;
      if (genderFilter && row.gender !== genderFilter) return false;
      return matchesQuery(
        search,
        categoryLabel(row),
        row.name,
        row.ageGroup,
        sportName(row.sportId),
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "sport") {
        return compareText(sportName(a.sportId), sportName(b.sportId), sort.dir);
      }
      if (sort.key === "roster") {
        return compareNumber(a.teamSize, b.teamSize, sort.dir);
      }
      return compareText(categoryLabel(a), categoryLabel(b), sort.dir);
    });
  }, [categories, filterSport, genderFilter, search, sort, sports]);

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm((current) => ({ ...empty, sportId: current.sportId || sports[0]?.id || "" }));
    setFieldErrors({});
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { sportId?: string; name?: string; ageGroup?: string } = {};
    if (!form.sportId) nextErrors.sportId = "Required";
    if (!form.ageGroup.trim()) nextErrors.ageGroup = "Required";
    const categoryNameErr = nameError(form.name, "Name");
    if (categoryNameErr) nextErrors.name = categoryNameErr;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const result = editingId
      ? await updateCategory(editingId, {
          name: form.name,
          gender: form.gender,
          ageGroup: form.ageGroup,
          ageMax: form.ageMax,
          teamSize: form.teamSize,
          maxTeamSize: form.maxTeamSize,
        })
      : await createCategory({
          sportId: form.sportId,
          name: form.name,
          gender: form.gender,
          ageGroup: form.ageGroup,
          ageMax: form.ageMax,
          teamSize: form.teamSize,
          maxTeamSize: form.maxTeamSize,
        });
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
        hint="Categories under a sport (for example Boys U14)."
        action={
          <SoftButton
            variant="primary"
            onClick={() => {
              setEditingId(null);
              setForm({
                ...empty,
                sportId: filterSport || sports[0]?.id || "",
              });
              setFieldErrors({});
              setOpen(true);
            }}
          >
            Add category
          </SoftButton>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SoftSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search category or sport"
        />
        <SoftSelect value={filterSport} onChange={(event) => setFilterSport(event.target.value)}>
          <option value="">All sports</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.name}
            </option>
          ))}
        </SoftSelect>
        <ChipFilter
          ariaLabel="Gender"
          value={genderFilter}
          onChange={setGenderFilter}
          options={[
            { value: "male", label: "Boys" },
            { value: "female", label: "Girls" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]">
            <tr>
              <SortTh label="Category" column="category" sort={sort} onSort={setSort} />
              <SortTh label="Sport" column="sport" sort={sort} onSort={setSort} />
              <SortTh label="Roster" column="roster" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-[var(--cms-line)]">
                <td className="px-4 py-3 font-medium">{categoryLabel(row)}</td>
                <td className="px-4 py-3">{sportName(row.sportId)}</td>
                <td className="px-4 py-3">
                  {row.teamSize}/{row.maxTeamSize}
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
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--cms-muted)]">
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
                setForm((f) => ({ ...f, sportId: event.target.value }));
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
            Name
            <NameInput
              value={form.name}
              onChange={(value) => {
                setForm((f) => ({ ...f, name: value }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={fieldErrors.name ? fieldErrorClass : fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Gender
            <select
              value={form.gender}
              onChange={(event) =>
                setForm((f) => ({ ...f, gender: event.target.value as Gender }))
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
                setForm((f) => ({ ...f, ageGroup: event.target.value }));
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
                setForm((f) => ({ ...f, ageMax: Number(event.target.value) }))
              }
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Team size
            <input
              type="number"
              min={1}
              value={form.teamSize}
              onChange={(event) =>
                setForm((f) => ({ ...f, teamSize: Number(event.target.value) }))
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
                setForm((f) => ({ ...f, maxTeamSize: Number(event.target.value) }))
              }
              className={fieldClass}
            />
          </label>
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
