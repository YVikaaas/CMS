"use client";

import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import type { TablerIcon } from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Shimmer } from "./loading";

// Kit stat card: label, 36px value, hint, optional icon and progress bar; clickable ones lift on hover.
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
        "h-full p-6",
        href && "ops-lift",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium tracking-[0.1px]">{label}</p>
        {Icon ? <Icon size={24} stroke={1.75} className="shrink-0 text-[var(--ops-text)]" aria-hidden /> : null}
      </div>
      {ready ? (
        <p className="mt-2 text-[36px] leading-[44px] font-medium tabular-nums">{value}</p>
      ) : (
        <Shimmer className="mt-3 h-10 w-20" />
      )}
      {hint ? <p className="mt-2 text-sm text-[var(--ops-text-muted)]">{hint}</p> : null}
      {typeof bar === "number" ? (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, bar))}
          className="mt-4"
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
