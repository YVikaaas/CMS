"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { EmptyState, PageHeader, SoftButton, SoftCard } from "@/components/ops";
import { getDashboardSummary } from "@/lib/services";
import type { DashboardSummary } from "@/lib/types/cms";

export default function DashboardPage() {
  const { selected, loading } = useChampionship();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!selected) {
      setSummary(null);
      return;
    }
    void getDashboardSummary(selected.id).then(({ data }) => setSummary(data));
  }, [selected]);

  if (loading) {
    return <p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>;
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

  const cards = [
    { label: "Sports offered", value: summary?.sportCount ?? "—" },
    { label: "Categories offered", value: summary?.categoryCount ?? "—" },
    { label: "Teams", value: summary?.teamCount ?? "—" },
  ];

  const steps = [
    {
      n: "1",
      title: "Assign sports",
      hint: "Offer sports, then categories, then teams.",
      href: `/championships/${selected.id}/sports`,
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={selected.name}
        hint={`${selected.location || "No location"}${selected.startDate ? ` · ${selected.startDate}` : ""}${selected.endDate ? ` – ${selected.endDate}` : ""}`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <SoftCard key={card.label}>
            <p className="text-sm text-[var(--ops-text-muted)]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </SoftCard>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <Link key={step.n} href={step.href}>
            <SoftCard interactive>
              <p className="text-xs font-semibold tracking-wide text-[var(--ops-primary)] uppercase">
                Step {step.n}
              </p>
              <p className="mt-1 font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{step.hint}</p>
            </SoftCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
