"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { IconCircleCheck, IconMedal, IconTrophy, IconUsers } from "@tabler/icons-react";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { TableCard, TableExport } from "@/components/table";
import { exportTable } from "@/lib/utils/exportTable";
import {
  EmptyState,
  ErrorBanner,
  EventSetupWizard,
  FixtureSportHops,
  GreetingBanner,
  PageSkeleton,
  Shimmer,
  SoftButton,
  SoftCard,
  StatCard,
  StatusBadge,
} from "@/components/ops";
import { getDashboardSummary } from "@/lib/services";
import type { Championship, CompetitionStatus, DashboardSummary } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";
import { formatDateRange } from "@/lib/utils/dates";

const statusTone: Record<CompetitionStatus, "warning" | "success" | "neutral"> = {
  draft: "warning",
  active: "success",
  archived: "neutral",
};

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function firstName(fullName: string | null | undefined): string | null {
  return fullName?.trim().split(/\s+/)[0] || null;
}

function championshipHint(row: Championship): string {
  const bits = [
    row.location || "No location",
    formatDateRange(row.startDate, row.endDate, ""),
  ].filter(Boolean);
  return bits.join(" · ");
}

function Section({
  title,
  action,
  children,
  extra,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--ops-text-muted)]">{title}</h2>
        {action}
      </div>
      <div className={cn("grid gap-4 sm:grid-cols-2", className ?? "lg:grid-cols-4")}>{children}</div>
      {extra}
    </section>
  );
}

function detailRows(s: DashboardSummary, sportsHref: string) {
  return [
    { group: "Setup", label: "Sports", value: s.sportCount, href: sportsHref },
    { group: "Setup", label: "Categories", value: s.categoryCount, hint: `${s.boysCategoryCount} boys · ${s.girlsCategoryCount} girls`, href: sportsHref },
    { group: "Setup", label: "Age groups", value: s.ageGroupCount },
    { group: "Setup", label: "Solo categories", value: s.soloCategoryCount, hint: `${s.relayCategoryCount} relays · ${s.teamSportCategoryCount} team sports` },
    { group: "Setup", label: "Team entries", value: s.teamEntryCount, hint: `${s.basketballTeamCount} team sports · ${s.relayEntryCount} relays` },
    { group: "Setup", label: "Solo athletes", value: s.soloAthleteCount, hint: `${s.athleteCount} players in all` },
    { group: "Setup", label: "Organizations", value: s.orgCount },
    { group: "Setup", label: "Cities", value: s.cityCount },
    { group: "Coverage", label: "With entries", value: s.categoryWithEntryCount, hint: `${s.categoryWithoutEntryCount} categories still empty` },
    { group: "Coverage", label: "With draws", value: s.categoryWithDrawCount, hint: `${s.categoryWithoutDrawCount} still need a draw`, href: "/gameplay/fixtures" },
    { group: "Coverage", label: "All entries", value: s.teamCount, hint: "Team-of-1 and teams", href: "/gameplay/fixtures" },
    { group: "Draws", label: "Draws", value: s.fixtureCount, hint: `${s.rankingLockedCount} ranking locked`, href: "/gameplay/fixtures" },
    { group: "Draws", label: "Draft", value: s.fixtureDraft, href: "/gameplay/fixtures" },
    { group: "Draws", label: "Published", value: s.fixturePublished, href: "/gameplay/fixtures" },
    { group: "Draws", label: "In progress", value: s.fixtureInProgress, href: "/gameplay/scoring" },
    { group: "Draws", label: "Completed", value: s.fixtureCompleted, href: "/gameplay/results" },
    { group: "Draws", label: "Track", value: s.trackFixtureCount, hint: "Heats and timed rounds" },
    { group: "Draws", label: "Field", value: s.fieldFixtureCount, hint: "Attempts" },
    { group: "Draws", label: "League", value: s.leagueFixtureCount, hint: "League + knockout" },
    { group: "Draws", label: "Bracket", value: s.bracketFixtureCount, hint: "Elimination" },
    { group: "Rounds", label: "All rounds", value: s.roundCount },
    { group: "Rounds", label: "Heats", value: s.heatRoundCount },
    { group: "Rounds", label: "Qualifying", value: s.qualifyingRoundCount },
    { group: "Rounds", label: "League", value: s.leagueRoundCount },
    { group: "Rounds", label: "Quarter-finals", value: s.quarterFinalCount },
    { group: "Rounds", label: "Semi-finals", value: s.semiFinalCount },
    { group: "Rounds", label: "Finals", value: s.finalRoundCount },
    { group: "Rounds", label: "3rd place", value: s.thirdPlaceCount },
    { group: "Matches", label: "All matches", value: s.matchCount, hint: `${pct(s.matchCompleted, s.matchCount)} complete`, href: "/gameplay/scoring" },
    { group: "Matches", label: "Completed", value: s.matchCompleted, href: "/gameplay/scoring" },
    { group: "Matches", label: "In progress", value: s.matchInProgress, href: "/gameplay/scoring" },
    { group: "Matches", label: "Scheduled", value: s.matchScheduled, href: "/gameplay/fixtures" },
    { group: "Matches", label: "Draft", value: s.matchDraft },
    { group: "Matches", label: "Open", value: s.matchOpenCount, hint: "Draft, scheduled, or live" },
    { group: "Matches", label: "Cancelled", value: s.matchCancelled },
    { group: "Matches", label: "No show", value: s.matchNoShow },
    { group: "Matches", label: "Heats / flights", value: s.heatCount, hint: `${s.dualCount} head-to-head` },
    { group: "Matches", label: "Score events", value: s.scoreEventCount, hint: "Basketball baskets", href: "/gameplay/scoring" },
    { group: "Call room", label: "Matches marked", value: s.callRoomMatchCount, hint: `of ${s.matchCount} matches`, href: "/gameplay/call-room" },
    { group: "Call room", label: "Unmarked", value: s.callRoomUnmarkedCount, hint: "No present or absent yet", href: "/gameplay/call-room" },
    { group: "Call room", label: "Present", value: s.presentCount, href: "/gameplay/call-room" },
    { group: "Call room", label: "Absent", value: s.absentCount, href: "/gameplay/call-room" },
    { group: "Podium", label: "Rankings locked", value: s.rankingLockedCount, hint: `${s.rankingUnlockedCount} still open of ${s.fixtureCount} draws`, href: "/gameplay/podium" },
    { group: "Podium", label: "Ranking rows", value: s.rankingEntryCount, href: "/gameplay/scoring" },
    { group: "Podium", label: "Gold given", value: s.goldDelivered, href: "/gameplay/podium" },
    { group: "Podium", label: "Silver given", value: s.silverDelivered, href: "/gameplay/podium" },
    { group: "Podium", label: "Bronze given", value: s.bronzeDelivered, href: "/gameplay/podium" },
    { group: "Podium", label: "Medals delivered", value: s.medalsDelivered, hint: `${s.medalsWaiting} locked 1st–3rd not yet given`, href: "/gameplay/podium" },
    { group: "Podium", label: "Medals waiting", value: s.medalsWaiting, href: "/gameplay/podium" },
  ];
}

