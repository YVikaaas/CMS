"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Crumbs } from "@/components/crumbs";
import { Modal, fieldClass } from "@/components/Modal";
import { RoundChips } from "@/components/RoundChips";
import { ScoreMatchModal } from "@/components/ScoreMatchModal";
import { SortTh, TableControls } from "@/components/table";
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
import { formatLabel, fromDatetimeLocal, MATCH_STATUSES, toDatetimeLocal } from "@/lib/utils/fixtures";
import { compareNumber, compareText, matchesQuery, type SortState } from "@/lib/utils/table";

const emptyForm = {
  roundId: "",
  matchLabel: "",
  venue: "Court 1",
  scheduledAt: "",
  status: "draft" as FixtureMatchStatus,
  team1Id: "",
  team2Id: "",
};

export default function FixtureMatchesPage() {
  const params = useParams<{ fixtureId: string }>();
  const fixtureId = params.fixtureId;
  const { selected, loading } = useChampionship();
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | FixtureMatchStatus>("");
  const [sort, setSort] = useState<SortState<"label" | "venue" | "time" | "status">>({
    key: "label",
    dir: "asc",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [scoreMatch, setScoreMatch] = useState<FixtureMatch | null>(null);

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
    setReady(true);
  }, [fixtureId, selected]);

  useEffect(() => {
    if (!loading && selected) void load();
  }, [loading, selected, load]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = (roundId?: string) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      roundId: roundId ?? fixture?.rounds[0]?.id ?? "",
      team1Id: teams[0]?.id ?? "",
      team2Id: teams[1]?.id ?? "",
    });
    setFormOpen(true);
  };

  const openEdit = (row: FixtureMatch) => {
    setEditingId(row.id);
    setForm({
      roundId: row.roundId,
      matchLabel: row.matchLabel,
      venue: row.venue ?? "Court 1",
      scheduledAt: toDatetimeLocal(row.scheduledAt),
      status: MATCH_STATUSES.includes(row.status) ? row.status : "draft",
      team1Id: row.team1Id,
      team2Id: row.team2Id,
    });
    setFormOpen(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.roundId) {
      toast.error("Round is required.");
      return;
    }
    if (!form.team1Id || !form.team2Id) {
      toast.error("Both teams are required.");
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
    const result = editingId
      ? await updateMatch(editingId, payload)
      : await createMatch(payload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Match updated." : "Match added.");
    closeForm();
    await load();
  };

  const filtered = useMemo(() => {
    return matches.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      return matchesQuery(
        search,
        row.roundLabel,
        row.matchLabel,
        row.venue,
        row.team1Name,
        row.team2Name,
        row.status,
      );
    });
  }, [matches, search, statusFilter]);

  const sortRows = (rows: FixtureMatch[]) =>
    [...rows].sort((a, b) => {
      if (sort.key === "venue") return compareText(a.venue, b.venue, sort.dir);
      if (sort.key === "time") return compareText(a.scheduledAt, b.scheduledAt, sort.dir);
      if (sort.key === "status") return compareText(a.status, b.status, sort.dir);
      const label = compareText(a.matchLabel, b.matchLabel, sort.dir);
      return label !== 0 ? label : compareNumber(a.matchNumber, b.matchNumber, sort.dir);
    });

  if (loading || !ready) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!selected || !fixture) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Fixture not found</h1>
        <Link href="/gameplay/fixtures" className="mt-4 inline-block text-sm text-[var(--cms-action)]">
          Back to fixtures
        </Link>
      </div>
    );
  }

  const canAddMatch = teams.length >= 2;
  const team1 = teams.find((team) => team.id === form.team1Id);
  const team2 = teams.find((team) => team.id === form.team2Id);

  return (
    <div className="flex flex-col gap-6">
      <Crumbs
        items={[
          { href: "/gameplay/fixtures", label: "Fixtures" },
          { label: fixture.categoryLabel },
        ]}
      />
      <div>
        <h1 className="text-lg font-semibold">
          {fixture.championshipName} · {fixture.sportName} · {fixture.categoryLabel} · Matches
        </h1>
        <p className="mt-1 text-sm text-[var(--cms-muted)]">
          {formatLabel(fixture.formatType)}. Add a match inside the round it belongs to.
        </p>
      </div>

      {!canAddMatch ? (
        <p className="text-sm text-[var(--cms-muted)]">
          This category needs at least two teams before matches can be added.
        </p>
      ) : null}

      <TableControls search={search} onSearch={setSearch} placeholder="Search match, team, or court">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | FixtureMatchStatus)}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </TableControls>

      {fixture.rounds.map((round) => {
        const rows = sortRows(filtered.filter((row) => row.roundId === round.id));
        return (
          <div
            key={round.id}
            className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--cms-line)] px-4 py-3">
              <h2 className="text-sm font-semibold">{round.roundLabel}</h2>
              <button
                type="button"
                onClick={() => openCreate(round.id)}
                disabled={!canAddMatch}
                className="text-sm font-medium text-[var(--cms-action)] disabled:opacity-40"
              >
                Add match
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[var(--cms-muted)]">
                <tr>
                  <SortTh label="Match" column="label" sort={sort} onSort={setSort} />
                  <th className="px-4 py-3 font-medium">Teams</th>
                  <SortTh label="Venue" column="venue" sort={sort} onSort={setSort} />
                  <SortTh label="Tip-off" column="time" sort={sort} onSort={setSort} />
                  <SortTh label="Status" column="status" sort={sort} onSort={setSort} />
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--cms-line)]">
                    <td className="px-4 py-3 font-medium">{row.matchLabel}</td>
                    <td className="px-4 py-3">
                      {row.team1Name} vs {row.team2Name}
                    </td>
                    <td className="px-4 py-3">{row.venue || "—"}</td>
                    <td className="px-4 py-3">
                      {row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{row.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      {row.status === "cancelled" ? null : (
                        <button
                          type="button"
                          className="mr-3 text-[var(--cms-action)]"
                          onClick={() => setScoreMatch(row)}
                        >
                          Score
                        </button>
                      )}
                      <button
                        type="button"
                        className="mr-3 text-[var(--cms-action)]"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={async () => {
                          if (!confirm(`Delete ${row.matchLabel}?`)) return;
                          const { error } = await archiveMatch(row.id);
                          if (error) toast.error(error.message);
                          else await load();
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                      {matches.some((row) => row.roundId === round.id)
                        ? "No matching matches."
                        : "No matches yet."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        );
      })}

      <Modal
        open={formOpen}
        title={editingId ? "Edit match" : "Add match"}
        onClose={closeForm}
        wide
      >
        <form onSubmit={onSave} className="grid gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium">Round</p>
            <RoundChips
              options={fixture.rounds.map((round) => ({
                value: round.id,
                label: round.roundLabel,
              }))}
              selected={form.roundId ? [form.roundId] : []}
              onSelect={(value) => setForm((current) => ({ ...current, roundId: value }))}
            />
          </div>
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
              <select
                value={form.team1Id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, team1Id: event.target.value }))
                }
                className={fieldClass}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="pb-2 text-center text-sm font-semibold text-[var(--cms-muted)]">vs</p>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Team 2
              <select
                value={form.team2Id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, team2Id: event.target.value }))
                }
                className={fieldClass}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {team1 && team2 ? (
            <p className="text-sm text-[var(--cms-muted)]">
              {team1.name} vs {team2.name}
            </p>
          ) : null}
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
            <select
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
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingId ? "Save changes" : "Add match"}
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

      <ScoreMatchModal
        open={Boolean(scoreMatch)}
        match={scoreMatch}
        onClose={() => setScoreMatch(null)}
        onSaved={() => {
          setScoreMatch(null);
          void load();
        }}
      />
    </div>
  );
}
