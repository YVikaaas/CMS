"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Crumbs } from "@/components/crumbs";
import { Modal, fieldClass } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import { SortTh, TableControls } from "@/components/table";
import { useScopedChampionship } from "@/app/(admin)/championships/useScopedChampionship";
import {
  archiveTeam,
  createTeam,
  listCategories,
  listCscOptions,
  listSports,
  listTeams,
  updateTeam,
} from "@/lib/services";
import type { Category, CscOption, Gender, Sport, Team, TeamMemberInput } from "@/lib/types/cms";
import { categoryLabel } from "@/lib/utils/labels";
import { compareNumber, compareText, matchesQuery, type SortState } from "@/lib/utils/table";
import { nameError, optionalNameError, phoneError } from "@/lib/utils/validation";

const emptyMember = (gender: Gender = "male"): TeamMemberInput => ({
  name: "",
  phone: "",
  gender,
});

function padMembers(
  members: TeamMemberInput[],
  min: number,
  max: number,
  gender: Gender,
): TeamMemberInput[] {
  const next = members.slice(0, max);
  while (next.length < min) next.push(emptyMember(gender));
  return next;
}

export default function ChampionshipCategoryTeamsPage() {
  const router = useRouter();
  const params = useParams<{
    championshipId: string;
    sportId: string;
    categoryId: string;
  }>();
  const { championshipId, sportId, categoryId } = params;
  const { championship, loading } = useScopedChampionship(championshipId);
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [csc, setCsc] = useState<CscOption | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState<"" | "complete" | "short">("");
  const [sort, setSort] = useState<SortState<"name" | "org" | "members">>({
    key: "name",
    dir: "asc",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [members, setMembers] = useState<TeamMemberInput[]>([emptyMember()]);

  const sport = sports.find((item) => item.id === sportId) ?? null;
  const category = categories.find((item) => item.id === categoryId) ?? null;
  const minMembers = csc?.teamSize ?? category?.teamSize ?? 1;
  const maxMembers = csc?.maxTeamSize ?? category?.maxTeamSize ?? minMembers;
  const memberGender = csc?.categoryGender ?? category?.gender ?? "male";
  const sportsHref = `/championships/${championshipId}/sports`;
  const categoriesHref = `${sportsHref}/${sportId}/categories`;

  const load = useCallback(async () => {
    const [sportRes, catRes, cscRes] = await Promise.all([
      listSports(),
      listCategories(sportId),
      listCscOptions({ championshipId, sportId }),
    ]);
    if (sportRes.error) toast.error(sportRes.error.message);
    if (catRes.error) toast.error(catRes.error.message);
    if (cscRes.error) toast.error(cscRes.error.message);
    setSports(sportRes.data ?? []);
    setCategories(catRes.data ?? []);
    const match =
      (cscRes.data ?? []).find((item) => item.categoryId === categoryId) ?? null;
    setCsc(match);
    if (!match) {
      setTeams([]);
      return;
    }
    const teamRes = await listTeams({ cscId: match.id });
    if (teamRes.error) toast.error(teamRes.error.message);
    setTeams(teamRes.data ?? []);
  }, [championshipId, sportId, categoryId]);

  useEffect(() => {
    if (championship) void load();
  }, [championship, load]);

  const resetForm = () => {
    setEditingId(null);
    setTeamName("");
    setOrgName("");
    setMembers(padMembers([], minMembers, maxMembers, memberGender));
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingId(team.id);
    setTeamName(team.name);
    setOrgName(team.orgName ?? "");
    setFormOpen(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csc) {
      toast.error("Category is not assigned to this championship.");
      return;
    }
    const teamErr = nameError(teamName, "Team name");
    if (teamErr) {
      toast.error(teamErr);
      return;
    }
    const orgErr = optionalNameError(orgName, "Organization");
    if (orgErr) {
      toast.error(orgErr);
      return;
    }
    if (!editingId) {
      if (members.length < minMembers || members.length > maxMembers) {
        toast.error(`This category needs ${minMembers} to ${maxMembers} members.`);
        return;
      }
      for (const member of members) {
        const memberNameErr = nameError(member.name, "Member name");
        if (memberNameErr) {
          toast.error(memberNameErr);
          return;
        }
        const memberPhoneErr = phoneError(member.phone, "Member phone");
        if (memberPhoneErr) {
          toast.error(memberPhoneErr);
          return;
        }
      }
      const keys = members.map(
        (member) => `${member.name.trim().toLowerCase()}|${member.phone.trim()}`,
      );
      if (new Set(keys).size !== keys.length) {
        toast.error("Each member name and phone combination must be unique.");
        return;
      }
    }

    setSaving(true);
    const payload = {
      name: teamName,
      orgName: orgName || null,
    };
    const result = editingId
      ? await updateTeam(editingId, payload)
      : await createTeam({
          ...payload,
          cscId: csc.id,
          members: members.map((member) => ({ ...member, gender: memberGender })),
        });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Team updated." : "Team created.");
    closeForm();
    await load();
  };

  const visible = useMemo(() => {
    const filtered = teams.filter((team) => {
      if (rosterFilter === "complete" && team.memberCount < team.teamSize) return false;
      if (rosterFilter === "short" && team.memberCount >= team.teamSize) return false;
      return matchesQuery(search, team.name, team.orgName);
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "org") return compareText(a.orgName, b.orgName, sort.dir);
      if (sort.key === "members") return compareNumber(a.memberCount, b.memberCount, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [teams, search, rosterFilter, sort]);

  if (loading) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!championship) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Championship not found</h1>
        <Link href="/championships" className="mt-4 inline-block text-sm text-[var(--cms-action)]">
          Back to championships
        </Link>
      </div>
    );
  }

  const categoryTitle = category ? categoryLabel(category) : "Category";

  return (
    <div className="flex flex-col gap-6">
      <Crumbs
        items={[
          { href: "/championships", label: "Championships" },
          { href: sportsHref, label: championship.name },
          { href: categoriesHref, label: sport?.name ?? "Sport" },
          { label: categoryTitle },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            {championship.name} · {sport?.name ?? "Sport"} · {categoryTitle} · Teams
          </h1>
          <p className="mt-1 text-sm text-[var(--cms-muted)]">
            Click a team to open its members. Roster must be {minMembers}–{maxMembers} members.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!csc}
          className="h-10 shrink-0 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Add team
        </button>
      </div>

      {!csc ? (
        <p className="text-sm text-[var(--cms-muted)]">
          Assign this category first on the{" "}
          <Link href={categoriesHref} className="text-[var(--cms-action)]">
            Category
          </Link>{" "}
          page.
        </p>
      ) : null}

      <TableControls search={search} onSearch={setSearch} placeholder="Search team or organization">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Roster
          <select
            value={rosterFilter}
            onChange={(event) =>
              setRosterFilter(event.target.value as "" | "complete" | "short")
            }
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="complete">Complete</option>
            <option value="short">Short</option>
          </select>
        </label>
      </TableControls>

      <div className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[var(--cms-muted)]">
            <tr>
              <SortTh label="Team" column="name" sort={sort} onSort={setSort} />
              <SortTh label="Organization" column="org" sort={sort} onSort={setSort} />
              <SortTh label="Members" column="members" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((team) => (
              <tr
                key={team.id}
                className="cursor-pointer border-t border-[var(--cms-line)]"
                onClick={() => router.push(`${categoriesHref}/${categoryId}/teams/${team.id}/members`)}
              >
                <td className="px-4 py-3 font-medium text-[var(--cms-action)]">{team.name}</td>
                <td className="px-4 py-3 text-[var(--cms-muted)]">{team.orgName || "—"}</td>
                <td className="px-4 py-3">
                  {team.memberCount}/{team.teamSize}–{team.maxTeamSize}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="mr-3 text-[var(--cms-action)]"
                    onClick={() => openEdit(team)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      if (!confirm(`Delete ${team.name}?`)) return;
                      const { error } = await archiveTeam(team.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {teams.length === 0 ? "No teams yet." : "No matching teams."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        title={editingId ? "Edit team" : "Add team"}
        onClose={closeForm}
        wide={!editingId}
      >
        <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Team name
            <NameInput value={teamName} onChange={setTeamName} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Organization
            <NameInput value={orgName} onChange={setOrgName} />
          </label>
          {!editingId ? (
            <>
              <div className="sm:col-span-2 flex items-center justify-between">
                <p className="text-sm font-medium">
                  Members ({minMembers}–{maxMembers}, all {memberGender})
                </p>
                <button
                  type="button"
                  disabled={members.length >= maxMembers}
                  onClick={() =>
                    setMembers((current) =>
                      current.length >= maxMembers
                        ? current
                        : [...current, emptyMember(memberGender)],
                    )
                  }
                  className="text-sm font-medium text-[var(--cms-action)] disabled:opacity-40"
                >
                  Add member
                </button>
              </div>
              {members.map((member, index) => (
                <div
                  key={index}
                  className="sm:col-span-2 grid gap-3 rounded-xl border border-[var(--cms-line)] p-3 sm:grid-cols-2"
                >
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Name
                    <NameInput
                      value={member.name}
                      onChange={(value) =>
                        setMembers((current) =>
                          current.map((row, i) => (i === index ? { ...row, name: value } : row)),
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Phone
                    <PhoneInput
                      value={member.phone}
                      onChange={(value) =>
                        setMembers((current) =>
                          current.map((row, i) => (i === index ? { ...row, phone: value } : row)),
                        )
                      }
                    />
                  </label>
                  {members.length > minMembers ? (
                    <button
                      type="button"
                      className="sm:col-span-2 justify-self-end text-sm text-red-600"
                      onClick={() =>
                        setMembers((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingId ? "Save changes" : "Add team"}
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
