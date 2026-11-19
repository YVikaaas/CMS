"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@mui/material/Card";
import { toast } from "sonner";
import { EmptyState, EventFilters, PageHeader, PageSkeleton, SoftButton } from "@/components/ops";
import { CategoryResultsBoard } from "@/components/results/CategoryResultsBoard";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { listCategories, listChampionshipMatches, listFixtures, listTeams } from "@/lib/services";
import type { Category, Fixture, FixtureMatch, Team } from "@/lib/types/cms";
import {
  emptyEventFilter,
  fixturePassesEventFilter,
  isEventFilterComplete,
  type EventFilterValue,
} from "@/lib/utils/eventFilter";
import { orgCityLine } from "@/lib/utils/labels";

export default function ResultsPage() {
  const { selected, loading } = useChampionship();
  const [filter, setFilter] = useState<EventFilterValue | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [ready, setReady] = useState(false);

  const activeFilter = filter ?? emptyEventFilter(selected?.id ?? "");
  const filtersReady = isEventFilterComplete(activeFilter);

  const load = useCallback(async () => {
    if (!selected) {
      setFixtures([]);
      setCategories([]);
      setMatches([]);
      setTeams([]);
      setReady(true);
      return;
    }
    const [fixtureRes, matchRes, teamRes, categoryRes] = await Promise.all([
      listFixtures(selected.id),
      listChampionshipMatches(selected.id),
      listTeams({ championshipId: selected.id }),
      listCategories(),
    ]);
    if (fixtureRes.error) toast.error(fixtureRes.error.message);
    if (matchRes.error) toast.error(matchRes.error.message);
    if (teamRes.error) toast.error(teamRes.error.message);
    if (categoryRes.error) toast.error(categoryRes.error.message);
    setFixtures(fixtureRes.data ?? []);
    setMatches(matchRes.data ?? []);
    setTeams(teamRes.data ?? []);
    setCategories(categoryRes.data ?? []);
    setReady(true);
  }, [selected]);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  const categoryById = useMemo(() => {
    const map = new Map(categories.map((row) => [row.id, row]));
    return map;
  }, [categories]);

  const visibleFixtures = useMemo(
    () =>
      fixtures.filter((row) =>
        fixturePassesEventFilter(row, activeFilter, categoryById.get(row.categoryId)),
      ),
    [fixtures, activeFilter, categoryById],
  );

  const matchesByFixture = useMemo(() => {
    const map = new Map<string, FixtureMatch[]>();
    for (const fixture of visibleFixtures) {
      map.set(
        fixture.id,
        matches.filter((row) => row.fixtureId === fixture.id && row.status !== "cancelled"),
      );
    }
    return map;
  }, [visibleFixtures, matches]);

  const orgByTeamId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const team of teams) map[team.id] = orgCityLine(team.orgName, team.city);
    return map;
  }, [teams]);

  const boards = visibleFixtures.filter((row) => (matchesByFixture.get(row.id) ?? []).length > 0);

  if (loading || !ready) {
    return <PageSkeleton kind="desk" />;
  }
  if (!selected) {
    return (
      <EmptyState
        title="Select a championship"
        action={
          <Link href="/championships">
            <SoftButton variant="primary">Championships</SoftButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader title="Results" />
      <EventFilters
        championshipId={selected.id}
        onlyWithExistingFixture
        onChange={(value) => {
          setFilter({ ...value });
        }}
      />
      {!filtersReady ? (
        <EmptyState title="Pick the event" hint="Choose sport, then gender, age and event. Each menu opens the next." />
      ) : fixtures.length === 0 ? (
        <EmptyState title="No draws yet" hint="Create a fixture first." />
      ) : boards.length === 0 ? (
        <EmptyState title="No results for this event yet" hint="Scores appear here once matches are scored." />
      ) : (
        <Card className="flex flex-col gap-3 p-3">
          {boards.map((fixture) => (
            <CategoryResultsBoard
              key={fixture.id}
              fixture={fixture}
              matches={matchesByFixture.get(fixture.id) ?? []}
              orgByTeamId={orgByTeamId}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
