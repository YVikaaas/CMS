"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import { NameInput } from "@/components/fields";
import {
  ChipFilter,
  EmptyState,
  PageHeader,
  PageSkeleton,
  SoftButton,
  SoftCard,
  SoftSearch,
  StatusBadge,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import {
  archiveChampionship,
  createChampionship,
  updateChampionship,
} from "@/lib/services";
import type { Championship, CompetitionStatus } from "@/lib/types/cms";
import { compareText, matchesQuery } from "@/lib/utils/table";
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
  const router = useRouter();
  const { championships, selectedId, setSelectedId, refresh, loading } = useChampionship();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CompetitionStatus>("");
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
    return [...filtered].sort((a, b) => compareText(a.name, b.name, "asc"));
  }, [championships, search, statusFilter]);

  if (loading) {
    return <PageSkeleton kind="table" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Championships"
        hint="Pick a championship, then assign sports."
        action={
          <SoftButton variant="primary" onClick={openCreate}>
            New championship
          </SoftButton>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SoftSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or location"
        />
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
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={championships.length === 0 ? "No championships yet" : "No matching championships"}
          hint="Create a championship to start assigning sports."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => (
            <SoftCard
              key={row.id}
              interactive
              selected={selectedId === row.id}
              onClick={() => openChampionship(row)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.name}</p>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    {row.location || "No location"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                    {row.startDate || "—"}
                    {row.endDate ? ` – ${row.endDate}` : ""}
                  </p>
                </div>
                <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge>
              </div>
              <div
                className="mt-4 flex justify-end gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                <SoftButton size="default" onClick={() => openEdit(row)}>
                  Edit
                </SoftButton>
                <SoftButton variant="danger" onClick={() => void onArchive(row.id)}>
                  Archive
                </SoftButton>
              </div>
            </SoftCard>
          ))}
        </div>
      )}

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
              onChange={(value) => {
                setForm((f) => ({ ...f, name: value }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={fieldErrors.name ? fieldErrorClass : fieldClass}
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
