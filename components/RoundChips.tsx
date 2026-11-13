"use client";

import { cn } from "@/lib/utils/cn";

export type RoundChipOption = {
  value: string;
  label: string;
  locked?: boolean;
};

export function RoundChips({
  options,
  selected,
  onSelect,
}: {
  options: RoundChipOption[];
  selected: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.locked && active}
            onClick={() => onSelect(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              active
                ? "border-[var(--cms-action)] bg-[var(--cms-action)] text-white"
                : "border-[var(--cms-line)] bg-white text-slate-700 hover:bg-slate-50",
              option.locked && active ? "opacity-90" : "",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
