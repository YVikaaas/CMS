"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type QueueStripItem = {
  id: string;
  title: string;
  subtitle?: string;
  /** Left marker: a check, "3/8", a score. */
  marker?: ReactNode;
  /** Spoken label (title, time, status). */
  label?: string;
};

/**
 * Heats / matches as one sideways-scrolling row of big chips.
 * Keeps the work area full width; the picked chip is outlined in primary.
 */
export function QueueStrip({
  items,
  selectedId,
  onPick,
  ariaLabel,
}: {
  items: QueueStripItem[];
  selectedId: string | null;
  onPick: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1">
      {items.map((item) => {
        const picked = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={picked ? "true" : undefined}
            aria-label={item.label}
            onClick={() => onPick(item.id)}
            className={cn(
              "flex min-h-12 max-w-72 min-w-36 shrink-0 snap-start items-center gap-2 rounded-lg border px-3 text-left",
              picked
                ? "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)]"
                : "border-[var(--ops-line)] bg-[var(--ops-surface)] hover:border-[var(--ops-line-strong)]",
            )}
          >
            {item.marker}
            <span className="min-w-0">
              <span className="block truncate text-sm leading-5 font-medium">{item.title}</span>
              {item.subtitle ? (
                <span className="block truncate text-xs text-[var(--ops-text-muted)]">{item.subtitle}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Round marker for a strip chip: check when done, otherwise short text. */
export function QueueMarker({ tone, children }: { tone: "done" | "busy" | "idle" | "live"; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums",
        tone === "done" && "bg-[var(--ops-success)] text-white",
        tone === "busy" && "bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]",
        tone === "live" && "bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]",
        tone === "idle" && "bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]",
      )}
    >
      {children}
    </span>
  );
}
