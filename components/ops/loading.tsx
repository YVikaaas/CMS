"use client";

import { cn } from "@/lib/utils/cn";

export function Shimmer({ className }: { className?: string }) {
  return <div aria-hidden className={cn("ops-shimmer rounded-lg", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("ops-spinner", className)} aria-hidden />;
}

export function PageLoader({
  label = "Loading",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-[var(--ops-primary)]",
        compact ? "py-10" : "min-h-[42vh]",
      )}
    >
      <Spinner className="size-7" />
      <p className="text-sm text-[var(--ops-text-muted)]">{label}</p>
    </div>
  );
}

export function PageSkeleton({
  kind = "page",
}: {
  kind?: "page" | "desk" | "table" | "cards" | "split" | "board" | "filters";
}) {
  if (kind === "filters") {
    return (
      <div className="flex flex-wrap gap-3" role="status" aria-live="polite" aria-label="Loading">
        <Shimmer className="h-11 w-32" />
        <Shimmer className="h-11 w-28" />
        <Shimmer className="h-11 w-24" />
        <Shimmer className="h-11 w-36" />
      </div>
    );
  }

  if (kind === "board") {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite" aria-label="Loading">
        <Shimmer className="h-5 w-40" />
        <Shimmer className="h-24 w-full rounded-xl" />
        <Shimmer className="h-24 w-full rounded-xl" />
        <Shimmer className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (kind === "split") {
    return (
      <div
        className="grid grid-cols-1 overflow-hidden rounded-xl border border-[var(--ops-line)] bg-[var(--ops-board)] lg:grid-cols-[minmax(220px,28%)_1fr]"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div className="flex flex-col gap-2 border-b border-[var(--ops-line)] p-4 lg:border-r lg:border-b-0">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-16 w-full rounded-xl" />
          <Shimmer className="h-16 w-full rounded-xl" />
          <Shimmer className="h-16 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-3 bg-[var(--ops-board-muted)] p-4">
          <Shimmer className="h-5 w-36" />
          <Shimmer className="h-40 w-full rounded-xl" />
          <Shimmer className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (kind === "table") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-live="polite" aria-label="Loading">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-4 w-64" />
        </div>
        <div className="flex gap-3">
          <Shimmer className="h-11 flex-1" />
          <Shimmer className="h-11 w-28" />
          <Shimmer className="h-11 w-28" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--ops-line)]">
          <Shimmer className="h-11 w-full rounded-none" />
          <Shimmer className="h-14 w-full rounded-none" />
          <Shimmer className="h-14 w-full rounded-none" />
          <Shimmer className="h-14 w-full rounded-none" />
          <Shimmer className="h-14 w-full rounded-none" />
          <Shimmer className="h-14 w-full rounded-none" />
        </div>
      </div>
    );
  }

  if (kind === "cards") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-live="polite" aria-label="Loading">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Shimmer className="h-28 rounded-2xl" />
          <Shimmer className="h-28 rounded-2xl" />
          <Shimmer className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (kind === "desk") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-live="polite" aria-label="Loading">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-36" />
          <Shimmer className="h-4 w-72" />
        </div>
        <PageSkeleton kind="filters" />
        <div className="flex gap-2">
          <Shimmer className="h-10 w-24 rounded-full" />
          <Shimmer className="h-10 w-28 rounded-full" />
          <Shimmer className="h-10 w-20 rounded-full" />
        </div>
        <PageSkeleton kind="split" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Shimmer className="h-6 w-40" />
        <Shimmer className="h-4 w-56" />
      </div>
      <Shimmer className="h-36 w-full rounded-2xl" />
      <Shimmer className="h-36 w-full rounded-2xl" />
    </div>
  );
}
