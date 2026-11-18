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
  // NiceAdmin segmented filter: tinted track, selected segment filled primary.
  const chip = (key: string, label: string, active: boolean, onClick: () => void, className?: string) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-[12px] px-4 text-[13px]",
        active
          ? "bg-[var(--ops-primary)] font-semibold text-[var(--ops-on-primary)]"
          : "font-medium text-[#030e09] hover:bg-[var(--ops-surface)]",
        className,
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      className={cn("inline-flex flex-wrap items-center gap-0.5 rounded-[12px] bg-[rgba(3,14,9,0.05)] px-2 py-0.5", disabled && "opacity-45")}
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
