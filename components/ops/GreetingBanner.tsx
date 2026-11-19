import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type BannerStat = { label: string; value: ReactNode };

// Dashboard header in the kit's title-row style: greeting, badge, one line, headline numbers, action.
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
    <header className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-5 pt-2", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] leading-9 font-medium sm:text-[36px] sm:leading-[44px]">{title}</h1>
          {badge}
        </div>
        {text ? <p className="mt-1 text-base text-[var(--ops-text-muted)]">{text}</p> : null}
      </div>
      {stats?.length || action ? (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          {stats?.length ? (
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-[5.5rem]">
                  <dt className="text-sm text-[var(--ops-text-muted)]">{stat.label}</dt>
                  <dd className="text-[22px] leading-7 font-medium tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {action}
        </div>
      ) : null}
    </header>
  );
}
