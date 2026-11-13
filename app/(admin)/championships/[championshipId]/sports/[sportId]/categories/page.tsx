"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Crumbs } from "@/components/crumbs";
import { Modal, fieldClass } from "@/components/Modal";
import { SortTh, TableControls } from "@/components/table";
import { useScopedChampionship } from "../../../../useScopedChampionship";
import {
  addChampionshipEvent,
  listCategories,
  listChampionshipOfferings,
  listSports,
  removeChampionshipEvent,
} from "@/lib/services";
import type { Category, ChampionshipOffering, Gender, Sport } from "@/lib/types/cms";
import { categoryLabel } from "@/lib/utils/labels";
import { compareText, matchesQuery, type SortState } from "@/lib/utils/table";

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
  const [sort, setSort] = useState<SortState<"name" | "gender" | "age">>({
    key: "name",
    dir: "asc",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

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

  const visible = useMemo(() => {
    const filtered = assigned.filter((category) => {
      if (genderFilter && category.gender !== genderFilter) return false;
      return matchesQuery(
        search,
        categoryLabel(category),
        category.ageGroup,
        category.gender,
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "gender") return compareText(a.gender, b.gender, sort.dir);
      if (sort.key === "age") return compareText(a.ageGroup, b.ageGroup, sort.dir);
      return compareText(categoryLabel(a), categoryLabel(b), sort.dir);
    });
  }, [assigned, search, genderFilter, sort]);

  if (loading) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!championship) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Championship not found</h1>
        <Link href="/championships" className="mt-4 inline-block text-sm text-[var(--cms-action)]">
          Back to championships
        </Link>
      </div>
    );
  }

  const sportsHref = `/championships/${championshipId}/sports`;

  return (
    <div className="flex flex-col gap-6">
      <Crumbs
        items={[
          { href: "/championships", label: "Championships" },
          { href: sportsHref, label: championship.name },
          { label: sport?.name ?? "Sport" },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            {championship.name} · {sport?.name ?? "Sport"} · Category
          </h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Click a category to open its teams.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={!offering || available.length === 0}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Add category
        </button>
      </div>

      {!offering ? (
        <p className="text-sm text-[var(--cms-muted)]">
          Assign this sport first on the{" "}
          <Link href={sportsHref} className="text-[var(--cms-action)]">
            Sport
          </Link>{" "}
          page.
        </p>
      ) : null}

      <TableControls search={search} onSearch={setSearch} placeholder="Search category">
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
              <SortTh label="Category" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Gender" column="gender" sort={sort} onSort={setSort} />
              <SortTh label="Age" column="age" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium">Roster</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((category) => (
              <tr
                key={category.id}
                className="cursor-pointer border-t border-[var(--cms-line)]"
                onClick={() =>
                  router.push(
                    `/championships/${championshipId}/sports/${sportId}/categories/${category.id}/teams`,
                  )
                }
              >
                <td className="px-4 py-3 font-medium text-[var(--cms-action)]">
                  {categoryLabel(category)}
                </td>
                <td className="px-4 py-3 capitalize">{category.gender}</td>
                <td className="px-4 py-3">{category.ageGroup}</td>
                <td className="px-4 py-3">
                  {category.teamSize}–{category.maxTeamSize}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      if (!confirm(`Remove ${categoryLabel(category)}?`)) return;
                      const { error } = await removeChampionshipEvent(
                        championshipId,
                        category.id,
                      );
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Category removed.");
                        await load();
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {assigned.length === 0 ? "No categories yet." : "No matching categories."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} title="Add category" onClose={() => setFormOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!categoryId) {
              toast.error("Category is required.");
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
            await load();
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Category
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={fieldClass}
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
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !categoryId}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Add category
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
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
