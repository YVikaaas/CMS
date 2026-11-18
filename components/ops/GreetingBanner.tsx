import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { onTeal } from "./PageHeader";

export type BannerStat = { label: string; value: ReactNode };

// NiceAdmin "Greeting banner": teal card. Left: title (+ badge) and one line.
// Right: a few headline numbers and the action, so the card carries information instead of empty space.
export function GreetingBanner({
  title,
  badge,
  text,
  stats,
  action,
  className,
}: {
  title: string;
  badge?: ReactNode;
  text?: string;
  stats?: BannerStat[];
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-8 gap-y-5 rounded-xl bg-[var(--ops-primary)] px-6 py-5 text-white",
        onTeal,
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[21px] leading-tight font-semibold">{title}</h1>
          {badge}
        </div>
        {text ? <p className="mt-1.5 text-sm text-white/70">{text}</p> : null}
      </div>
      {stats?.length || action ? (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {stats?.length ? (
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-[5.5rem]">
                  <dt className="text-xs text-white/70">{stat.label}</dt>
                  <dd className="text-xl font-semibold tabular-nums text-[var(--ops-accent)]">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
