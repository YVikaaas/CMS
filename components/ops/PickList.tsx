"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PickList({
  children,
  empty,
  invalid,
}: {
  children: ReactNode;
  empty?: ReactNode;
  invalid?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-h-72 overflow-y-auto rounded-xl border bg-[var(--ops-surface)]",
        invalid ? "border-[var(--ops-danger)]" : "border-[var(--ops-line)]",
      )}
    >
      {children ?? empty}
    </div>
  );
}

export function PickGroup({
  title,
  hint,
  checked,
  indeterminate,
  onToggle,
  action,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--ops-line)] bg-[var(--ops-board-muted)] px-3 py-2">
      <label className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          ref={(node) => {
            if (node) node.indeterminate = Boolean(indeterminate) && !checked;
          }}
          onChange={onToggle}
          className="size-4 accent-[var(--ops-primary)]"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          {hint ? <span className="block text-xs text-[var(--ops-text-muted)]">{hint}</span> : null}
        </span>
      </label>
      {action}
    </div>
  );
}

export function PickItem({
  title,
  hint,
  checked,
  onToggle,
  inset = false,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  inset?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border-b border-[var(--ops-line)] px-3 py-2.5 last:border-b-0",
        inset && "pl-10",
        checked && "bg-[var(--ops-primary-soft)]",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 size-4 accent-[var(--ops-primary)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {hint ? <span className="block text-xs text-[var(--ops-text-muted)]">{hint}</span> : null}
      </span>
    </label>
  );
}

export function PickToolbar({
  selected,
  visible,
  onSelectVisible,
  onClear,
}: {
  selected: number;
  visible: number;
  onSelectVisible: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-[var(--ops-text-muted)]">
        {selected} selected
        {visible ? ` · ${visible} showing` : ""}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSelectVisible}
          className="rounded-md px-2 py-1 font-medium text-[var(--ops-primary)] hover:bg-[var(--ops-primary-soft)]"
        >
          Select visible
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 font-medium text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
