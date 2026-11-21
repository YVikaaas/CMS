"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import IconButton from "@mui/material/IconButton";
import { IconPencil } from "@tabler/icons-react";
import { Modal, fieldClass, fieldErrorClass, RequiredMark } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import { SortTh, TableCard, TableExport, TablePager, TableSearch } from "@/components/table";
import { exportTable } from "@/lib/utils/exportTable";
import { EmptyState, PageHeader, PageSkeleton, SoftButton, SoftSelect, StatusBadge } from "@/components/ops";
import { useScopedChampionship } from "@/app/(admin)/events/useScopedChampionship";
import { listChampionshipAthletes, updateAthlete } from "@/lib/services";
import type { AthleteParticipation, ChampionshipAthlete, Gender } from "@/lib/types/cms";
import { compareNumber, compareText, matchesQuery, pageRows, type SortState } from "@/lib/utils/table";
import { nameError, phoneError } from "@/lib/utils/validation";

function participationText(row: AthleteParticipation, athleteName: string): string {
  const event = `${row.sportName} · ${row.categoryLabel}`;
  if (row.teamSize <= 1 || row.teamName === athleteName) return event;
  return `${event} · ${row.teamName}`;
}

export default function ChampionshipAthletesPage() {
  const params = useParams<{ championshipId: string }>();
  const championshipId = params.championshipId;
  const { championship, loading } = useScopedChampionship(championshipId);
  const [athletes, setAthletes] = useState<ChampionshipAthlete[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [sort, setSort] = useState<SortState<"name" | "phone" | "gender" | "events">>({
    key: "name",
    dir: "asc",
  });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ChampionshipAthlete | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", gender: "male" as Gender });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  const sportsHref = `/events/${championshipId}/sports`;

  const load = useCallback(async () => {
    const result = await listChampionshipAthletes(championshipId);
    if (result.error) toast.error(result.error.message);
    setAthletes(result.data ?? []);
    setReady(true);
  }, [championshipId]);

  useEffect(() => {
    if (championship) void load();
  }, [championship, load]);

  const sports = useMemo(() => {
    const names = new Map<string, string>();
    for (const athlete of athletes) {
      for (const row of athlete.participations) {
        names.set(row.sportId, row.sportName);
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [athletes]);

  const visible = useMemo(() => {
    const filtered = athletes.filter((athlete) => {
      if (sportFilter && !athlete.participations.some((row) => row.sportId === sportFilter)) {
        return false;
      }
      return matchesQuery(
        search,
        athlete.name,
        athlete.phone,
        athlete.gender,
        ...athlete.participations.flatMap((row) => [
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
  }, [athletes, search, sportFilter, sort]);
  const paged = pageRows(visible, page, perPage);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFieldErrors({});
  };

  const openEdit = (athlete: ChampionshipAthlete) => {
    setEditing(athlete);
    setForm({ name: athlete.name, phone: athlete.phone, gender: athlete.gender });
    setFieldErrors({});
    setFormOpen(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
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
    const result = await updateAthlete(editing.id, form);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Athlete updated.");
    closeForm();
    await load();
  };

  if (loading || (championship && !ready)) {
    return <PageSkeleton kind="table" />;
  }
  if (!championship) {
    return (
      <EmptyState
        title="Event not found"
        action={
          <Link href="/events">
            <SoftButton variant="primary">Back to events</SoftButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[
          { href: "/events", label: "Events" },
          { href: sportsHref, label: championship.name },
        ]}
        title="Athletes"
      />

      <TableCard
        title="Athletes"
        search={<TableSearch value={search} onChange={setSearch} placeholder="Search name, phone, sport, or category" />}
        count={visible.length}
        filters={[
          {
            id: "sport",
            label: "Sport",
            value: sportFilter,
            options: sports.map((sport) => ({ value: sport.id, label: sport.name })),
            onChange: setSportFilter,
          },
        ]}
        onClearAll={() => {
          setSearch("");
          setSportFilter("");
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
                  <div className="flex flex-col gap-1">
                    {athlete.participations.map((row) => (
                      <span key={`${row.cscId}-${row.teamId}`}>
                        {participationText(row, athlete.name)}
                      </span>
                    ))}
                  </div>
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

      <Modal open={formOpen} title="Edit athlete" onClose={closeForm}>
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
          <p className="text-sm text-[var(--ops-text-muted)]">
            Changes apply everywhere this athlete is entered.
          </p>
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              Save changes
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
