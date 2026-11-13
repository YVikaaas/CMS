"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import { SortTh, TableControls } from "@/components/table";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import {
  archiveChampionship,
  createChampionship,
  updateChampionship,
} from "@/lib/services";
import type { Championship, CompetitionStatus } from "@/lib/types/cms";
import { compareText, matchesQuery, type SortState } from "@/lib/utils/table";
import { nameError } from "@/lib/utils/validation";

const emptyForm = {
  name: "",
  location: "",
  startDate: "",
  endDate: "",
};

export default function ChampionshipsPage() {
  const router = useRouter();
  const { championships, selectedId, setSelectedId, refresh } = useChampionship();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CompetitionStatus>("");
  const [sort, setSort] = useState<SortState<"name" | "dates" | "location" | "status">>({
    key: "name",
    dir: "asc",
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row: Championship) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      location: row.location ?? "",
      startDate: row.startDate ?? "",
      endDate: row.endDate ?? "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openChampionship = (row: Championship) => {
    setSelectedId(row.id);
    router.push(`/championships/${row.id}/sports`);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const champNameErr = nameError(form.name, "Name");
    if (champNameErr) {
      toast.error(champNameErr);
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      location: form.location || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };
    const result = editingId
      ? await updateChampionship(editingId, payload)
      : await createChampionship(payload);
    setSaving(false);
    if (result.error || !result.data) {
      toast.error(result.error?.message || "Could not save championship.");
      return;
    }
    toast.success(editingId ? "Championship updated." : "Championship created.");
    setSelectedId(result.data.id);
    closeForm();
    await refresh();
    if (!editingId) router.push(`/championships/${result.data.id}/sports`);
  };

  const onArchive = async (id: string) => {
    if (!confirm("Archive this championship?")) return;
    const { error } = await archiveChampionship(id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (selectedId === id) setSelectedId(null);
    await refresh();
  };

  const visible = useMemo(() => {
    const filtered = championships.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      return matchesQuery(search, row.name, row.location, row.status);
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "dates") return compareText(a.startDate, b.startDate, sort.dir);
      if (sort.key === "location") return compareText(a.location, b.location, sort.dir);
      if (sort.key === "status") return compareText(a.status, b.status, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [championships, search, statusFilter, sort]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Championship management</h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Click a championship to open its sports, then categories, then teams.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white"
        >
          New championship
        </button>
      </div>

      <TableControls
        search={search}
        onSearch={setSearch}
        placeholder="Search name or location"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "" | CompetitionStatus)
            }
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </TableControls>

      <div className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[var(--cms-muted)]">
            <tr>
              <SortTh label="Name" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Dates" column="dates" sort={sort} onSort={setSort} />
              <SortTh label="Location" column="location" sort={sort} onSort={setSort} />
              <SortTh label="Status" column="status" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-[var(--cms-line)]"
                onClick={() => openChampionship(row)}
              >
                <td className="px-4 py-3 font-medium text-[var(--cms-action)]">{row.name}</td>
                <td className="px-4 py-3 text-[var(--cms-muted)]">
                  {row.startDate || "—"}
                  {row.endDate ? ` – ${row.endDate}` : ""}
                </td>
                <td className="px-4 py-3 text-[var(--cms-muted)]">{row.location || "—"}</td>
                <td className="px-4 py-3 capitalize text-[var(--cms-muted)]">{row.status}</td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="mr-3 text-[var(--cms-action)]"
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => void onArchive(row.id)}
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {championships.length === 0
                    ? "No championships yet."
                    : "No matching championships."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        title={editingId ? "Edit championship" : "New championship"}
        onClose={closeForm}
      >
        <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <NameInput
              value={form.name}
              onChange={(value) => setForm((f) => ({ ...f, name: value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Location
            <input
              value={form.location}
              onChange={(event) => setForm((f) => ({ ...f, location: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Start date
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((f) => ({ ...f, startDate: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            End date
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((f) => ({ ...f, endDate: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingId ? "Save changes" : "Create"}
            </button>
            <button
              type="button"
              onClick={closeForm}
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
