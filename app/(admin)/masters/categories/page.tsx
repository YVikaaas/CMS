"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import { SortTh, TableControls } from "@/components/table";
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
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.sportId || !form.ageGroup.trim()) {
      toast.error("Sport and age group are required.");
      return;
    }
    const categoryNameErr = nameError(form.name, "Name");
    if (categoryNameErr) {
      toast.error(categoryNameErr);
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Masters · Category</h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Categories under a sport (for example Boys U14).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm({
              ...empty,
              sportId: filterSport || sports[0]?.id || "",
            });
            setOpen(true);
          }}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white"
        >
          Add category
        </button>
      </div>

      <TableControls search={search} onSearch={setSearch} placeholder="Search category or sport">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sport
          <select
            value={filterSport}
            onChange={(event) => setFilterSport(event.target.value)}
            className={fieldClass}
          >
            <option value="">All sports</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Gender
          <select
            value={genderFilter}
            onChange={(event) => setGenderFilter(event.target.value as "" | Gender)}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
      </TableControls>

      <div className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[var(--cms-muted)]">
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
                  <button
                    type="button"
                    className="mr-3 text-[var(--cms-action)]"
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
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      if (!confirm("Archive this category?")) return;
                      const { error } = await archiveCategory(row.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    Archive
                  </button>
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
              onChange={(event) => setForm((f) => ({ ...f, sportId: event.target.value }))}
              className={`${fieldClass} disabled:bg-slate-50`}
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
              onChange={(value) => setForm((f) => ({ ...f, name: value }))}
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
              onChange={(event) => setForm((f) => ({ ...f, ageGroup: event.target.value }))}
              className={fieldClass}
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
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingId ? "Save changes" : "Add category"}
            </button>
            <button
              type="button"
              onClick={close}
              className="h-10 rounded-lg border border-[var(--cms-line)] px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
