"use client";

import { fieldClass, fieldErrorClass } from "@/components/Modal";
import { SoftSelect } from "@/components/ops";

export function HeatLaneSlots({
  laneCount,
  ids,
  options,
  error,
  onChange,
  slotLabel,
}: {
  laneCount: number;
  ids: string[];
  options: Array<{ id: string; label: string }>;
  error?: string;
  onChange: (ids: string[]) => void;
  slotLabel: string;
}) {
  const values = Array.from({ length: laneCount }, (_, index) => ids[index] ?? "");
  return (
    <div
      className={`grid max-h-80 gap-2 overflow-y-auto rounded-xl border p-3 ${
        error ? "border-[var(--ops-danger)]" : "border-[var(--ops-line)]"
      }`}
    >
      <p className="text-sm font-medium">
        {slotLabel}s. Leave a row blank to keep that {slotLabel.toLowerCase()} empty.
      </p>
      {values.map((value, index) => {
        const taken = new Set(values.filter((id, other) => id && other !== index));
        return (
          <label key={index} className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-sm">
            <span className="font-mono text-xs text-[var(--ops-text-muted)]">
              {slotLabel} {index + 1}
            </span>
            <SoftSelect
              value={value}
              onChange={(event) => {
                const next = [...values];
                next[index] = event.target.value;
                onChange(next);
              }}
              className={error ? fieldErrorClass : fieldClass}
            >
              <option value="">—</option>
              {options
                .filter((option) => !taken.has(option.id) || option.id === value)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
            </SoftSelect>
          </label>
        );
      })}
      {options.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-muted)]">No entries on this category yet.</p>
      ) : null}
    </div>
  );
}
