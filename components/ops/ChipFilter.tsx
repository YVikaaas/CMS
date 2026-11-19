"use client";

import { IconCheck } from "@tabler/icons-react";
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
  // MD3 filter chips: outlined 8px chips; selected = secondary-container fill with a check.
  const chip = (key: string, label: string, active: boolean, onClick: () => void, className?: string) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm leading-5 font-medium tracking-[0.1px]",
        active
          ? "border-transparent bg-[var(--ops-primary-soft)] pl-2.5 text-[var(--ops-text)]"
          : "border-[var(--ops-line-strong)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)]",
        className,
      )}
    >
      {active ? <IconCheck size={16} aria-hidden /> : null}
      {label}
    </button>
  );

  return (
    <div
      className={cn("flex w-fit max-w-full flex-wrap items-center gap-2", disabled && "opacity-45")}
      role="tablist"
      aria-label={ariaLabel}
    >
      {showAll ? chip("__all", "All", value === "", () => onChange("")) : null}
      {options.map((option, index) => {
        const active = value === option.value;
        return chip(
          option.value,
          option.label,
          active,
          () => {
            if (active && !allowEmpty) return;
            onChange(active ? "" : option.value);
          },
          gapBefore && option.value === gapBefore && index > 0 ? "ml-2" : undefined,
        );
      })}
    </div>
  );
}
