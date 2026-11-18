"use client";

import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import type { TablerIcon } from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Shimmer } from "./loading";

// NiceAdmin "Record card": label, big value, hint, optional tinted icon tile and progress bar.
export function StatCard({
  label,
  value,
  hint,
  href,
  ready = true,
  bar,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  ready?: boolean;
  bar?: number;
  icon?: TablerIcon;
}) {
  const card = (
    <Card
      className={cn(
        "h-full border border-transparent p-6",
        href && "hover:border-[var(--ops-primary)]/30 hover:bg-[var(--ops-primary-soft)]/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        {Icon ? (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]">
            <Icon size={20} stroke={1.5} />
          </span>
        ) : null}
      </div>
      {ready ? (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      ) : (
        <Shimmer className="mt-2 h-8 w-16" />
      )}
      {hint ? <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{hint}</p> : null}
      {typeof bar === "number" ? (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, bar))}
          className="mt-3 bg-[var(--ops-line)]"
          aria-label={`${label} progress`}
        />
      ) : null}
    </Card>
  );
  if (!href) return card;
  return (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  );
}
