"use client";

import Chip from "@mui/material/Chip";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils/cn";

export type RoundChipOption = {
  value: string;
  label: string;
  locked?: boolean;
};

// Multi-select rounds: picked = soft primary tint with a check, idle = outlined. No solid fills.
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
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Chip
            key={option.value}
            label={option.label}
            clickable
            aria-pressed={active}
            icon={active ? <IconCheck size={16} /> : undefined}
            disabled={option.locked && active}
            onClick={() => onSelect(option.value)}
            variant="outlined"
            className={cn(
              "text-[13px]",
              active
                ? "border-[var(--ops-primary)]/40 bg-[var(--ops-primary-soft)] text-[var(--ops-primary)] [&_.MuiChip-icon]:text-[var(--ops-primary)]"
                : "border-[var(--ops-line-strong)] text-[var(--ops-text)]",
            )}
          />
        );
      })}
    </div>
  );
}
