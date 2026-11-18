"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import IconButton from "@mui/material/IconButton";
import { IconArchive, IconPencil } from "@tabler/icons-react";
import { SortTh, TableCard, TablePager, TableSearch } from "@/components/table";
import {
  ChipFilter,
  PageHeader,
  PageSkeleton,
  SoftButton,
  useConfirm,
} from "@/components/ops";
import {
  archiveSport,
  createSport,
  listSports,
  updateSport,
} from "@/lib/services";
import type { Sport, SportEventMode } from "@/lib/types/cms";
import { compareText, matchesQuery, pageRows, type SortState } from "@/lib/utils/table";
import { nameError } from "@/lib/utils/validation";

const empty = { name: "", code: "", eventMode: "team" as SportEventMode };

export default function SportsPage() {
  const confirm = useConfirm();
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
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

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
  const paged = pageRows(visible, page, perPage);

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setFieldErrors({});
    setOpen(true);
  };

  if (!ready) {
    return <PageSkeleton kind="table" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sport" hint="Global sport catalog." />

      <TableCard
        title="Sports"
        search={<TableSearch value={search} onChange={setSearch} placeholder="Search name or code" />}
        toolbar={
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
        }
        action={
          <SoftButton variant="primary" onClick={openCreate}>
            Add sport
          </SoftButton>
        }
        footer={
          <TablePager
            count={visible.length}
            page={paged.page}
            perPage={perPage}
            onPage={setPage}
            onPerPage={setPerPage}
          />
        }
      >
        <table>
          <thead>
            <tr>
              <SortTh label="Name" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Code" column="code" sort={sort} onSort={setSort} />
              <SortTh label="Mode" column="mode" sort={sort} onSort={setSort} />
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.id}>
                <td className="font-semibold">{row.name}</td>
                <td>{row.code}</td>
                <td className="capitalize">{row.eventMode}</td>
                <td className="text-right whitespace-nowrap">
                  <IconButton
                    color="success"
                    className="text-[var(--ops-success)]"
                    aria-label={`Edit ${row.name}`}
                    title="Edit"
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
                    <IconPencil size={18} />
                  </IconButton>
                  <IconButton
                    color="error"
                    aria-label={`Archive ${row.name}`}
                    title="Archive"
                    onClick={async () => {
                      if (!(await confirm({ title: `Archive ${row.name}?`, message: "It is hidden from new championships. Existing data stays.", confirmLabel: "Archive" }))) return;
                      const { error } = await archiveSport(row.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    <IconArchive size={18} />
                  </IconButton>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--ops-text-muted)]">
                  {sports.length === 0 ? "No sports yet." : "No matching sports."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      <Modal open={open} title={editingId ? "Edit sport" : "Add sport"} onClose={close}>
        <form onSubmit={onSave} className="grid gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
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
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
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
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
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
