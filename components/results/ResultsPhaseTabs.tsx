"use client";

import { cn } from "@/lib/utils/cn";

export function ResultsPhaseTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  if (tabs.length === 0) return null;
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--ops-line)]" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px inline-flex min-h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm leading-5 font-medium tracking-[0.1px]",
              active
                ? "border-[var(--ops-primary)] text-[var(--ops-primary)]"
                : "border-transparent text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className={cn("tabular-nums", active ? "text-[var(--ops-primary)]" : "text-[var(--ops-text-muted)]")}>
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
