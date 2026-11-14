"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { fieldClass, fieldErrorClass } from "@/components/Modal";
import {
  ChipFilter,
  EmptyState,
  EventIdentity,
  PageHeader,
  PageSkeleton,
  SoftButton,
  SoftCard,
  SoftSelect,
  SplitWorkspace,
  StatusBadge,
  StepCrumbs,
  StickyActionBar,
} from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import {
  archiveMatch,
  createHeat,
  createMatch,
  getFixture,
  listCscAthletes,
  listFixtureMatches,
  listTeams,
  updateHeat,
  updateMatch,
} from "@/lib/services";
import type { CscAthlete, Fixture, FixtureMatch, FixtureMatchStatus, Team } from "@/lib/types/cms";
import { eventIdentityEyebrow } from "@/lib/utils/eventFilter";
import { HeatLaneSlots } from "@/components/athletics/HeatLaneSlots";
import {
  defaultVenue,
  fieldFlightCapHint,
  heatEntryLimit,
  heatQueueHint,
  heatQueueTitle,
  heatSlotCount,
  isAthleticsFormat,
  isRelayEvent,
} from "@/lib/utils/athletics";
import {
  formatLabel,
  fromDatetimeLocal,
  MATCH_STATUSES,
  sortByRoundOrder,
  toDatetimeLocal,
} from "@/lib/utils/fixtures";
import { orgCityLine } from "@/lib/utils/labels";

const emptyForm = {
  roundId: "",
  matchLabel: "",
  venue: "Court 1",
  scheduledAt: "",
  status: "draft" as FixtureMatchStatus,
  team1Id: "",
  team2Id: "",
  athleteIds: [] as string[],
  teamIds: [] as string[],
};

function laneIdsFromMatch(match: FixtureMatch, laneCount: number, relay: boolean): string[] {
  const ids = Array.from({ length: laneCount }, () => "");
  for (const row of match.participants) {
    if (row.lane < 1 || row.lane > laneCount) continue;
    ids[row.lane - 1] = relay ? row.teamId : row.athleteId;
  }
  return ids;
}

function statusTone(status: FixtureMatchStatus) {
  if (status === "completed") return "success" as const;
  if (status === "in_progress") return "warning" as const;
  if (status === "cancelled" || status === "no_show") return "danger" as const;
  if (status === "scheduled") return "primary" as const;
  return "neutral" as const;
}

