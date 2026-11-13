"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { fieldClass } from "@/components/Modal";
import { ScoreMatchModal } from "@/components/ScoreMatchModal";
import { SortTh, TableControls } from "@/components/table";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { listChampionshipMatches } from "@/lib/services";
import type { FixtureMatch, FixtureMatchStatus } from "@/lib/types/cms";
import { displayScore, playerScoresPath } from "@/lib/utils/fixtures";
import { compareText, matchesQuery, type SortState } from "@/lib/utils/table";

export default function ScoringPage() {
  const { selected, loading } = useChampionship();
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | FixtureMatchStatus>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortState<"category" | "round" | "teams" | "score" | "status">>({
    key: "category",
    dir: "asc",
  });
  const [scoreMatch, setScoreMatch] = useState<FixtureMatch | null>(null);

  const load = useCallback(async () => {
    if (!selected) {
      setMatches([]);
      setReady(true);
      return;
    }
    const result = await listChampionshipMatches(selected.id);
    if (result.error) toast.error(result.error.message);
    setMatches(result.data ?? []);
    setReady(true);
  }, [selected]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  const categories = useMemo(() => {
    return [...new Set(matches.map((row) => row.categoryLabel).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [matches]);

  const visible = useMemo(() => {
    const filtered = matches.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (categoryFilter && row.categoryLabel !== categoryFilter) return false;
      return matchesQuery(search, row.team1Name, row.team2Name, row.categoryLabel);
    });
    return [...filtered].sort((a, b) => {
      if (sort.key === "round") return compareText(a.roundLabel, b.roundLabel, sort.dir);
      if (sort.key === "teams") {
        return compareText(
          `${a.team1Name} vs ${a.team2Name}`,
          `${b.team1Name} vs ${b.team2Name}`,
          sort.dir,
        );
      }
      if (sort.key === "score") return compareText(displayScore(a), displayScore(b), sort.dir);
      if (sort.key === "status") return compareText(a.status, b.status, sort.dir);
      return compareText(a.categoryLabel, b.categoryLabel, sort.dir);
    });
  }, [matches, search, statusFilter, categoryFilter, sort]);

  if (loading || !ready) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!selected) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Scoring</h1>
        <p className="mt-2 text-sm text-[var(--cms-muted)]">
          Select a championship to manage fixtures.
        </p>
        <Link
          href="/championships"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white"
        >
          Championship management
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{selected.name} · Scoring</h1>
        <p className="mt-1 text-sm text-[var(--cms-muted)]">
          Enter match scores here. Fixtures are for the draw. Results is the public board.
        </p>
      </div>

      <TableControls search={search} onSearch={setSearch} placeholder="Search team or category">
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
        <label className="flex flex-col gap-1 text-sm font-medium">
          Category
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className={fieldClass}
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </TableControls>

      <div className="overflow-hidden rounded-2xl border border-[var(--cms-line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[var(--cms-muted)]">
            <tr>
              <SortTh label="Category" column="category" sort={sort} onSort={setSort} />
              <SortTh label="Round" column="round" sort={sort} onSort={setSort} />
              <SortTh label="Teams" column="teams" sort={sort} onSort={setSort} />
              <SortTh label="Score" column="score" sort={sort} onSort={setSort} />
              <SortTh label="Status" column="status" sort={sort} onSort={setSort} />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-[var(--cms-line)]">
                <td className="px-4 py-3 font-medium">{row.categoryLabel}</td>
                <td className="px-4 py-3">{row.roundLabel}</td>
                <td className="px-4 py-3">
                  {row.team1Name} vs {row.team2Name}
                </td>
                <td className="px-4 py-3">{displayScore(row)}</td>
                <td className="px-4 py-3 capitalize">{row.status.replace("_", " ")}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={playerScoresPath(row.id)}
                    className="mr-3 text-[var(--cms-action)]"
                  >
                    Player scores
                  </Link>
                  {row.status === "cancelled" ? null : (
                    <button
                      type="button"
                      className="text-[var(--cms-action)]"
                      onClick={() => setScoreMatch(row)}
                    >
                      Score
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--cms-muted)]">
                  {matches.length === 0 ? "No matches yet." : "No matching matches."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

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
