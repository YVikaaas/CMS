"use client";

import { fieldClass, fieldErrorClass } from "@/components/Modal";
import { SoftSelect } from "@/components/ops";
import { cn } from "@/lib/utils/cn";
import type { TrackTimeParts } from "@/lib/utils/athletics";

const SIXTY = Array.from({ length: 60 }, (_, index) => String(index));
const DIGITS = Array.from({ length: 10 }, (_, index) => String(index));

function msDigits(raw: string): [string, string, string] {
  if (!raw) return ["", "", ""];
  const padded = raw.replace(/\D/g, "").padStart(3, "0").slice(-3);
  return [padded[0] ?? "0", padded[1] ?? "0", padded[2] ?? "0"];
}

function msFromDigits(hundreds: string, tens: string, ones: string): string {
  if (!hundreds && !tens && !ones) return "";
  return `${hundreds || "0"}${tens || "0"}${ones || "0"}`;
}

function UnitSelect({
  label,
  ariaLabel,
  value,
  options,
  disabled,
  invalid,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  options: string[];
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const box = invalid ? fieldErrorClass : fieldClass;
  return (
    <label className="flex min-w-[4.25rem] flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase text-[var(--ops-text-muted)]">{label}</span>
      <SoftSelect
        aria-label={ariaLabel}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(box, "px-2")}
      >
        <option value="">—</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item.padStart(2, "0")}
          </option>
        ))}
      </SoftSelect>
    </label>
  );
}

export function TimePartsInput({
  value,
  disabled,
  invalid,
  onChange,
}: {
  value: TrackTimeParts;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (next: TrackTimeParts) => void;
}) {
  const box = invalid ? fieldErrorClass : fieldClass;
  const [hundreds, tens, ones] = msDigits(value.milliseconds);
  return (
    <div className="flex items-end gap-1">
      <UnitSelect
        label="Min"
        ariaLabel="Minutes"
        value={value.minutes}
        options={SIXTY}
        disabled={disabled}
        invalid={invalid}
        onChange={(minutes) => onChange({ ...value, minutes })}
      />
      <span className="pb-2 font-semibold text-[var(--ops-text-muted)]">:</span>
      <UnitSelect
        label="Sec"
        ariaLabel="Seconds"
        value={value.seconds}
        options={SIXTY}
        disabled={disabled}
        invalid={invalid}
        onChange={(seconds) => onChange({ ...value, seconds })}
      />
      <span className="pb-2 font-semibold text-[var(--ops-text-muted)]">.</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase text-[var(--ops-text-muted)]">Ms</span>
        <div className="flex gap-0.5">
          {[
            { key: "hundreds", digit: hundreds },
            { key: "tens", digit: tens },
            { key: "ones", digit: ones },
          ].map((slot, index, list) => (
            <SoftSelect
              key={slot.key}
              aria-label={
                index === 0 ? "Milliseconds hundreds" : index === 1 ? "Milliseconds tens" : "Milliseconds ones"
              }
              disabled={disabled}
              value={slot.digit}
              onChange={(event) => {
                const next = [...list.map((item) => item.digit)];
                next[index] = event.target.value;
                onChange({
                  ...value,
                  milliseconds: msFromDigits(next[0] ?? "", next[1] ?? "", next[2] ?? ""),
                });
              }}
              className={cn(box, "w-11 px-1")}
            >
              <option value="">—</option>
              {DIGITS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SoftSelect>
          ))}
        </div>
      </div>
    </div>
  );
}