export default function FixtureWorkspacePage() {
  const params = useParams<{ fixtureId: string }>();
  const fixtureId = params.fixtureId;
  const { selected, loading } = useChampionship();
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<CscAthlete[]>([]);
  const [ready, setReady] = useState(false);
  const [roundId, setRoundId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const orderedRounds = useMemo(
    () => (fixture ? sortByRoundOrder(fixture.rounds) : []),
    [fixture],
  );
  const firstRoundId = orderedRounds[0]?.id ?? "";

  const load = useCallback(async () => {
    const fixtureRes = await getFixture(fixtureId);
    if (fixtureRes.error) toast.error(fixtureRes.error.message);
    const next = fixtureRes.data;
    if (!next || (selected && next.championshipId !== selected.id)) {
      setFixture(null);
      setMatches([]);
      setTeams([]);
      setReady(true);
      return;
    }
    setFixture(next);
    const athletics = isAthleticsFormat(next.formatType);
    const relay = isRelayEvent(next.categoryName);
    const [matchRes, teamRes, athleteRes] = await Promise.all([
      listFixtureMatches(fixtureId),
      !athletics || relay
        ? listTeams({ cscId: next.cscId })
        : Promise.resolve({ data: [] as Team[], error: null }),
      athletics && !relay
        ? listCscAthletes(next.cscId)
        : Promise.resolve({ data: [] as CscAthlete[], error: null }),
    ]);
    if (matchRes.error) toast.error(matchRes.error.message);
    if (teamRes.error) toast.error(teamRes.error.message);
    if (athleteRes.error) toast.error(athleteRes.error.message);
    setMatches(matchRes.data ?? []);
    setTeams(teamRes.data ?? []);
    setAthletes(athleteRes.data ?? []);
    setRoundId((current) => current || sortByRoundOrder(next.rounds)[0]?.id || "");
    setReady(true);
  }, [fixtureId, selected]);

  useEffect(() => {
    if (!loading && selected) void load();
  }, [loading, selected, load]);

  useEffect(() => {
    if (!fixture || selectedMatchId) return;
    setForm((current) => ({
      ...current,
      roundId: current.roundId || firstRoundId,
      venue: current.venue && current.venue !== "Court 1" ? current.venue : defaultVenue(fixture.formatType),
    }));
  }, [fixture, selectedMatchId]);

  const slotsForRound = (nextRoundId?: string, filledCount = 0) => {
    if (!fixture) return 8;
    const targetId = nextRoundId ?? roundId ?? firstRoundId;
    const round = fixture.rounds.find((item) => item.id === targetId) ?? fixture.rounds[0];
    if (!round) return fixture.participantsPerMatch;
    const relay = isRelayEvent(fixture.categoryName);
    return heatSlotCount({
      formatType: fixture.formatType,
      roundType: round.roundType,
      rounds: fixture.rounds,
      participantsPerMatch: fixture.participantsPerMatch,
      filledCount,
      optionCount: relay ? teams.length : athletes.length,
    });
  };

  const startCreate = (nextRoundId?: string) => {
    setSelectedMatchId(null);
    setFieldErrors({});
    const slots = slotsForRound(nextRoundId);
    setForm({
      ...emptyForm,
      roundId: nextRoundId ?? roundId ?? firstRoundId,
      venue: fixture ? defaultVenue(fixture.formatType) : "Court 1",
      team1Id: teams[0]?.id ?? "",
      team2Id: teams[1]?.id ?? "",
      athleteIds: Array.from({ length: slots }, () => ""),
      teamIds: Array.from({ length: slots }, () => ""),
    });
  };

  const openMatch = (row: FixtureMatch) => {
    setSelectedMatchId(row.id);
    setRoundId(row.roundId);
    setFieldErrors({});
    const slots = slotsForRound(row.roundId, row.participants.length);
    setForm({
      roundId: row.roundId,
      matchLabel: row.matchLabel,
      venue: row.venue ?? defaultVenue(row.formatType),
      scheduledAt: toDatetimeLocal(row.scheduledAt),
      status: MATCH_STATUSES.includes(row.status) ? row.status : "draft",
      team1Id: row.team1Id,
      team2Id: row.team2Id,
      athleteIds: laneIdsFromMatch(row, slots, false),
      teamIds: laneIdsFromMatch(row, slots, true),
    });
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const athletics = fixture ? isAthleticsFormat(fixture.formatType) : false;
    const relay = fixture ? isRelayEvent(fixture.categoryName) : false;
    const nextErrors: Record<string, string> = {};
    if (!form.roundId) nextErrors.roundId = "Required";
    if (athletics && relay) {
      if (form.teamIds.filter(Boolean).length < 2) nextErrors.teamIds = "Pick at least two teams.";
    } else if (athletics) {
      const picked = form.athleteIds.filter(Boolean).length;
      if (picked < 2) {
        nextErrors.athleteIds = "Pick at least two athletes.";
      } else if (fixture) {
        const round = fixture.rounds.find((item) => item.id === form.roundId);
        const cap = round
          ? heatEntryLimit({
              formatType: fixture.formatType,
              roundType: round.roundType,
              rounds: fixture.rounds,
              participantsPerMatch: fixture.participantsPerMatch,
            })
          : null;
        if (cap != null && picked > cap) {
          nextErrors.athleteIds =
            round?.roundType === "final"
              ? `The final allows ${cap} athletes after qualifying.`
              : `This heat allows up to ${cap} athletes.`;
        }
      }
    } else {
      if (!form.team1Id) nextErrors.team1Id = "Required";
      if (!form.team2Id) nextErrors.team2Id = "Required";
      if (form.team1Id && form.team2Id && form.team1Id === form.team2Id) {
        nextErrors.team2Id = "Pick two different teams.";
      }
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const result = athletics
      ? selectedMatchId
        ? await updateHeat(selectedMatchId, {
            fixtureId,
            roundId: form.roundId,
            matchLabel: form.matchLabel,
            venue: form.venue,
            scheduledAt: fromDatetimeLocal(form.scheduledAt),
            status: form.status,
            athleteIds: relay ? [] : form.athleteIds,
            teamIds: relay ? form.teamIds : [],
          })
        : await createHeat({
            fixtureId,
            roundId: form.roundId,
            matchLabel: form.matchLabel,
            venue: form.venue,
            scheduledAt: fromDatetimeLocal(form.scheduledAt),
            status: form.status,
            athleteIds: relay ? [] : form.athleteIds,
            teamIds: relay ? form.teamIds : [],
          })
      : selectedMatchId
        ? await updateMatch(selectedMatchId, {
            fixtureId,
            roundId: form.roundId,
            matchLabel: form.matchLabel,
            venue: form.venue,
            scheduledAt: fromDatetimeLocal(form.scheduledAt),
            status: form.status,
            team1Id: form.team1Id,
            team2Id: form.team2Id,
          })
        : await createMatch({
            fixtureId,
            roundId: form.roundId,
            matchLabel: form.matchLabel,
            venue: form.venue,
            scheduledAt: fromDatetimeLocal(form.scheduledAt),
            status: form.status,
            team1Id: form.team1Id,
            team2Id: form.team2Id,
          });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      selectedMatchId
        ? athletics
          ? "Heat updated."
          : "Match updated."
        : athletics
          ? "Heat added."
          : "Match added.",
    );
    await load();
    if (result.data) openMatch(result.data);
  };

  const queue = useMemo(
    () => matches.filter((row) => !roundId || row.roundId === roundId),
    [matches, roundId],
  );

  if (loading || !ready) {
    return <PageSkeleton kind="split" />;
  }
  if (!selected || !fixture) {
    return (
      <EmptyState
        title="Fixture not found"
        action={
          <Link href="/gameplay/fixtures">
            <SoftButton variant="primary">Back to fixtures</SoftButton>
          </Link>
        }
      />
    );
  }

  const athletics = isAthleticsFormat(fixture.formatType);
  const relay = isRelayEvent(fixture.categoryName);
  const activeRound =
    orderedRounds.find((item) => item.id === (form.roundId || roundId)) ?? orderedRounds[0];
  const heatSlots = activeRound
    ? heatSlotCount({
        formatType: fixture.formatType,
        roundType: activeRound.roundType,
        rounds: fixture.rounds,
        participantsPerMatch: fixture.participantsPerMatch,
        filledCount: (relay ? form.teamIds : form.athleteIds).filter(Boolean).length,
        optionCount: relay ? teams.length : athletes.length,
      })
    : fixture.participantsPerMatch;
  const flightHint = activeRound
    ? fieldFlightCapHint(fixture.formatType, activeRound.roundType, fixture.rounds)
    : "";
  const canAddMatch = athletics
    ? relay
      ? teams.length >= 2
      : athletes.length >= 2
    : teams.length >= 2;
  const gender = fixture.categoryLabel.startsWith("Girls") ? "female" : "male";
  const ageGroup = fixture.categoryAgeGroup;
  const categoryName = fixture.categoryName;

  return (
    <div className="flex flex-col gap-6">
      <StepCrumbs
        items={[
          { href: "/gameplay/fixtures", label: "Sports" },
          { href: `/gameplay/fixtures/sport/${fixture.sportId}`, label: fixture.sportName },
          { label: fixture.categoryLabel },
        ]}
      />
      <PageHeader
        title="Matches"
        hint={`${formatLabel(fixture.formatType)}. Scoring is on the Scoring page.`}
      />
      <EventIdentity
        eyebrow={eventIdentityEyebrow(fixture.sportName, gender, ageGroup, categoryName)}
        title={fixture.categoryLabel}
      />
      <ChipFilter
        ariaLabel="Rounds"
        allowEmpty={false}
        showAll={false}
        value={roundId}
        onChange={(value) => {
          if (!value) return;
          setRoundId(value);
          startCreate(value);
        }}
        options={orderedRounds.map((round) => ({ value: round.id, label: round.roundLabel }))}
      />
      {!canAddMatch ? (
        <p className="text-sm text-[var(--ops-text-muted)]">
          {athletics
            ? relay
              ? "This category needs at least two relay teams before heats can be added."
              : "This category needs at least two athletes before heats can be added."
            : "This category needs at least two teams before matches can be added."}
        </p>
      ) : null}
      <SplitWorkspace
        splitAt="md"
        queue={
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{athletics ? "Heats" : "Matches"}</p>
              <SoftButton onClick={() => startCreate(roundId)} disabled={!canAddMatch}>
                Add
              </SoftButton>
            </div>
            {queue.length === 0 ? (
              <p className="text-sm text-[var(--ops-text-muted)]">No matches in this round.</p>
            ) : (
              queue.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openMatch(row)}
                  className={`rounded-xl border px-3 py-3 text-left ${
                    selectedMatchId === row.id
                      ? "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)]"
                      : "border-[var(--ops-line)] bg-white hover:bg-[var(--ops-board-muted)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">
                      {athletics
                        ? heatQueueTitle(row)
                        : row.matchLabel || `${row.team1Name} vs ${row.team2Name}`}
                    </p>
                    <StatusBadge tone={statusTone(row.status)}>
                      {row.status.replace("_", " ")}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    {athletics ? heatQueueHint(row) : `${row.team1Name} vs ${row.team2Name}`}
                  </p>
                </button>
              ))
            )}
          </>
        }
        board={
          <SoftCard padding="md">
            <form onSubmit={onSave} className="grid gap-4">
              <p className="text-sm font-semibold">
                {selectedMatchId
                  ? athletics
                    ? "Edit heat"
                    : "Edit match"
                  : athletics
                    ? "New heat"
                    : "New match"}
              </p>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {athletics ? "Heat label" : "Match label"}
                <input
                  value={form.matchLabel}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, matchLabel: event.target.value }))
                  }
                  placeholder={athletics ? "Heat 1" : "Match 1"}
                  className={fieldClass}
                />
              </label>
              {athletics ? (
                <HeatLaneSlots
                  laneCount={heatSlots}
                  ids={relay ? form.teamIds : form.athleteIds}
                  slotLabel={fixture.formatType === "field_attempts" ? "Slot" : "Lane"}
                  hint={flightHint}
                  error={fieldErrors.athleteIds || fieldErrors.teamIds}
                  options={
                    relay
                      ? teams.map((team) => ({
                          id: team.id,
                          label: orgCityLine(team.orgName, team.city)
                            ? `${team.name} · ${orgCityLine(team.orgName, team.city)}`
                            : team.name,
                        }))
                      : athletes.map((athlete) => ({
                          id: athlete.id,
                          label: orgCityLine(athlete.orgName, athlete.city)
                            ? `${athlete.name} · ${orgCityLine(athlete.orgName, athlete.city)}`
                            : athlete.name,
                        }))
                  }
                  onChange={(ids) => {
                    setForm((current) =>
                      relay ? { ...current, teamIds: ids } : { ...current, athleteIds: ids },
                    );
                    setFieldErrors((prev) => ({
                      ...prev,
                      athleteIds: undefined,
                      teamIds: undefined,
                    }));
                  }}
                />
              ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Team 1
                  <SoftSelect
                    value={form.team1Id}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, team1Id: event.target.value }));
                      setFieldErrors((prev) => ({ ...prev, team1Id: undefined }));
                    }}
                    className={fieldErrors.team1Id ? fieldErrorClass : fieldClass}
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </SoftSelect>
                </label>
                <p className="pb-2 text-center text-sm font-semibold text-[var(--ops-text-muted)]">vs</p>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Team 2
                  <SoftSelect
                    value={form.team2Id}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, team2Id: event.target.value }));
                      setFieldErrors((prev) => ({ ...prev, team2Id: undefined }));
                    }}
                    className={fieldErrors.team2Id ? fieldErrorClass : fieldClass}
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </SoftSelect>
                </label>
              </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Venue
                  <input
                    value={form.venue}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, venue: event.target.value }))
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  {athletics ? "Start" : "Tip-off"}
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, scheduledAt: event.target.value }))
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Status
                <SoftSelect
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as FixtureMatchStatus,
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </SoftSelect>
              </label>
              <StickyActionBar>
                {selectedMatchId ? (
                  <SoftButton
                    variant="danger"
                    onClick={async () => {
                      const row = matches.find((item) => item.id === selectedMatchId);
                      if (!row || !confirm(`Delete ${row.matchLabel}?`)) return;
                      const { error } = await archiveMatch(row.id);
                      if (error) toast.error(error.message);
                      else {
                        setSelectedMatchId(null);
                        startCreate(roundId);
                        await load();
                      }
                    }}
                  >
                    Delete
                  </SoftButton>
                ) : null}
                <SoftButton type="submit" variant="primary" loading={saving} disabled={!canAddMatch}>
                  {selectedMatchId
                    ? athletics
                      ? "Save heat"
                      : "Save match"
                    : athletics
                      ? "Add heat"
                      : "Add match"}
                </SoftButton>
              </StickyActionBar>
            </form>
          </SoftCard>
        }
      />
    </div>
  );
}
