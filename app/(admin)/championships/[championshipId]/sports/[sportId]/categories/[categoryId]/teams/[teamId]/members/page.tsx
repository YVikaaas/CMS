"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Crumbs } from "@/components/crumbs";
import { Modal, fieldClass } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import { SortTh, TableControls } from "@/components/table";
import { useScopedChampionship } from "@/app/(admin)/championships/useScopedChampionship";
import {
  archiveTeamMember,
  createTeamMember,
  getTeam,
  listTeamMembers,
  updateTeamMember,
} from "@/lib/services";
import type { Gender, Team, TeamMember } from "@/lib/types/cms";
import { compareText, matchesQuery, type SortState } from "@/lib/utils/table";
import { nameError, phoneError } from "@/lib/utils/validation";

const emptyForm = { name: "", phone: "" };

export default function ChampionshipTeamMembersPage() {
  const params = useParams<{
    championshipId: string;
    sportId: string;
    categoryId: string;
    teamId: string;
  }>();
  const { championshipId, sportId, categoryId, teamId } = params;
  const { championship, loading } = useScopedChampionship(championshipId);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | Gender>("");
  const [sort, setSort] = useState<SortState<"name" | "phone" | "gender">>({
    key: "name",
    dir: "asc",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const sportsHref = `/championships/${championshipId}/sports`;
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

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setForm({ name: member.name, phone: member.phone });
    setFormOpen(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const memberNameErr = nameError(form.name, "Member name");
    if (memberNameErr) {
      toast.error(memberNameErr);
      return;
    }
    const memberPhoneErr = phoneError(form.phone, "Member phone");
    if (memberPhoneErr) {
      toast.error(memberPhoneErr);
      return;
    }
    setSaving(true);
    const result = editingId
      ? await updateTeamMember(editingId, form)
      : await createTeamMember(teamId, form);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Member updated." : "Member added.");
    closeForm();
    await load();
  };

  const visible = useMemo(() => {
    const filtered = members.filter((member) => {
      if (genderFilter && member.gender !== genderFilter) return false;
      return matchesQuery(search, member.name, member.phone, member.gender);
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "phone") return compareText(a.phone, b.phone, sort.dir);
      if (sort.key === "gender") return compareText(a.gender, b.gender, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [members, search, genderFilter, sort]);

  if (loading || !ready) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!championship || !team) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Team not found</h1>
        <Link href={teamsHref} className="mt-4 inline-block text-sm text-[var(--cms-action)]">
          Back to teams
        </Link>
      </div>
    );
  }

  const atMin = members.length <= team.teamSize;
  const atMax = members.length >= team.maxTeamSize;

  return (
    <div className="flex flex-col gap-6">
      <Crumbs
        items={[
          { href: "/championships", label: "Championships" },
          { href: sportsHref, label: championship.name },
          { href: categoriesHref, label: team.sportName },
          { href: teamsHref, label: team.categoryLabel },
          { label: team.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            {championship.name} · {team.sportName} · {team.categoryLabel} · {team.name} · Members
          </h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Roster must be {team.teamSize}–{team.maxTeamSize} members, all {team.gender}.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={atMax}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Add member
        </button>
      </div>

      <TableControls search={search} onSearch={setSearch} placeholder="Search name or phone">
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
              <SortTh label="Name" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Phone" column="phone" sort={sort} onSort={setSort} />
              <SortTh label="Gender" column="gender" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((member) => (
              <tr key={member.id} className="border-t border-[var(--cms-line)]">
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3">{member.phone}</td>
                <td className="px-4 py-3 capitalize">{member.gender}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="mr-3 text-[var(--cms-action)]"
                    onClick={() => openEdit(member)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600 disabled:opacity-40"
                    disabled={atMin}
                    onClick={async () => {
                      if (!confirm(`Remove ${member.name}?`)) return;
                      const { error } = await archiveTeamMember(member.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {members.length === 0 ? "No members yet." : "No matching members."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        title={editingId ? "Edit member" : "Add member"}
        onClose={closeForm}
      >
        <form onSubmit={onSave} className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <NameInput value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Phone
            <PhoneInput
              value={form.phone}
              onChange={(phone) => setForm((current) => ({ ...current, phone }))}
            />
          </label>
          <p className="text-sm text-[var(--cms-muted)]">Gender is {team.gender} for this category.</p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingId ? "Save changes" : "Add member"}
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
