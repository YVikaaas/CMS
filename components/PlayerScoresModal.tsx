"use client";

import { useMemo, useState } from "react";
import { fieldClass, Modal } from "@/components/Modal";
import { SortTh, TableControls } from "@/components/table";
import type { FixtureMatch, MatchScoreEvent } from "@/lib/types/cms";
import { displayScore, sumPlayerPoints } from "@/lib/utils/fixtures";
import { compareNumber, compareText, matchesQuery, type SortState } from "@/lib/utils/table";

type ScoreSort = SortState<"player" | "points">;

export function PlayerScoresModal({
  open,
  match,
  events,
  busyId,
  onClose,
  onUndo,
}: {
  open: boolean;
  match: FixtureMatch | null;
  events: MatchScoreEvent[];
  busyId: string | null;
  onClose: () => void;
  onUndo: (event: MatchScoreEvent) => void;
}) {
  const [search, setSearch] = useState("");
  const [pointsFilter, setPointsFilter] = useState<"" | "1" | "2" | "3">("");
  const [sort1, setSort1] = useState<ScoreSort>({ key: "player", dir: "asc" });
  const [sort2, setSort2] = useState<ScoreSort>({ key: "player", dir: "asc" });

  const team1 = useMemo(
    () => (match ? filterTeam(events, match.team1Id, search, pointsFilter, sort1) : emptyTeam),
    [events, match, search, pointsFilter, sort1],
  );
  const team2 = useMemo(
    () => (match ? filterTeam(events, match.team2Id, search, pointsFilter, sort2) : emptyTeam),
    [events, match, search, pointsFilter, sort2],
  );

  return (
    <Modal
      open={open && Boolean(match)}
      title={match ? `Player scores · ${match.matchLabel}` : "Player scores"}
      onClose={onClose}
      xl
      over
    >
      {match ? (
        <div className="grid gap-4">
          <p className="text-sm text-[var(--cms-muted)]">
            {match.categoryLabel} · {match.roundLabel} · {displayScore(match)}
          </p>
          <p className="text-center text-lg font-semibold">
            {match.team1Name} {sumPlayerPoints(events, match.team1Id)} —{" "}
            {sumPlayerPoints(events, match.team2Id)} {match.team2Name}
          </p>
          <TableControls search={search} onSearch={setSearch} placeholder="Search player">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Points
              <select
                value={pointsFilter}
                onChange={(event) =>
                  setPointsFilter(event.target.value as "" | "1" | "2" | "3")
                }
                className={fieldClass}
              >
                <option value="">All</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
          </TableControls>
          <div className="grid gap-4 sm:grid-cols-2">
            <TeamScoreTable
              teamName={match.team1Name}
              total={sumPlayerPoints(events, match.team1Id)}
              sourceCount={team1.sourceCount}
              rows={team1.rows}
              sort={sort1}
              onSort={setSort1}
              busyId={busyId}
              onUndo={onUndo}
            />
            <TeamScoreTable
              teamName={match.team2Name}
              total={sumPlayerPoints(events, match.team2Id)}
              sourceCount={team2.sourceCount}
              rows={team2.rows}
              sort={sort2}
              onSort={setSort2}
              busyId={busyId}
              onUndo={onUndo}
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

const emptyTeam = { sourceCount: 0, rows: [] as MatchScoreEvent[] };

function filterTeam(
  events: MatchScoreEvent[],
  teamId: string,
  search: string,
  pointsFilter: "" | "1" | "2" | "3",
  sort: ScoreSort,
) {
  const source = events.filter((event) => event.teamId === teamId);
  const filtered = source.filter((event) => {
    if (pointsFilter && String(event.points) !== pointsFilter) return false;
    return matchesQuery(search, event.teamMemberName, String(event.points));
  });
  return {
    sourceCount: source.length,
    rows: [...filtered].sort((a, b) => {
      if (sort.key === "points") return compareNumber(a.points, b.points, sort.dir);
      return compareText(a.teamMemberName, b.teamMemberName, sort.dir);
    }),
  };
}

function TeamScoreTable({
  teamName,
  total,
  sourceCount,
  rows,
  sort,
  onSort,
  busyId,
  onUndo,
}: {
  teamName: string;
  total: number;
  sourceCount: number;
  rows: MatchScoreEvent[];
  sort: ScoreSort;
  onSort: (next: ScoreSort) => void;
  busyId: string | null;
  onUndo: (event: MatchScoreEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cms-line)]">
      <p className="border-b border-[var(--cms-line)] px-4 py-3 text-sm font-semibold">
        {teamName} · {total}
      </p>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[var(--cms-muted)]">
          <tr>
            <SortTh label="Player" column="player" sort={sort} onSort={onSort} />
            <SortTh label="Pts" column="points" sort={sort} onSort={onSort} />
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--cms-line)]">
              <td className="px-4 py-3">{row.teamMemberName}</td>
              <td className="px-4 py-3">{row.points}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  className="text-red-600"
                  onClick={() => onUndo(row)}
                >
                  Undo
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                {sourceCount === 0 ? "No points logged yet." : "No matching scores."}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
