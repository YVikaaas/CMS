"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import { SortTh } from "@/components/table";
import {
  ChipFilter,
  PageHeader,
  PageSkeleton,
  SoftButton,
  SoftSearch,
} from "@/components/ops";
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
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; code?: string }>({});
  const [ready, setReady] = useState(false);

  const load = async () => {
    const { data, error } = await listSports();
    if (error) toast.error(error.message);
    setSports(data ?? []);
    setReady(true);
  };

  useEffect(() => {
    void load();
  }, []);

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(empty);
    setFieldErrors({});
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { name?: string; code?: string } = {};
    const sportNameErr = nameError(form.name, "Name");
    if (sportNameErr) nextErrors.name = sportNameErr;
    if (!editingId && form.code.trim().length !== 3) nextErrors.code = "A 3-letter code is required.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
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

  if (!ready) {
    return <PageSkeleton kind="table" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sport"
        hint="Global sport catalog."
        action={
          <SoftButton
            variant="primary"
            onClick={() => {
              setEditingId(null);
              setForm(empty);
              setFieldErrors({});
              setOpen(true);
            }}
          >
            Add sport
          </SoftButton>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SoftSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or code"
        />
        <ChipFilter
          ariaLabel="Mode"
          value={modeFilter}
          onChange={setModeFilter}
          options={[
            { value: "team", label: "Team" },
            { value: "solo", label: "Solo" },
            { value: "both", label: "Both" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]">
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
                  <SoftButton
                    className="mr-2"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        name: row.name,
                        code: row.code,
                        eventMode: row.eventMode,
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
                      if (!confirm("Archive this sport?")) return;
                      const { error } = await archiveSport(row.id);
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
              onChange={(value) => {
                setForm((f) => ({ ...f, name: value }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={fieldErrors.name ? fieldErrorClass : fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Code
            <input
              value={form.code}
              disabled={Boolean(editingId)}
              maxLength={3}
              onChange={(event) => {
                setForm((f) => ({ ...f, code: event.target.value.toUpperCase() }));
                setFieldErrors((prev) => ({ ...prev, code: undefined }));
              }}
              className={`${fieldErrors.code ? fieldErrorClass : fieldClass} uppercase disabled:bg-[var(--ops-board-muted)]`}
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
            <SoftButton type="submit" variant="primary" loading={saving}>
              {editingId ? "Save changes" : "Add sport"}
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
