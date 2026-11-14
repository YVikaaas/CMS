"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import {
  EmptyState,
  PageHeader,
  PageSkeleton,
  Shimmer,
  SoftButton,
  SoftCard,
  StatusBadge,
} from "@/components/ops";
import { getDashboardSummary } from "@/lib/services";
import type { Championship, CompetitionStatus, DashboardSummary } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";

const statusTone: Record<CompetitionStatus, "warning" | "success" | "neutral"> = {
  draft: "warning",
  active: "success",
  archived: "neutral",
};

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function championshipHint(row: Championship): string {
  const bits = [
    row.location || "No location",
    row.startDate && row.endDate ? `${row.startDate} – ${row.endDate}` : row.startDate || row.endDate,
  ].filter(Boolean);
  return bits.join(" · ");
}

function StatCard({
  label,
  value,
  hint,
  href,
  ready,
  bar,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  ready: boolean;
  bar?: number;
}) {
  const card = (
    <SoftCard interactive={Boolean(href)} className="h-full">
      <p className="text-sm text-[var(--ops-text-muted)]">{label}</p>
      {ready ? (
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      ) : (
        <Shimmer className="mt-2 h-8 w-16" />
      )}
      {hint ? <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{hint}</p> : null}
      {typeof bar === "number" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ops-line)]">
          <div
            className="h-full rounded-full bg-[var(--ops-primary)]"
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      ) : null}
    </SoftCard>
  );
  if (!href) return card;
  return (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--ops-text-muted)]">{title}</h2>
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const { selected, loading } = useChampionship();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!selected) {
      setSummary(null);
      return;
    }
    setSummary(null);
    void getDashboardSummary(selected.id).then(({ data }) => setSummary(data));
  }, [selected]);

  if (loading) {
    return <PageSkeleton kind="cards" />;
  }

  if (!selected) {
    return (
      <EmptyState
        title="Create a championship to get started"
        hint="Setup starts with a championship, then sports, then the floor."
        action={
          <Link href="/championships">
            <SoftButton variant="primary">Championships</SoftButton>
          </Link>
        }
      />
    );
  }

  const ready = Boolean(summary);
  const sportsHref = `/championships/${selected.id}/sports`;
  const s = summary;
  const matchCompletePct = s ? Math.round(((s.matchCompleted || 0) / Math.max(1, s.matchCount)) * 100) : 0;
  const medalPct = s
    ? Math.round(((s.medalsDelivered || 0) / Math.max(1, s.medalsDelivered + s.medalsWaiting)) * 100)
    : 0;
  const callRoomPct = s ? Math.round(((s.callRoomMatchCount || 0) / Math.max(1, s.matchCount)) * 100) : 0;

  const steps = [
    {
      n: "1",
      title: "Assign sports",
      hint: "Offer sports, then categories, then teams.",
      href: sportsHref,
    },
    {
      n: "2",
      title: "Create draws",
      hint: "All sports until you filter, then a category, then the match workspace.",
      href: "/gameplay/fixtures",
    },
    {
      n: "3",
      title: "Call room",
      hint: "Pick sport, gender, age, then category, then mark present and absent.",
      href: "/gameplay/call-room",
    },
    {
      n: "4",
      title: "Score matches",
      hint: "Pick sport, gender, age, then category, then the scoreboard.",
      href: "/gameplay/scoring",
    },
    {
      n: "5",
      title: "Publish results",
      hint: "Pick sport, gender, age, then category to open the board.",
      href: "/gameplay/results",
    },
    {
      n: "6",
      title: "Podium",
      hint: "Lock 1st, 2nd and 3rd on scoring, then mark medal delivery.",
      href: "/gameplay/podium",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={selected.name}
        hint={championshipHint(selected)}
        action={<StatusBadge tone={statusTone[selected.status]}>{selected.status}</StatusBadge>}
      />

      <Section title="Overview">
        <StatCard
          ready={ready}
          href={sportsHref}
          label="Sports"
          value={s?.sportCount ?? 0}
          hint={`${s?.categoryCount ?? 0} categories · ${s?.ageGroupCount ?? 0} age groups`}
        />
        <StatCard
          ready={ready}
          label="Athletes"
          value={s?.athleteCount ?? 0}
          hint={`${s?.soloAthleteCount ?? 0} solo · ${s?.teamEntryCount ?? 0} teams`}
        />
        <StatCard
          ready={ready}
          href="/gameplay/scoring"
          label="Matches complete"
          value={pct(s?.matchCompleted ?? 0, s?.matchCount ?? 0)}
          hint={`${s?.matchCompleted ?? 0} of ${s?.matchCount ?? 0} · ${s?.matchOpenCount ?? 0} still open`}
          bar={ready ? matchCompletePct : 0}
        />
        <StatCard
          ready={ready}
          href="/gameplay/podium"
          label="Medals delivered"
          value={s?.medalsDelivered ?? 0}
          hint={`${s?.medalsWaiting ?? 0} waiting on locked 1st–3rd`}
          bar={ready ? medalPct : 0}
        />
      </Section>

      <Section title="Setup">
        <StatCard ready={ready} href={sportsHref} label="Sports" value={s?.sportCount ?? 0} />
        <StatCard
          ready={ready}
          href={sportsHref}
          label="Categories"
          value={s?.categoryCount ?? 0}
          hint={`${s?.boysCategoryCount ?? 0} boys · ${s?.girlsCategoryCount ?? 0} girls`}
        />
        <StatCard ready={ready} label="Age groups" value={s?.ageGroupCount ?? 0} />
        <StatCard
          ready={ready}
          label="Solo events"
          value={s?.soloCategoryCount ?? 0}
          hint={`${s?.relayCategoryCount ?? 0} relays · ${s?.teamSportCategoryCount ?? 0} team sports`}
        />
        <StatCard
          ready={ready}
          label="Team entries"
          value={s?.teamEntryCount ?? 0}
          hint={`${s?.basketballTeamCount ?? 0} team sports · ${s?.relayEntryCount ?? 0} relays`}
        />
        <StatCard
          ready={ready}
          label="Solo athletes"
          value={s?.soloAthleteCount ?? 0}
          hint={`${s?.athleteCount ?? 0} players in all`}
        />
        <StatCard ready={ready} label="Organizations" value={s?.orgCount ?? 0} />
        <StatCard ready={ready} label="Cities" value={s?.cityCount ?? 0} />
      </Section>

      <Section title="Coverage">
        <StatCard
          ready={ready}
          label="With entries"
          value={s?.categoryWithEntryCount ?? 0}
          hint={`${s?.categoryWithoutEntryCount ?? 0} categories still empty`}
        />
        <StatCard
          ready={ready}
          href="/gameplay/fixtures"
          label="With draws"
          value={s?.categoryWithDrawCount ?? 0}
          hint={`${s?.categoryWithoutDrawCount ?? 0} still need a draw`}
        />
        <StatCard
          ready={ready}
          href="/gameplay/fixtures"
          label="All entries"
          value={s?.teamCount ?? 0}
          hint="Team-of-1 and teams"
        />
        <StatCard
          ready={ready}
          href="/gameplay/fixtures"
          label="Draws"
          value={s?.fixtureCount ?? 0}
          hint={`${s?.rankingLockedCount ?? 0} ranking locked`}
        />
      </Section>

      <Section title="Draws">
        <StatCard ready={ready} href="/gameplay/fixtures" label="Draft" value={s?.fixtureDraft ?? 0} />
        <StatCard ready={ready} href="/gameplay/fixtures" label="Published" value={s?.fixturePublished ?? 0} />
        <StatCard ready={ready} href="/gameplay/scoring" label="In progress" value={s?.fixtureInProgress ?? 0} />
        <StatCard ready={ready} href="/gameplay/results" label="Completed" value={s?.fixtureCompleted ?? 0} />
        <StatCard ready={ready} label="Track" value={s?.trackFixtureCount ?? 0} hint="Heats and timed rounds" />
        <StatCard ready={ready} label="Field" value={s?.fieldFixtureCount ?? 0} hint="Attempts" />
        <StatCard ready={ready} label="League" value={s?.leagueFixtureCount ?? 0} hint="League + knockout" />
        <StatCard ready={ready} label="Bracket" value={s?.bracketFixtureCount ?? 0} hint="Elimination" />
      </Section>

      <Section title="Rounds">
        <StatCard ready={ready} label="All rounds" value={s?.roundCount ?? 0} />
        <StatCard ready={ready} label="Heats" value={s?.heatRoundCount ?? 0} />
        <StatCard ready={ready} label="Qualifying" value={s?.qualifyingRoundCount ?? 0} />
        <StatCard ready={ready} label="League" value={s?.leagueRoundCount ?? 0} />
        <StatCard ready={ready} label="Quarter-finals" value={s?.quarterFinalCount ?? 0} />
        <StatCard ready={ready} label="Semi-finals" value={s?.semiFinalCount ?? 0} />
        <StatCard ready={ready} label="Finals" value={s?.finalRoundCount ?? 0} />
        <StatCard ready={ready} label="3rd place" value={s?.thirdPlaceCount ?? 0} />
      </Section>

      <Section title="Matches">
        <StatCard
          ready={ready}
          href="/gameplay/scoring"
          label="All matches"
          value={s?.matchCount ?? 0}
          hint={`${pct(s?.matchCompleted ?? 0, s?.matchCount ?? 0)} complete`}
          bar={ready ? matchCompletePct : 0}
        />
        <StatCard ready={ready} href="/gameplay/scoring" label="Completed" value={s?.matchCompleted ?? 0} />
        <StatCard ready={ready} href="/gameplay/scoring" label="In progress" value={s?.matchInProgress ?? 0} />
        <StatCard ready={ready} href="/gameplay/fixtures" label="Scheduled" value={s?.matchScheduled ?? 0} />
        <StatCard ready={ready} label="Draft" value={s?.matchDraft ?? 0} />
        <StatCard ready={ready} label="Open" value={s?.matchOpenCount ?? 0} hint="Draft, scheduled, or live" />
        <StatCard ready={ready} label="Cancelled" value={s?.matchCancelled ?? 0} />
        <StatCard ready={ready} label="No show" value={s?.matchNoShow ?? 0} />
        <StatCard
          ready={ready}
          label="Heats / flights"
          value={s?.heatCount ?? 0}
          hint={`${s?.dualCount ?? 0} head-to-head`}
        />
        <StatCard
          ready={ready}
          href="/gameplay/scoring"
          label="Score events"
          value={s?.scoreEventCount ?? 0}
          hint="Basketball baskets"
        />
      </Section>

      <Section title="Call room">
        <StatCard
          ready={ready}
          href="/gameplay/call-room"
          label="Matches marked"
          value={s?.callRoomMatchCount ?? 0}
          hint={`of ${s?.matchCount ?? 0} matches`}
          bar={ready ? callRoomPct : 0}
        />
        <StatCard
          ready={ready}
          href="/gameplay/call-room"
          label="Unmarked"
          value={s?.callRoomUnmarkedCount ?? 0}
          hint="No present or absent yet"
        />
        <StatCard ready={ready} href="/gameplay/call-room" label="Present" value={s?.presentCount ?? 0} />
        <StatCard ready={ready} href="/gameplay/call-room" label="Absent" value={s?.absentCount ?? 0} />
      </Section>

      <Section title="Podium">
        <StatCard
          ready={ready}
          href="/gameplay/podium"
          label="Rankings locked"
          value={s?.rankingLockedCount ?? 0}
          hint={`${s?.rankingUnlockedCount ?? 0} still open of ${s?.fixtureCount ?? 0} draws`}
        />
        <StatCard ready={ready} href="/gameplay/scoring" label="Ranking rows" value={s?.rankingEntryCount ?? 0} />
        <StatCard ready={ready} href="/gameplay/podium" label="Gold given" value={s?.goldDelivered ?? 0} />
        <StatCard ready={ready} href="/gameplay/podium" label="Silver given" value={s?.silverDelivered ?? 0} />
        <StatCard ready={ready} href="/gameplay/podium" label="Bronze given" value={s?.bronzeDelivered ?? 0} />
        <StatCard
          ready={ready}
          href="/gameplay/podium"
          label="Medals delivered"
          value={s?.medalsDelivered ?? 0}
          hint={`${s?.medalsWaiting ?? 0} locked 1st–3rd not yet given`}
          bar={ready ? medalPct : 0}
        />
        <StatCard ready={ready} href="/gameplay/podium" label="Medals waiting" value={s?.medalsWaiting ?? 0} />
      </Section>

      {!ready || (s && s.sports.length > 0) ? (
        <Section title="By sport" className="lg:grid-cols-2">
          {ready && s
            ? s.sports.map((sport) => (
                <Link key={sport.id} href={`${sportsHref}/${sport.id}/categories`} className="block h-full">
                  <SoftCard interactive className="h-full">
                    <p className="font-semibold">{sport.name}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Categories</p>
                        <p className="font-semibold tabular-nums">{sport.categoryCount}</p>
                      </div>
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Teams</p>
                        <p className="font-semibold tabular-nums">{sport.teamCount}</p>
                      </div>
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Athletes</p>
                        <p className="font-semibold tabular-nums">{sport.athleteCount}</p>
                      </div>
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Draws</p>
                        <p className="font-semibold tabular-nums">{sport.fixtureCount}</p>
                      </div>
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Matches</p>
                        <p className="font-semibold tabular-nums">{sport.matchCount}</p>
                      </div>
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Completed</p>
                        <p className="font-semibold tabular-nums">
                          {sport.matchCompleted}
                          <span className="ml-1 text-xs font-medium text-[var(--ops-text-muted)]">
                            {pct(sport.matchCompleted, sport.matchCount)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Locked</p>
                        <p className="font-semibold tabular-nums">{sport.rankingLockedCount}</p>
                      </div>
                      <div>
                        <p className="text-[var(--ops-text-muted)]">Medals</p>
                        <p className="font-semibold tabular-nums">{sport.medalsDelivered}</p>
                      </div>
                    </div>
                  </SoftCard>
                </Link>
              ))
            : [0, 1].map((key) => (
                <SoftCard key={key} className="h-full">
                  <Shimmer className="h-5 w-32" />
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Shimmer key={index} className="h-10 w-full" />
                    ))}
                  </div>
                </SoftCard>
              ))}
        </Section>
      ) : null}

      <Section title="Next" className="sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <Link key={step.n} href={step.href} className="block h-full">
            <SoftCard interactive className="h-full">
              <p className="text-xs font-semibold tracking-wide text-[var(--ops-primary)] uppercase">
                Step {step.n}
              </p>
              <p className="mt-1 font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{step.hint}</p>
            </SoftCard>
          </Link>
        ))}
      </Section>
    </div>
  );
}
