"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { EntrySheetModal } from "@/components/EntrySheetModal";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import {
  ChipFilter,
  EmptyState,
  PageHeader,
  PageSkeleton,
  SoftButton,
  SoftCard,
  SoftSearch,
  StatusBadge,
  StepCrumbs,
} from "@/components/ops";
import { useScopedChampionship } from "@/app/(admin)/championships/useScopedChampionship";
import {
  archiveTeam,
  createTeam,
  listCategories,
  listCscOptions,
  listSports,
  listTeamMembers,
  listTeams,
  updateTeam,
} from "@/lib/services";
import type { Category, CscOption, Gender, Sport, Team, TeamMemberInput } from "@/lib/types/cms";
import { isSoloAthleticsEvent } from "@/lib/utils/athletics";
import { isAthleticsSport } from "@/lib/utils/fixtures";
import { downloadEntrySample, type EntrySheetOptions } from "@/lib/utils/entrySheet";
import { categoryLabel, orgCityLine } from "@/lib/utils/labels";
import { compareText, matchesQuery } from "@/lib/utils/table";
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
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("");
  const [athletePhone, setAthletePhone] = useState("");
  const [members, setMembers] = useState<TeamMemberInput[]>([emptyMember()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [ready, setReady] = useState(false);

  const sport = sports.find((item) => item.id === sportId) ?? null;
  const category = categories.find((item) => item.id === categoryId) ?? null;
  const eventName = category?.name ?? csc?.categoryName ?? "";
  const solo = Boolean(eventName) && isAthleticsSport(sport) && isSoloAthleticsEvent(eventName);
  const minMembers = solo ? 1 : (csc?.teamSize ?? category?.teamSize ?? 1);
  const maxMembers = solo ? 1 : (csc?.maxTeamSize ?? category?.maxTeamSize ?? minMembers);
  const memberGender = csc?.categoryGender ?? category?.gender ?? "male";
  const sportsHref = `/championships/${championshipId}/sports`;
  const categoriesHref = `${sportsHref}/${sportId}/categories`;
  const sheetOptions: EntrySheetOptions = {
    kind: solo ? "athlete" : "team",
    minMembers,
    maxMembers,
    gender: memberGender,
    label: category ? categoryLabel(category) : eventName || "category",
  };

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
      setReady(true);
      return;
    }
    const teamRes = await listTeams({ cscId: match.id });
    if (teamRes.error) toast.error(teamRes.error.message);
    setTeams(teamRes.data ?? []);
    setReady(true);
  }, [championshipId, sportId, categoryId]);

  useEffect(() => {
    if (championship) void load();
  }, [championship, load]);

  const resetForm = () => {
    setEditingId(null);
    setTeamName("");
    setOrgName("");
    setCity("");
    setAthletePhone("");
    setMembers(padMembers([], minMembers, maxMembers, memberGender));
    setFieldErrors({});
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = async (team: Team) => {
    setEditingId(team.id);
    setTeamName(team.name);
    setOrgName(team.orgName ?? "");
    setCity(team.city ?? "");
    setAthletePhone("");
    setFieldErrors({});
    if (solo) {
      const membersRes = await listTeamMembers(team.id);
      if (membersRes.error) toast.error(membersRes.error.message);
      const athlete = membersRes.data?.[0];
      setTeamName(athlete?.name || team.name);
      setAthletePhone(athlete?.phone ?? "");
      setMembers(
        athlete
          ? [{ name: athlete.name, phone: athlete.phone, gender: memberGender }]
          : padMembers([], 1, 1, memberGender),
      );
    }
    setFormOpen(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csc) {
      toast.error("Category is not assigned to this championship.");
      return;
    }
    const nextErrors: Record<string, string> = {};
    const teamErr = nameError(teamName, solo ? "Athlete name" : "Team name");
    if (teamErr) nextErrors.teamName = teamErr;
    const orgErr = optionalNameError(orgName, "Organization");
    if (orgErr) nextErrors.orgName = orgErr;
    const cityErr = optionalNameError(city, "City");
    if (cityErr) nextErrors.city = cityErr;
    const roster = solo
      ? [{ name: teamName, phone: athletePhone, gender: memberGender }]
      : members;
    if (solo) {
      const phoneErr = phoneError(athletePhone, "Phone");
      if (phoneErr) nextErrors.athletePhone = phoneErr;
    } else if (!editingId) {
      roster.forEach((member, index) => {
        const memberNameErr = nameError(member.name, "Member name");
        if (memberNameErr) nextErrors[`memberName-${index}`] = memberNameErr;
        const memberPhoneErr = phoneError(member.phone, "Member phone");
        if (memberPhoneErr) nextErrors[`memberPhone-${index}`] = memberPhoneErr;
      });
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    if (solo || !editingId) {
      if (roster.length < minMembers || roster.length > maxMembers) {
        toast.error(
          solo
            ? "This event is for individual athletes."
            : `This category needs ${minMembers} to ${maxMembers} members.`,
        );
        return;
      }
      const keys = roster.map(
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
      city: city || null,
    };
    const result = editingId
      ? await updateTeam(editingId, {
          ...payload,
          ...(solo
            ? { members: roster.map((member) => ({ ...member, gender: memberGender })) }
            : {}),
        })
      : await createTeam({
          ...payload,
          cscId: csc.id,
          members: roster.map((member) => ({ ...member, gender: memberGender })),
        });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      editingId
        ? solo
          ? "Athlete updated."
          : "Team updated."
        : solo
          ? "Athlete added."
          : "Team created.",
    );
    closeForm();
    await load();
  };

  const visible = useMemo(() => {
    const filtered = teams.filter((team) => {
      if (rosterFilter === "complete" && team.memberCount < team.teamSize) return false;
      if (rosterFilter === "short" && team.memberCount >= team.teamSize) return false;
      return matchesQuery(search, team.name, team.orgName, team.city);
    });
    return [...filtered].sort((a, b) => compareText(a.name, b.name, "asc"));
  }, [teams, search, rosterFilter]);

  if (loading || (championship && !ready)) {
    return <PageSkeleton kind="table" />;
  }
  if (!championship) {
    return (
      <EmptyState
        title="Championship not found"
        action={
          <Link href="/championships">
            <SoftButton variant="primary">Back to championships</SoftButton>
          </Link>
        }
      />
    );
  }

  const categoryTitle = category ? categoryLabel(category) : "Category";

  return (
    <div className="flex flex-col gap-6">
      <StepCrumbs
        items={[
          { href: "/championships", label: "Championships" },
          { href: sportsHref, label: championship.name },
          { href: categoriesHref, label: sport?.name ?? "Sport" },
          { label: categoryTitle },
        ]}
      />
      <PageHeader
        title={solo ? "Athletes" : "Teams"}
        hint={
          solo
            ? "Individual athletes enter this event. Click a card to edit."
            : isAthleticsSport(sport)
              ? "Relay teams of 4 enter this event. Click a team for members."
              : `Roster must be ${minMembers}–${maxMembers} members. Click a team for members.`
        }
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SoftButton
              disabled={!csc}
              onClick={() => {
                void downloadEntrySample(sheetOptions);
              }}
            >
              {solo ? "Download athlete sample" : "Download team sample"}
            </SoftButton>
            <SoftButton disabled={!csc} onClick={() => setImportOpen(true)}>
              Import Excel
            </SoftButton>
            <SoftButton variant="primary" onClick={openCreate} disabled={!csc}>
              {solo ? "Add athlete" : "Add team"}
            </SoftButton>
          </div>
        }
      />

      {!csc ? (
        <EmptyState
          title="Assign this category first"
          action={
            <Link href={categoriesHref}>
              <SoftButton variant="primary">Categories</SoftButton>
            </Link>
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SoftSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={solo ? "Search athlete, organization, or city" : "Search team, organization, or city"}
        />
        {solo ? null : (
          <ChipFilter
            ariaLabel="Roster"
            value={rosterFilter}
            onChange={setRosterFilter}
            options={[
              { value: "complete", label: "Complete" },
              { value: "short", label: "Short" },
            ]}
          />
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={
            teams.length === 0
              ? solo
                ? "No athletes yet"
                : "No teams yet"
              : solo
                ? "No matching athletes"
                : "No matching teams"
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((team) => {
            const complete = team.memberCount >= team.teamSize;
            return (
              <SoftCard
                key={team.id}
                interactive
                onClick={() =>
                  solo
                    ? void openEdit(team)
                    : router.push(`${categoriesHref}/${categoryId}/teams/${team.id}/members`)
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                      {orgCityLine(team.orgName, team.city) || "No organization or city"}
                    </p>
                  </div>
                  {solo ? null : (
                    <StatusBadge tone={complete ? "success" : "warning"}>
                      {team.memberCount}/{team.maxTeamSize}
                    </StatusBadge>
                  )}
                </div>
                <div
                  className="mt-4 flex justify-end gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  {solo ? null : <SoftButton onClick={() => void openEdit(team)}>Edit</SoftButton>}
                  <SoftButton
                    variant="danger"
                    onClick={async () => {
                      if (!confirm(`Delete ${team.name}?`)) return;
                      const { error } = await archiveTeam(team.id);
                      if (error) toast.error(error.message);
                      else await load();
                    }}
                  >
                    Delete
                  </SoftButton>
                </div>
              </SoftCard>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        title={
          solo
            ? editingId
              ? "Edit athlete"
              : "Add athlete"
            : editingId
              ? "Edit team"
              : "Add team"
        }
        onClose={closeForm}
        wide={!solo && !editingId}
      >
        <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {solo ? "Athlete name" : "Team name"}
            <NameInput
              value={teamName}
              onChange={(value) => {
                setTeamName(value);
                setFieldErrors((prev) => ({ ...prev, teamName: undefined }));
              }}
              className={fieldErrors.teamName ? fieldErrorClass : fieldClass}
            />
          </label>
          {solo ? (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Phone
              <PhoneInput
                value={athletePhone}
                onChange={(value) => {
                  setAthletePhone(value);
                  setFieldErrors((prev) => ({ ...prev, athletePhone: undefined }));
                }}
                className={fieldErrors.athletePhone ? fieldErrorClass : fieldClass}
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Organization
            <NameInput
              value={orgName}
              onChange={(value) => {
                setOrgName(value);
                setFieldErrors((prev) => ({ ...prev, orgName: undefined }));
              }}
              className={fieldErrors.orgName ? fieldErrorClass : fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            City
            <NameInput
              value={city}
              onChange={(value) => {
                setCity(value);
                setFieldErrors((prev) => ({ ...prev, city: undefined }));
              }}
              className={fieldErrors.city ? fieldErrorClass : fieldClass}
            />
          </label>
          {!solo && !editingId ? (
            <>
              <div className="flex items-center justify-between sm:col-span-2">
                <p className="text-sm font-medium">
                  Members ({minMembers}–{maxMembers}, all {memberGender})
                </p>
                <SoftButton
                  disabled={members.length >= maxMembers}
                  onClick={() =>
                    setMembers((current) =>
                      current.length >= maxMembers
                        ? current
                        : [...current, emptyMember(memberGender)],
                    )
                  }
                >
                  Add member
                </SoftButton>
              </div>
              {members.map((member, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-[var(--ops-line)] p-3 sm:col-span-2 sm:grid-cols-2"
                >
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Name
                    <NameInput
                      value={member.name}
                      onChange={(value) => {
                        setMembers((current) =>
                          current.map((row, i) => (i === index ? { ...row, name: value } : row)),
                        );
                        setFieldErrors((prev) => ({ ...prev, [`memberName-${index}`]: undefined }));
                      }}
                      className={fieldErrors[`memberName-${index}`] ? fieldErrorClass : fieldClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Phone
                    <PhoneInput
                      value={member.phone}
                      onChange={(value) => {
                        setMembers((current) =>
                          current.map((row, i) => (i === index ? { ...row, phone: value } : row)),
                        );
                        setFieldErrors((prev) => ({ ...prev, [`memberPhone-${index}`]: undefined }));
                      }}
                      className={fieldErrors[`memberPhone-${index}`] ? fieldErrorClass : fieldClass}
                    />
                  </label>
                  {members.length > minMembers ? (
                    <SoftButton
                      variant="ghost"
                      className="justify-self-end sm:col-span-2"
                      onClick={() =>
                        setMembers((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </SoftButton>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}
          <div className="flex gap-2 sm:col-span-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              {editingId ? "Save changes" : solo ? "Add athlete" : "Add team"}
            </SoftButton>
            <SoftButton type="button" onClick={closeForm}>
              Cancel
            </SoftButton>
          </div>
        </form>
      </Modal>
      {csc ? (
        <EntrySheetModal
          open={importOpen}
          cscId={csc.id}
          options={sheetOptions}
          onClose={() => setImportOpen(false)}
          onImported={load}
        />
      ) : null}
    </div>
  );
}
