"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import { SortTh, TableControls } from "@/components/table";
import {
  archiveSport,
  createSport,
  listSports,
  updateSport,
} from "@/lib/services";
import type { Sport, SportEventMode } from "@/lib/types/cms";
import { compareText, matchesQuery, type SortState } from "@/lib/utils/table";
import { nameError } from "@/lib/utils/validation";

const empty = { name: "", code: "", eventMode: "team" as SportEventMode };

export default function SportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"" | SportEventMode>("");
  const [sort, setSort] = useState<SortState<"name" | "code" | "mode">>({
    key: "name",
    dir: "asc",
  });

  const load = async () => {
    const { data, error } = await listSports();
    if (error) toast.error(error.message);
    setSports(data ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(empty);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const sportNameErr = nameError(form.name, "Name");
    if (sportNameErr) {
      toast.error(sportNameErr);
      return;
    }
    if (!editingId && form.code.trim().length !== 3) {
      toast.error("A 3-letter code is required.");
      return;
    }
    setSaving(true);
    const result = editingId
      ? await updateSport(editingId, {
          name: form.name,
          eventMode: form.eventMode,
        })
      : await createSport({
          name: form.name,
          code: form.code,
          eventMode: form.eventMode,
        });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Sport updated." : "Sport created.");
    close();
    await load();
  };

  const visible = useMemo(() => {
    const filtered = sports.filter((row) => {
      if (modeFilter && row.eventMode !== modeFilter) return false;
      return matchesQuery(search, row.name, row.code, row.eventMode);
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "code") return compareText(a.code, b.code, sort.dir);
      if (sort.key === "mode") return compareText(a.eventMode, b.eventMode, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [sports, search, modeFilter, sort]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Masters · Sport</h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Global sport catalog. Basketball is seeded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(empty);
            setOpen(true);
          }}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white"
        >
          Add sport
        </button>
      </div>

      <TableControls search={search} onSearch={setSearch} placeholder="Search name or code">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Mode
          <select
            value={modeFilter}
            onChange={(event) =>
              setModeFilter(event.target.value as "" | SportEventMode)
            }
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="team">Team</option>
            <option value="solo">Solo</option>
            <option value="both">Both</option>
          </select>
        </label>
      </TableControls>

      <div className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[var(--cms-muted)]">
            <tr>
              <SortTh label="Name" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Code" column="code" sort={sort} onSort={setSort} />
              <SortTh label="Mode" column="mode" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-[var(--cms-line)]">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.code}</td>
                <td className="px-4 py-3 capitalize">{row.eventMode}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="mr-3 text-[var(--cms-action)]"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        name: row.name,
                        code: row.code,
                        eventMode: row.eventMode,
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
                      if (!confirm("Archive this sport?")) return;
                      const { error } = await archiveSport(row.id);
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
                  {sports.length === 0 ? "No sports yet." : "No matching sports."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={editingId ? "Edit sport" : "Add sport"} onClose={close}>
        <form onSubmit={onSave} className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <NameInput
              value={form.name}
              onChange={(value) => setForm((f) => ({ ...f, name: value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Code
            <input
              value={form.code}
              disabled={Boolean(editingId)}
              maxLength={3}
              onChange={(event) =>
                setForm((f) => ({ ...f, code: event.target.value.toUpperCase() }))
              }
              className={`${fieldClass} uppercase disabled:bg-slate-50`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Event mode
            <select
              value={form.eventMode}
              onChange={(event) =>
                setForm((f) => ({ ...f, eventMode: event.target.value as SportEventMode }))
              }
              className={fieldClass}
            >
              <option value="team">Team</option>
              <option value="solo">Solo</option>
              <option value="both">Both</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingId ? "Save changes" : "Add sport"}
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
