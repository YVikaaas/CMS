"use client";

import { cn } from "@/lib/utils/cn";

export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
  allowEmpty = true,
  showAll = true,
  gapBefore,
}: {
  options: Array<{ value: T; label: string }>;
  value: T | "";
  onChange: (value: T | "") => void;
  disabled?: boolean;
  ariaLabel: string;
  allowEmpty?: boolean;
  showAll?: boolean;
  gapBefore?: T;
}) {
  const chipClass = (active: boolean) =>
    cn(
      "inline-flex min-h-10 items-center rounded-lg border px-4 text-[13px] font-semibold",
      active
        ? "border-[var(--ops-primary)] bg-[var(--ops-primary)] text-white"
        : "border-[var(--ops-line)] bg-white text-[var(--ops-text)] hover:border-slate-300 hover:bg-[var(--ops-board-muted)]",
      disabled && "opacity-45",
    );

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={ariaLabel}>
      {showAll ? (
        <button
          type="button"
          role="tab"
          aria-selected={value === ""}
          disabled={disabled}
          onClick={() => onChange("")}
          className={chipClass(value === "")}
        >
          All
        </button>
      ) : null}
      {options.map((option, index) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => {
              if (active && !allowEmpty) return;
              onChange(active ? "" : option.value);
            }}
            className={cn(
              chipClass(active),
              gapBefore && option.value === gapBefore && index > 0 && "ml-3",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
