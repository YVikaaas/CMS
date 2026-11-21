"use client";

import Link from "next/link";
import { IconCircleCheck, IconLock } from "@tabler/icons-react";
import type { DashboardSummary } from "@/lib/types/cms";
import { setupChecklist } from "@/lib/utils/setupChecklist";
import { SoftButton } from "./SoftButton";
import { SoftCard } from "./SoftCard";
import { Shimmer } from "./loading";

type Props = {
  eventId: string;
  summary: DashboardSummary | null;
  ready: boolean;
};

export function SetupChecklist({ eventId, summary, ready }: Props) {
  if (!ready) {
    return (
      <SoftCard>
        <p className="text-base font-semibold">Setup</p>
        <Shimmer className="mt-3 h-40 w-full" />
      </SoftCard>
    );
  }

  const { steps, allDone } = setupChecklist({ eventId, summary });

  return (
    <SoftCard>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-semibold">Setup</p>
        {allDone ? (
          <p className="text-sm font-medium text-[var(--ops-success)]">Ready for the day</p>
        ) : null}
      </div>
      <ol className="mt-2 divide-y divide-[var(--ops-line)]">
        {steps.map((step) => {
          const body = (
            <span className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {step.done ? (
                  <IconCircleCheck size={20} className="text-[var(--ops-success)]" aria-hidden />
                ) : step.locked ? (
                  <IconLock size={18} className="text-[var(--ops-text-muted)]" aria-hidden />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--ops-primary)]" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="font-semibold">{step.title}</span>
                <span className="mt-0.5 block text-sm text-[var(--ops-text-muted)]">
                  {step.locked && step.lockReason ? step.lockReason : step.hint}
                </span>
              </span>
            </span>
          );

          if (step.locked) {
            return (
              <li key={step.id} className="flex items-center gap-3 py-3 opacity-60">
                {body}
              </li>
            );
          }

          return (
            <li key={step.id} className="flex flex-wrap items-center gap-3 py-3">
              <Link href={step.href} className="min-w-0 flex-1">
                {body}
              </Link>
              {step.current ? (
                <Link href={step.href}>
                  <SoftButton variant="primary">Do this next</SoftButton>
                </Link>
              ) : allDone && step.id === "floor" ? (
                <Link href={step.href}>
                  <SoftButton variant="primary">Go to the floor</SoftButton>
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </SoftCard>
  );
}
