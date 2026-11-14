"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import {
  EmptyState,
  PageHeader,
  PageLoader,
  PageSkeleton,
  SoftButton,
  SoftCard,
  SoftSearch,
  StatusBadge,
  StepCrumbs,
} from "@/components/ops";
import { useScopedChampionship } from "@/app/(admin)/championships/useScopedChampionship";
import {
  archiveTeamMember,
  createTeamMember,
  getTeam,
  listTeamMembers,
  updateTeamMember,
} from "@/lib/services";
import type { Team, TeamMember } from "@/lib/types/cms";
import { compareText, matchesQuery } from "@/lib/utils/table";
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
  const router = useRouter();
  const { championship, loading } = useScopedChampionship(championshipId);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

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

  useEffect(() => {
    if (team && team.teamSize === 1 && team.maxTeamSize === 1) {
      router.replace(teamsHref);
    }
  }, [team, teamsHref, router]);

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

  const openEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setForm({ name: member.name, phone: member.phone });
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
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
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
    const filtered = members.filter((member) =>
      matchesQuery(search, member.name, member.phone, member.gender),
    );
    return [...filtered].sort((a, b) => compareText(a.name, b.name, "asc"));
  }, [members, search]);

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
      <StepCrumbs
        items={[
          { href: "/championships", label: "Championships" },
          { href: sportsHref, label: championship.name },
          { href: categoriesHref, label: team.sportName },
          { href: teamsHref, label: team.categoryLabel },
          { label: team.name },
        ]}
      />
      <PageHeader
        title="Members"
        hint={`Roster must be ${team.teamSize}–${team.maxTeamSize} members, all ${team.gender}.`}
        action={
          <SoftButton variant="primary" onClick={openCreate} disabled={atMax}>
            Add member
          </SoftButton>
        }
      />

      <SoftSearch
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search name or phone"
      />

      {visible.length === 0 ? (
        <EmptyState title={members.length === 0 ? "No members yet" : "No matching members"} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((member) => (
            <SoftCard key={member.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{member.phone}</p>
                </div>
                <StatusBadge>{member.gender}</StatusBadge>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <SoftButton onClick={() => openEdit(member)}>Edit</SoftButton>
                <SoftButton
                  variant="danger"
                  disabled={atMin}
                  onClick={async () => {
                    if (!confirm(`Remove ${member.name}?`)) return;
                    const { error } = await archiveTeamMember(member.id);
                    if (error) toast.error(error.message);
                    else await load();
                  }}
                >
                  Remove
                </SoftButton>
              </div>
            </SoftCard>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        title={editingId ? "Edit member" : "Add member"}
        onClose={closeForm}
      >
        <form onSubmit={onSave} className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <NameInput
              value={form.name}
              onChange={(name) => {
                setForm((current) => ({ ...current, name }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={fieldErrors.name ? fieldErrorClass : fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Phone
            <PhoneInput
              value={form.phone}
              onChange={(phone) => {
                setForm((current) => ({ ...current, phone }));
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={fieldErrors.phone ? fieldErrorClass : fieldClass}
            />
          </label>
          <p className="text-sm text-[var(--ops-text-muted)]">Gender is {team.gender} for this category.</p>
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              {editingId ? "Save changes" : "Add member"}
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
