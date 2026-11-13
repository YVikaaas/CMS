"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, EventFilters, PageHeader, SoftButton } from "@/components/ops";
import { useChampionship } from "@/app/providers/ChampionshipProvider";

export default function FixturesPage() {
  const router = useRouter();
  const { selected, loading } = useChampionship();
  const skipFilterNav = useRef(true);

  if (loading) {
    return <p className="text-sm text-[var(--ops-text-muted)]">Loading…</p>;
  }
  if (!selected) {
    return (
      <EmptyState
        title="Select a championship"
        hint="Floor pages use the championship in the header."
        action={
          <Link href="/championships">
            <SoftButton variant="primary">Championships</SoftButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fixtures" hint="Pick sport, then gender, then age." />
      <EventFilters
        championshipId={selected.id}
        unlockInOrder
        onChange={(value) => {
          if (skipFilterNav.current) {
            skipFilterNav.current = false;
            return;
          }
          if (value.sportId) {
            router.push(`/gameplay/fixtures/sport/${value.sportId}`);
          }
        }}
      />
      <EmptyState title="Pick a sport" hint="Gender unlocks next, then age, then the draw." />
    </div>
  );
}
