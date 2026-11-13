"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
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
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }

  if (!selected) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--cms-muted)]">
          Create a championship to get started.
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

  const cards = [
    { label: "Sports offered", value: summary?.sportCount ?? "—" },
    { label: "Categories offered", value: summary?.categoryCount ?? "—" },
    { label: "Teams", value: summary?.teamCount ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{selected.name}</h1>
        <p className="mt-1 text-sm text-[var(--cms-muted)]">
          {selected.location || "No location"}{" "}
          {selected.startDate ? `· ${selected.startDate}` : ""}
          {selected.endDate ? ` – ${selected.endDate}` : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--cms-line)] bg-white p-5"
          >
            <p className="text-sm text-[var(--cms-muted)]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
