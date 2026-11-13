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
  createMatch,
  getFixture,
  listFixtureMatches,
  listTeams,
  updateMatch,
} from "@/lib/services";
import type { Fixture, FixtureMatch, FixtureMatchStatus, Team } from "@/lib/types/cms";
import { eventIdentityEyebrow } from "@/lib/utils/eventFilter";
import { formatLabel, fromDatetimeLocal, MATCH_STATUSES, toDatetimeLocal } from "@/lib/utils/fixtures";

const emptyForm = {
  roundId: "",
  matchLabel: "",
  venue: "Court 1",
  scheduledAt: "",
  status: "draft" as FixtureMatchStatus,
  team1Id: "",
  team2Id: "",
};

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
  const [ready, setReady] = useState(false);
  const [roundId, setRoundId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

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
    const [matchRes, teamRes] = await Promise.all([
      listFixtureMatches(fixtureId),
      listTeams({ cscId: next.cscId }),
    ]);
    if (matchRes.error) toast.error(matchRes.error.message);
    if (teamRes.error) toast.error(teamRes.error.message);
    setMatches(matchRes.data ?? []);
    setTeams(teamRes.data ?? []);
    setRoundId((current) => current || next.rounds[0]?.id || "");
    setReady(true);
  }, [fixtureId, selected]);

  useEffect(() => {
    if (!loading && selected) void load();
  }, [loading, selected, load]);

  const startCreate = (nextRoundId?: string) => {
    setSelectedMatchId(null);
    setFieldErrors({});
    setForm({
      ...emptyForm,
      roundId: nextRoundId ?? roundId ?? fixture?.rounds[0]?.id ?? "",
      team1Id: teams[0]?.id ?? "",
      team2Id: teams[1]?.id ?? "",
    });
  };

  const openMatch = (row: FixtureMatch) => {
    setSelectedMatchId(row.id);
    setRoundId(row.roundId);
    setFieldErrors({});
    setForm({
      roundId: row.roundId,
      matchLabel: row.matchLabel,
      venue: row.venue ?? "Court 1",
      scheduledAt: toDatetimeLocal(row.scheduledAt),
      status: MATCH_STATUSES.includes(row.status) ? row.status : "draft",
      team1Id: row.team1Id,
      team2Id: row.team2Id,
    });
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.roundId) nextErrors.roundId = "Required";
    if (!form.team1Id) nextErrors.team1Id = "Required";
    if (!form.team2Id) nextErrors.team2Id = "Required";
    if (form.team1Id && form.team2Id && form.team1Id === form.team2Id) {
      nextErrors.team2Id = "Pick two different teams.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    const payload = {
      fixtureId,
      roundId: form.roundId,
      matchLabel: form.matchLabel,
      venue: form.venue,
      scheduledAt: fromDatetimeLocal(form.scheduledAt),
      status: form.status,
      team1Id: form.team1Id,
      team2Id: form.team2Id,
    };
    setSaving(true);
    const result = selectedMatchId
      ? await updateMatch(selectedMatchId, payload)
      : await createMatch(payload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(selectedMatchId ? "Match updated." : "Match added.");
    await load();
    if (result.data) openMatch(result.data);
  };

  const queue = useMemo(
    () => matches.filter((row) => !roundId || row.roundId === roundId),
    [matches, roundId],
  );

  if (loading || !ready) {
    return <p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>;
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

  const canAddMatch = teams.length >= 2;
  const gender = fixture.categoryLabel.startsWith("Girls") ? "female" : "male";
  const ageGroup = fixture.categoryLabel.replace(/^(Boys|Girls)\s+/, "");

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
        eyebrow={eventIdentityEyebrow(fixture.sportName, gender, ageGroup)}
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
        options={fixture.rounds.map((round) => ({ value: round.id, label: round.roundLabel }))}
      />
      {!canAddMatch ? (
        <p className="text-sm text-[var(--ops-text-muted)]">
          This category needs at least two teams before matches can be added.
        </p>
      ) : null}
      <SplitWorkspace
        splitAt="md"
        queue={
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Matches</p>
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
                    <p className="font-semibold">{row.matchLabel || `${row.team1Name} vs ${row.team2Name}`}</p>
                    <StatusBadge tone={statusTone(row.status)}>
                      {row.status.replace("_", " ")}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    {row.team1Name} vs {row.team2Name}
                  </p>
                </button>
              ))
            )}
          </>
        }
        board={
          <SoftCard padding="md">
            <form onSubmit={onSave} className="grid gap-4">
              <p className="text-sm font-semibold">{selectedMatchId ? "Edit match" : "New match"}</p>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Match label
                <input
                  value={form.matchLabel}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, matchLabel: event.target.value }))
                  }
                  placeholder="Match 1"
                  className={fieldClass}
                />
              </label>
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
                  Tip-off
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
                  {selectedMatchId ? "Save match" : "Add match"}
                </SoftButton>
              </StickyActionBar>
            </form>
          </SoftCard>
        }
      />
    </div>
  );
}
