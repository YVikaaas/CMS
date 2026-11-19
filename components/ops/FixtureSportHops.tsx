"use client";

import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";
import type { DashboardSportStat } from "@/lib/types/cms";
import { applySport, emptyEventFilter, writeEventFilter } from "@/lib/utils/eventFilter";
import { SoftCard } from "./SoftCard";
import { Shimmer } from "./loading";

function openFixtureSport(eventId: string, sportId: string) {
  writeEventFilter(applySport(emptyEventFilter(eventId), sportId));
}

export function FixtureSportHops({
  eventId,
  sports,
  ready,
}: {
  eventId: string;
  sports: DashboardSportStat[];
  ready: boolean;
}) {
  return (
    <SoftCard className="flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold">Fixtures</p>
        <p className="mt-0.5 text-sm text-[var(--ops-text-muted)]">
          Pick a sport, then gender, age, and category on the next screen.
        </p>
      </div>
      {!ready ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Shimmer className="h-[4.25rem] w-full" />
          <Shimmer className="h-[4.25rem] w-full" />
        </div>
      ) : sports.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-muted)]">Add a sport above first.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sports.map((sport) => (
            <Link
              key={sport.id}
              href={`/gameplay/fixtures/sport/${sport.id}`}
              onClick={() => openFixtureSport(eventId, sport.id)}
              className="ops-lift flex min-h-[4.25rem] items-center gap-2 rounded-xl border border-[var(--ops-line-strong)] bg-[var(--ops-surface)] px-4 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{sport.name}</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--ops-text-muted)]">
                  {sport.categoryCount} {sport.categoryCount === 1 ? "category" : "categories"}
                  {" · "}
                  {sport.fixtureCount} {sport.fixtureCount === 1 ? "draw" : "draws"}
                </span>
              </span>
              <IconChevronRight size={18} stroke={2} className="shrink-0 text-[var(--ops-text-muted)]" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </SoftCard>
  );
}
