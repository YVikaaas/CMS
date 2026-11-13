"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { fieldClass } from "@/components/Modal";
import { TableControls } from "@/components/table";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { listChampionshipMatches } from "@/lib/services";
import type { FixtureMatch, FixtureRoundType } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";
import {
  FIXTURE_ROUND_TYPES,
  resultLabel,
  resultOutcome,
  roundLabel,
  sidePoints,
  winnerFromResults,
} from "@/lib/utils/fixtures";
import { compareText, matchesQuery } from "@/lib/utils/table";

export default function ResultsPage() {
  const { selected, loading } = useChampionship();
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState<"" | FixtureRoundType>("");

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

  const published = useMemo(
    () =>
      matches.filter(
        (row) => row.status === "completed" || row.status === "in_progress",
      ),
    [matches],
  );

  const categories = useMemo(() => {
    return [...new Set(published.map((row) => row.categoryLabel).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [published]);

  const rounds = useMemo(() => {
    const present = new Set(published.map((row) => row.roundType));
    return FIXTURE_ROUND_TYPES.filter((type) => present.has(type));
  }, [published]);

  const filtered = useMemo(() => {
    return published
      .filter((row) => {
        if (categoryFilter && row.categoryLabel !== categoryFilter) return false;
        if (roundFilter && row.roundType !== roundFilter) return false;
        return matchesQuery(
          search,
          row.team1Name,
          row.team2Name,
          row.categoryLabel,
          row.matchLabel,
          resultLabel(row),
        );
      })
      .sort((a, b) => {
        const category = compareText(a.categoryLabel, b.categoryLabel, "asc");
        if (category !== 0) return category;
        return compareText(a.matchLabel, b.matchLabel, "asc");
      });
  }, [published, search, categoryFilter, roundFilter]);

  if (loading || !ready) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!selected) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Results</h1>
        <p className="mt-2 text-sm text-[var(--cms-muted)]">
          Select a championship to view results.
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

  const visibleRounds = roundFilter ? rounds.filter((type) => type === roundFilter) : rounds;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{selected.name} · Results</h1>
        <p className="mt-1 text-sm text-[var(--cms-muted)]">
          Official round results. Live and completed matches only.
        </p>
      </div>

      <TableControls search={search} onSearch={setSearch} placeholder="Search team or category">
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
        <label className="flex flex-col gap-1 text-sm font-medium">
          Round
          <select
            value={roundFilter}
            onChange={(event) => setRoundFilter(event.target.value as "" | FixtureRoundType)}
            className={fieldClass}
          >
            <option value="">All</option>
            {rounds.map((type) => (
              <option key={type} value={type}>
                {roundLabel(type)}
              </option>
            ))}
          </select>
        </label>
      </TableControls>

      {published.length === 0 ? (
        <p className="rounded-2xl border border-[var(--cms-line)] bg-white px-4 py-8 text-center text-sm text-[var(--cms-muted)]">
          No results yet.
        </p>
      ) : visibleRounds.length === 0 || filtered.length === 0 ? (
        <p className="rounded-2xl border border-[var(--cms-line)] bg-white px-4 py-8 text-center text-sm text-[var(--cms-muted)]">
          No matching results.
        </p>
      ) : (
        visibleRounds.map((roundType) => {
          const roundRows = filtered.filter((row) => row.roundType === roundType);
          if (roundRows.length === 0) return null;
          const categoryNames = [...new Set(roundRows.map((row) => row.categoryLabel))];
          return (
            <section key={roundType} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--cms-muted)]">
                {roundLabel(roundType)}
              </h2>
              {categoryNames.map((category) => {
                const cards = roundRows.filter((row) => row.categoryLabel === category);
                return (
                  <div key={`${roundType}-${category}`} className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">{category}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {cards.map((row) => (
                        <ResultCard key={row.id} match={row} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}

function ResultCard({ match }: { match: FixtureMatch }) {
  const winner = winnerFromResults(match.team1ResultStatus, match.team2ResultStatus);
  const outcome = resultOutcome(match);
  return (
    <article className="rounded-2xl border border-[var(--cms-line)] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-[var(--cms-muted)]">
        <span>{match.matchLabel}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide",
            outcome === "Final"
              ? "bg-slate-100 text-slate-700"
              : outcome === "Live"
                ? "bg-emerald-50 text-emerald-700"
                : outcome === "Draw"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-slate-50 text-slate-500",
          )}
        >
          {outcome}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
        <p className={cn("text-sm", winner === "1" ? "font-semibold text-slate-900" : "text-slate-600")}>
          {match.team1Name}
        </p>
        <p
          className={cn(
            "text-right text-lg tabular-nums",
            winner === "1" ? "font-semibold" : "font-medium text-slate-600",
          )}
        >
          {sidePoints(match.team1Points)}
        </p>
        <p className={cn("text-sm", winner === "2" ? "font-semibold text-slate-900" : "text-slate-600")}>
          {match.team2Name}
        </p>
        <p
          className={cn(
            "text-right text-lg tabular-nums",
            winner === "2" ? "font-semibold" : "font-medium text-slate-600",
          )}
        >
          {sidePoints(match.team2Points)}
        </p>
      </div>
    </article>
  );
}
