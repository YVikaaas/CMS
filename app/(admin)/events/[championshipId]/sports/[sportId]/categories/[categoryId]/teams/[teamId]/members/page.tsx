"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import IconButton from "@mui/material/IconButton";
import { IconTrash } from "@tabler/icons-react";
import { AthletePicker, emptyAthleteDraft, type AthleteDraft } from "@/components/AthletePicker";
import { Modal } from "@/components/Modal";
import { SortTh, TableCard, TableExport, TablePager, TableSearch } from "@/components/table";
import { exportTable } from "@/lib/utils/exportTable";
import {
  EmptyState,
  PageHeader,
  PageLoader,
  PageSkeleton,
  SoftButton,
  StatusBadge,
  useConfirm,
} from "@/components/ops";
import { useScopedChampionship } from "@/app/(admin)/events/useScopedChampionship";
import {
  archiveTeamMember,
  createTeamMember,
  getTeam,
  listTeamMembers,
} from "@/lib/services";
import type { Team, TeamMember } from "@/lib/types/cms";
import { compareText, matchesQuery, pageRows, type SortState } from "@/lib/utils/table";
import { nameError, phoneError } from "@/lib/utils/validation";

export default function ChampionshipTeamMembersPage() {
  const confirm = useConfirm();
  const params = useParams<{
    championshipId: string;
    sportId: string;
    categoryId: string;
    teamId: string;
  }>();
  const { championshipId, sportId, categoryId, teamId } = params;
  const router = useRouter();
  const { championship, loading } = useScopedChampionship(championshipId);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<"name" | "phone" | "gender">>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AthleteDraft>(emptyAthleteDraft("male"));
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  const sportsHref = `/events/${championshipId}/sports`;
  const categoriesHref = `${sportsHref}/${sportId}/categories`;
  const teamsHref = `${categoriesHref}/${categoryId}/teams`;

  const load = useCallback(async () => {
    const teamRes = await getTeam(teamId);
    if (teamRes.error) toast.error(teamRes.error.message);
    const nextTeam = teamRes.data;
    if (
      !nextTeam ||
      nextTeam.championshipId !== championshipId ||
      nextTeam.sportId !== sportId ||
      nextTeam.categoryId !== categoryId
    ) {
      setTeam(null);
      setMembers([]);
      setReady(true);
      return;
    }
    setTeam(nextTeam);
    const memberRes = await listTeamMembers(teamId);
    if (memberRes.error) toast.error(memberRes.error.message);
    setMembers(memberRes.data ?? []);
    setReady(true);
  }, [championshipId, sportId, categoryId, teamId]);

  useEffect(() => {
    if (championship) void load();
  }, [championship, load]);

  useEffect(() => {
    if (team && team.teamSize === 1 && team.maxTeamSize === 1) {
      router.replace(teamsHref);
    }
  }, [team, teamsHref, router]);

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyAthleteDraft(team?.gender ?? "male"));
    setFieldErrors({});
  };

  const openCreate = () => {
    setForm(emptyAthleteDraft(team?.gender ?? "male"));
    setFieldErrors({});
    setFormOpen(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { name?: string; phone?: string } = {};
    const memberNameErr = nameError(form.name, "Member name");
    if (memberNameErr) nextErrors.name = memberNameErr;
    const memberPhoneErr = phoneError(form.phone, "Member phone");
    if (memberPhoneErr) nextErrors.phone = memberPhoneErr;
    if (form.existing && team && form.gender !== team.gender) {
      nextErrors.phone = `${form.name} is listed as ${form.gender}, this category is ${team.gender}.`;
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const result = await createTeamMember(teamId, {
      athleteId: form.athleteId,
      name: form.name,
      phone: form.phone,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Member added.");
    closeForm();
    await load();
  };

  const visible = useMemo(() => {
    const filtered = members.filter((member) =>
      matchesQuery(search, member.name, member.phone, member.gender),
    );
    return [...filtered].sort((a, b) => {
      if (sort.key === "phone") return compareText(a.phone, b.phone, sort.dir);
      if (sort.key === "gender") return compareText(a.gender, b.gender, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [members, search, sort]);
  const paged = pageRows(visible, page, perPage);

  if (loading || (championship && !ready)) {
    return <PageSkeleton kind="table" />;
  }
  if (!championship || !team) {
    return (
      <EmptyState
        title="Team not found"
        action={
          <Link href={teamsHref}>
            <SoftButton variant="primary">Back to teams</SoftButton>
          </Link>
        }
      />
    );
  }

  if (team.teamSize === 1 && team.maxTeamSize === 1) {
    return <PageLoader compact label="Opening athletes" />;
  }

  const atMin = members.length <= team.teamSize;
  const atMax = members.length >= team.maxTeamSize;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[
          { href: "/events", label: "Events" },
          { href: sportsHref, label: championship.name },
          { href: categoriesHref, label: team.sportName },
          { href: teamsHref, label: team.categoryLabel },
          { label: team.name },
        ]}
       
        title="Members"
        hint={`Roster must be ${team.teamSize}–${team.maxTeamSize} members, all ${team.gender}.`}
      />

      <TableCard
        title="Members"
        search={<TableSearch value={search} onChange={setSearch} placeholder="Search name or phone" />}
        count={visible.length}
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
                ],
                "team members",
                format,
              )
            }
          />
        }
        action={
          <SoftButton variant="primary" onClick={openCreate} disabled={atMax}>
            Add member
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
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((member) => (
              <tr key={member.id}>
                <td className="font-semibold">{member.name}</td>
                <td>{member.phone}</td>
                <td>
                  <StatusBadge>{member.gender}</StatusBadge>
                </td>
                <td className="text-right whitespace-nowrap">
                  <IconButton
                    color="error"
                    aria-label={`Remove ${member.name}`}
                    title="Remove"
                    disabled={atMin}
                    onClick={async () => {
                      if (!(await confirm({ title: `Remove ${member.name}?`, message: "They are taken off this team.", confirmLabel: "Remove" }))) return;
                      const { error } = await archiveTeamMember(member.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--ops-text-muted)]">
                  {members.length === 0 ? "No members yet." : "No matching members."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      <Modal open={formOpen} title="Add member" onClose={closeForm}>
        <form onSubmit={onSave} className="grid gap-4">
          <AthletePicker
            value={form}
            expectedGender={team.gender}
            onChange={(next) => {
              setForm(next);
              setFieldErrors({});
            }}
            errors={fieldErrors}
          />
          <p className="text-sm text-[var(--ops-text-muted)]">Gender is {team.gender} for this category.</p>
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              Add member
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