export default function DashboardPage() {
  const { selected, loading } = useChampionship();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { appUser } = useCurrentUser();

  useEffect(() => {
    if (!selected) {
      setSummary(null);
      return;
    }
    setSummary(null);
    setLoadError(null);
    void getDashboardSummary(selected.id).then(({ data, error }) => {
      setSummary(data);
      setLoadError(error ? error.message : null);
    });
  }, [selected, attempt]);

  if (loading) {
    return <PageSkeleton kind="cards" />;
  }

  if (!selected) {
    return (
      <EmptyState
        title="Create an event to get started"
        hint="Setup starts with an event, then sports, then the floor."
        action={
          <Link href="/events">
            <SoftButton variant="primary">Events</SoftButton>
          </Link>
        }
      />
    );
  }

  const ready = Boolean(summary);
  const sportsHref = `/events/${selected.id}/sports`;
  const s = summary;
  const matchCompletePct = s ? Math.round(((s.matchCompleted || 0) / Math.max(1, s.matchCount)) * 100) : 0;
  const medalPct = s
    ? Math.round(((s.medalsDelivered || 0) / Math.max(1, s.medalsDelivered + s.medalsWaiting)) * 100)
    : 0;
  const steps = [
    {
      n: "1",
      title: "Create draws",
      hint: "All sports until you filter, then a category, then the match workspace.",
      href: "/gameplay/fixtures",
    },
    {
      n: "2",
      title: "Call room",
      hint: "Pick sport, gender, age, then category, then mark present and absent.",
      href: "/gameplay/call-room",
    },
    {
      n: "3",
      title: "Score matches",
      hint: "Pick sport, gender, age, then category, then the scoreboard.",
      href: "/gameplay/scoring",
    },
    {
      n: "4",
      title: "Publish results",
      hint: "Pick sport, gender, age, then category to open the board.",
      href: "/gameplay/results",
    },
    {
      n: "5",
      title: "Podium",
      hint: "Lock 1st, 2nd and 3rd on scoring, then mark medal delivery.",
      href: "/gameplay/podium",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <GreetingBanner
        title={`Hello, ${firstName(appUser?.fullName) ?? "there"}`}
        badge={<StatusBadge tone={statusTone[selected.status]}>{selected.status}</StatusBadge>}
        text={`${selected.name} · ${championshipHint(selected)}`}
        stats={[
          { label: "Matches done", value: ready ? `${matchCompletePct}%` : "–" },
          { label: "Athletes", value: ready ? (s?.athleteCount ?? 0) : "–" },
          { label: "Medals waiting", value: ready ? (s?.medalsWaiting ?? 0) : "–" },
        ]}
        action={
          <Link href="/gameplay/call-room">
            <SoftButton variant="primary">Go to the floor</SoftButton>
          </Link>
        }
      />

      {loadError ? (
        <ErrorBanner
          title="Could not load the dashboard"
          hint={loadError}
          action={
            <SoftButton variant="primary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </SoftButton>
          }
        />
      ) : null}

      <Section title="Overview">
        <StatCard
          ready={ready}
          href={sportsHref}
          label="Sports"
          icon={IconTrophy}
          value={s?.sportCount ?? 0}
          hint={`${s?.categoryCount ?? 0} categories · ${s?.ageGroupCount ?? 0} age groups`}
        />
        <StatCard
          ready={ready}
          label="Athletes"
          icon={IconUsers}
          value={s?.athleteCount ?? 0}
          hint={`${s?.soloAthleteCount ?? 0} solo · ${s?.teamEntryCount ?? 0} teams`}
        />
        <StatCard
          ready={ready}
          href="/gameplay/scoring"
          label="Matches complete"
          icon={IconCircleCheck}
          value={pct(s?.matchCompleted ?? 0, s?.matchCount ?? 0)}
          hint={`${s?.matchCompleted ?? 0} of ${s?.matchCount ?? 0} · ${s?.matchOpenCount ?? 0} still open`}
          bar={ready ? matchCompletePct : 0}
        />
        <StatCard
          ready={ready}
          href="/gameplay/podium"
          label="Medals delivered"
          icon={IconMedal}
          value={s?.medalsDelivered ?? 0}
          hint={`${s?.medalsWaiting ?? 0} waiting on locked 1st–3rd`}
          bar={ready ? medalPct : 0}
        />
      </Section>

      <EventSetupWizard
        eventId={selected.id}
        eventName={selected.name}
        onAdded={() => setAttempt((n) => n + 1)}
      />

      <FixtureSportHops eventId={selected.id} sports={s?.sports ?? []} ready={ready} />

      {ready && s ? (
        <TableCard
          title="Detail"
          exportMenu={
            <TableExport
              count={detailRows(s, sportsHref).length}
              onExport={(format) =>
                exportTable(
                  detailRows(s, sportsHref),
                  [
                    { header: "Group", value: (row) => row.group },
                    { header: "Metric", value: (row) => row.label },
                    { header: "Value", value: (row) => row.value },
                    { header: "Note", value: (row) => row.hint },
                  ],
                  `${selected.name} dashboard`,
                  format,
                )
              }
            />
          }
        >
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Metric</th>
                <th>Value</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {detailRows(s, sportsHref).map((row) => (
                <tr key={`${row.group}-${row.label}`}>
                  <td className="text-[var(--ops-text-muted)]">{row.group}</td>
                  <td>
                    {row.href ? (
                      <Link href={row.href} className="font-semibold">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="tabular-nums">{row.value}</td>
                  <td className="text-[var(--ops-text-muted)]">{row.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      ) : (
        <TableCard title="Detail">
          <Shimmer className="h-40 w-full" />
        </TableCard>
      )}

      <TableCard title="By sport">
        <table>
          <thead>
            <tr>
              <th>Sport</th>
              <th>Categories</th>
              <th>Teams</th>
              <th>Athletes</th>
              <th>Draws</th>
              <th>Matches</th>
              <th>Completed</th>
              <th>Locked</th>
              <th>Medals</th>
            </tr>
          </thead>
          <tbody>
            {ready && s && s.sports.length > 0 ? (
              s.sports.map((sport) => (
                <tr key={sport.id}>
                  <td>
                    <Link href={`${sportsHref}/${sport.id}/categories`} className="font-semibold">
                      {sport.name}
                    </Link>
                  </td>
                  <td className="tabular-nums">{sport.categoryCount}</td>
                  <td className="tabular-nums">{sport.teamCount}</td>
                  <td className="tabular-nums">{sport.athleteCount}</td>
                  <td className="tabular-nums">{sport.fixtureCount}</td>
                  <td className="tabular-nums">{sport.matchCount}</td>
                  <td className="tabular-nums">
                    {sport.matchCompleted}
                    <span className="ml-1 text-xs text-[var(--ops-text-muted)]">
                      {pct(sport.matchCompleted, sport.matchCount)}
                    </span>
                  </td>
                  <td className="tabular-nums">{sport.rankingLockedCount}</td>
                  <td className="tabular-nums">{sport.medalsDelivered}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[var(--ops-text-muted)]">
                  {ready ? "No sports yet." : "Loading sports."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>

      <SoftCard>
        <p className="text-base font-semibold">Next</p>
        <ol className="mt-2 divide-y divide-[var(--ops-line)]">
          {steps.map((step) => (
            <li key={step.n}>
              <Link href={step.href} className="flex items-baseline gap-3 py-3">
                <span className="w-5 shrink-0 text-sm font-semibold text-[var(--ops-primary)]">{step.n}</span>
                <span className="min-w-0">
                  <span className="font-semibold">{step.title}</span>
                  <span className="mt-0.5 block text-sm text-[var(--ops-text-muted)]">{step.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </SoftCard>

    </div>
  );
}
