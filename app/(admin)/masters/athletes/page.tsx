"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import IconButton from "@mui/material/IconButton";
import { IconPencil } from "@tabler/icons-react";
import { Modal, fieldClass, fieldErrorClass, RequiredMark } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import { SortTh, TableCard, TableExport, TablePager, TableSearch } from "@/components/table";
import { exportTable } from "@/lib/utils/exportTable";
import { PageHeader, PageSkeleton, SoftButton, SoftSelect, StatusBadge } from "@/components/ops";
import { createAthlete, listAthletes, updateAthlete } from "@/lib/services";
import type { AthleteParticipation, ChampionshipAthlete, Gender } from "@/lib/types/cms";
import { compareNumber, compareText, matchesQuery, pageRows, type SortState } from "@/lib/utils/table";
import { nameError, phoneError } from "@/lib/utils/validation";

const emptyForm = { name: "", phone: "", gender: "male" as Gender };

function participationText(row: AthleteParticipation, athleteName: string): string {
  const event = `${row.championshipName} · ${row.sportName} · ${row.categoryLabel}`;
  if (row.teamSize <= 1 || row.teamName === athleteName) return event;
  return `${event} · ${row.teamName}`;
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<ChampionshipAthlete[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | Gender>("");
  const [sort, setSort] = useState<SortState<"name" | "phone" | "gender" | "events">>({
    key: "name",
    dir: "asc",
  });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  const load = useCallback(async () => {
    const result = await listAthletes();
    if (result.error) toast.error(result.error.message);
    setAthletes(result.data ?? []);
    setReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const filtered = athletes.filter((athlete) => {
      if (genderFilter && athlete.gender !== genderFilter) return false;
      return matchesQuery(
        search,
        athlete.name,
        athlete.phone,
        athlete.gender,
        ...athlete.participations.flatMap((row) => [
          row.championshipName,
          row.sportName,
          row.categoryLabel,
          row.teamName,
        ]),
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "phone") return compareText(a.phone, b.phone, sort.dir);
      if (sort.key === "gender") return compareText(a.gender, b.gender, sort.dir);
      if (sort.key === "events") {
        return compareNumber(a.participations.length, b.participations.length, sort.dir);
      }
      return compareText(a.name, b.name, sort.dir);
    });
  }, [athletes, search, genderFilter, sort]);
  const paged = pageRows(visible, page, perPage);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (athlete: ChampionshipAthlete) => {
    setEditingId(athlete.id);
    setForm({ name: athlete.name, phone: athlete.phone, gender: athlete.gender });
    setFieldErrors({});
    setFormOpen(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { name?: string; phone?: string } = {};
    const athleteNameErr = nameError(form.name, "Athlete name");
    if (athleteNameErr) nextErrors.name = athleteNameErr;
    const athletePhoneErr = phoneError(form.phone, "Phone");
    if (athletePhoneErr) nextErrors.phone = athletePhoneErr;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const result = editingId
      ? await updateAthlete(editingId, form)
      : await createAthlete(form);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Athlete updated." : "Athlete added.");
    closeForm();
    await load();
  };

  if (!ready) {
    return <PageSkeleton kind="table" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Athletes" hint="People who can enter any event." />

      <TableCard
        title="Athletes"
        search={<TableSearch value={search} onChange={setSearch} placeholder="Search name, phone, event, or sport" />}
        count={visible.length}
        filters={[
          {
            id: "gender",
            label: "Gender",
            value: genderFilter,
            options: [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ],
            onChange: (value) => setGenderFilter(value as "" | Gender),
          },
        ]}
        onClearAll={() => {
          setSearch("");
          setGenderFilter("");
        }}
        exportMenu={
          <TableExport
            count={visible.length}
            onExport={(format) =>
              exportTable(
                visible,
                [
                  { header: "Name", value: (row) => row.name },
                  { header: "Phone", value: (row) => row.phone },
                  { header: "Gender", value: (row) => row.gender },
                  {
                    header: "Participations",
                    value: (row) =>
                      row.participations.map((item) => participationText(item, row.name)).join("; "),
                  },
                ],
                "athletes",
                format,
              )
            }
          />
        }
        action={
          <SoftButton variant="primary" onClick={openCreate}>
            Add athlete
          </SoftButton>
        }
        footer={
          <TablePager count={visible.length} page={paged.page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        }
      >
        <table>
          <thead>
            <tr>
              <SortTh label="Name" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Phone" column="phone" sort={sort} onSort={setSort} />
              <SortTh label="Gender" column="gender" sort={sort} onSort={setSort} />
              <SortTh label="Participations" column="events" sort={sort} onSort={setSort} />
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((athlete) => (
              <tr key={athlete.id}>
                <td className="font-semibold">{athlete.name}</td>
                <td>{athlete.phone}</td>
                <td>
                  <StatusBadge>{athlete.gender}</StatusBadge>
                </td>
                <td>
                  {athlete.participations.length === 0 ? (
                    <span className="text-[var(--ops-text-muted)]">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {athlete.participations.map((row) => (
                        <span key={`${row.cscId}-${row.teamId}`}>
                          {participationText(row, athlete.name)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="text-right whitespace-nowrap">
                  <IconButton
                    color="success"
                    aria-label={`Edit ${athlete.name}`}
                    title="Edit"
                    onClick={() => openEdit(athlete)}
                  >
                    <IconPencil size={18} />
                  </IconButton>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--ops-text-muted)]">
                  {athletes.length === 0 ? "No athletes yet." : "No matching athletes."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      <Modal open={formOpen} title={editingId ? "Edit athlete" : "Add athlete"} onClose={closeForm}>
        <form onSubmit={onSave} className="grid gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span>
              Name
              <RequiredMark />
            </span>
            <NameInput
              value={form.name}
              onChange={(name) => {
                setForm((current) => ({ ...current, name }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={fieldErrors.name ? fieldErrorClass : fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span>
              Phone
              <RequiredMark />
            </span>
            <PhoneInput
              value={form.phone}
              onChange={(phone) => {
                setForm((current) => ({ ...current, phone }));
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={fieldErrors.phone ? fieldErrorClass : fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Gender
            <SoftSelect
              value={form.gender}
              onChange={(event) =>
                setForm((current) => ({ ...current, gender: event.target.value as Gender }))
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </SoftSelect>
          </label>
          {editingId ? (
            <p className="text-sm text-[var(--ops-text-muted)]">
              Changes apply everywhere this athlete is entered.
            </p>
          ) : null}
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              {editingId ? "Save changes" : "Add athlete"}
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
