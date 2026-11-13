"use client";

import { cn } from "@/lib/utils/cn";

export function ResultsPhaseTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  if (tabs.length === 0) return null;
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-[var(--ops-line)]" role="tablist" aria-label={ariaLabel}>
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
              "-mb-px shrink-0 border-b-2 pb-2 text-sm font-semibold",
              active
                ? "border-[var(--ops-primary)] text-[var(--ops-primary)]"
                : "border-transparent text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
