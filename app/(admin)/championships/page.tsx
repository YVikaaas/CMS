"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import { IconArchive, IconPencil } from "@tabler/icons-react";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass, RequiredMark } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import { SortTh, TableCard, TablePager, TableSearch } from "@/components/table";
import {
  ChipFilter,
  PageHeader,
  PageSkeleton,
  SoftButton,
  StatusBadge,
  useConfirm,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import {
  archiveChampionship,
  createChampionship,
  updateChampionship,
} from "@/lib/services";
import type { Championship, CompetitionStatus } from "@/lib/types/cms";
import { compareText, matchesQuery, pageRows, type SortState } from "@/lib/utils/table";
import { nameError } from "@/lib/utils/validation";

const emptyForm = {
  name: "",
  location: "",
  startDate: "",
  endDate: "",
};

const statusTone: Record<CompetitionStatus, "warning" | "success" | "neutral"> = {
  draft: "warning",
  active: "success",
  archived: "neutral",
};

export default function ChampionshipsPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const { championships, selectedId, setSelectedId, refresh, loading } = useChampionship();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CompetitionStatus>("");
  const [sort, setSort] = useState<SortState<"name" | "location" | "dates" | "status">>({
    key: "name",
    dir: "asc",
  });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
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
    setFieldErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
  };

  const openChampionship = (row: Championship) => {
    setSelectedId(row.id);
    router.push(`/championships/${row.id}/sports`);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const champNameErr = nameError(form.name, "Name");
    const nextErrors = champNameErr ? { name: champNameErr } : {};
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
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
    if (!(await confirm({ title: "Archive this championship?", message: "It leaves the header picker. Its data stays.", confirmLabel: "Archive" }))) return;
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
      if (sort.key === "location") return compareText(a.location, b.location, sort.dir);
      if (sort.key === "dates") return compareText(a.startDate, b.startDate, sort.dir);
      if (sort.key === "status") return compareText(a.status, b.status, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [championships, search, statusFilter, sort]);
  const paged = pageRows(visible, page, perPage);

  if (loading) {
    return <PageSkeleton kind="table" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Championships" hint="Pick a championship, then assign sports." />

      <TableCard
        title="Championships"
        search={<TableSearch value={search} onChange={setSearch} placeholder="Search name or location" />}
        toolbar={
          <ChipFilter
            ariaLabel="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
        }
        action={
          <SoftButton variant="primary" onClick={openCreate}>
            New championship
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
              <SortTh label="Location" column="location" sort={sort} onSort={setSort} />
              <SortTh label="Dates" column="dates" sort={sort} onSort={setSort} />
              <SortTh label="Status" column="status" sort={sort} onSort={setSort} />
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.id} data-selected={selectedId === row.id ? "true" : undefined}>
                <td>
                  <button type="button" className="font-semibold" onClick={() => openChampionship(row)}>
                    {row.name}
                  </button>
                </td>
                <td>{row.location || "No location"}</td>
                <td className="whitespace-nowrap">
                  {row.startDate || "—"}
                  {row.endDate ? ` – ${row.endDate}` : ""}
                </td>
                <td>
                  <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge>
                </td>
                <td className="text-right whitespace-nowrap">
                  <IconButton color="success" aria-label={`Edit ${row.name}`} title="Edit" onClick={() => openEdit(row)}>
                    <IconPencil size={18} />
                  </IconButton>
                  <IconButton color="error" aria-label={`Archive ${row.name}`} title="Archive" onClick={() => void onArchive(row.id)}>
                    <IconArchive size={18} />
                  </IconButton>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--ops-text-muted)]">
                  {championships.length === 0 ? "No championships yet." : "No matching championships."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      <Modal
        open={formOpen}
        title={editingId ? "Edit championship" : "New championship"}
        onClose={closeForm}
      >
        <form onSubmit={onSave} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span>
              Name
              <RequiredMark />
            </span>
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
            Location
            <input
              value={form.location}
              onChange={(event) => setForm((f) => ({ ...f, location: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Start date
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((f) => ({ ...f, startDate: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            End date
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((f) => ({ ...f, endDate: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              {editingId ? "Save changes" : "Create"}
            </SoftButton>
            <SoftButton type="button" onClick={closeForm}>
              Cancel
            </SoftButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
