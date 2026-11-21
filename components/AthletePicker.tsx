"use client";

import { useEffect, useRef, useState } from "react";
import { fieldClass, fieldErrorClass, RequiredMark } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import { findAthleteByPhone } from "@/lib/services";
import type { Gender } from "@/lib/types/cms";
import { isValidPhone } from "@/lib/utils/validation";

export type AthleteDraft = {
  athleteId: string | null;
  name: string;
  phone: string;
  gender: Gender;
  existing: boolean;
};

export function emptyAthleteDraft(gender: Gender): AthleteDraft {
  return { athleteId: null, name: "", phone: "", gender, existing: false };
}

export function AthletePicker({
  value,
  onChange,
  expectedGender,
  errors,
  disabled,
  nameLabel = "Name",
}: {
  value: AthleteDraft;
  onChange: (next: AthleteDraft) => void;
  expectedGender: Gender;
  errors?: { name?: string; phone?: string };
  disabled?: boolean;
  nameLabel?: string;
}) {
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | undefined>();
  const lastPhone = useRef("");
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    const phone = value.phone.trim();
    if (lastPhone.current === phone) return;
    lastPhone.current = phone;
    if (!isValidPhone(phone)) {
      setLooking(false);
      setLookupError(undefined);
      return;
    }
    let cancelled = false;
    setLooking(true);
    setLookupError(undefined);
    void findAthleteByPhone(phone).then((result) => {
      if (cancelled) return;
      setLooking(false);
      if (result.error) {
        setLookupError(result.error.message);
        return;
      }
      const current = valueRef.current;
      if (current.phone.trim() !== phone) return;
      if (result.data) {
        onChangeRef.current({
          athleteId: result.data.id,
          name: result.data.name,
          phone,
          gender: result.data.gender,
          existing: true,
        });
        return;
      }
      onChangeRef.current({
        athleteId: null,
        name: current.existing ? "" : current.name,
        phone,
        gender: expectedGender,
        existing: false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [expectedGender, value.phone]);

  const mismatch = value.existing && value.gender !== expectedGender;
  const status = !isValidPhone(value.phone)
    ? "Enter a 10-digit phone to search or add this athlete."
    : looking
      ? "Looking up this phone…"
      : lookupError
        ? lookupError
        : mismatch
          ? `${value.name} is listed as ${value.gender}, this category is ${expectedGender}.`
          : value.existing
            ? `Existing athlete · ${value.gender}`
            : "New athlete. Enter their name to add them.";

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:col-span-2">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        <span>
          Phone
          <RequiredMark />
        </span>
        <PhoneInput
          value={value.phone}
          disabled={disabled}
          onChange={(phone) => {
            const valid = isValidPhone(phone);
            onChange({
              athleteId: valid ? value.athleteId : null,
              name: valid ? value.name : value.existing ? "" : value.name,
              phone,
              gender: valid ? value.gender : expectedGender,
              existing: valid ? value.existing : false,
            });
          }}
          className={errors?.phone || lookupError ? fieldErrorClass : fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        <span>
          {nameLabel}
          <RequiredMark />
        </span>
        <NameInput
          value={value.name}
          disabled={disabled || value.existing || looking}
          onChange={(name) => onChange({ ...value, name })}
          className={errors?.name ? fieldErrorClass : fieldClass}
        />
      </label>
      <p
        className={`sm:col-span-2 text-sm ${mismatch || lookupError ? "text-[var(--ops-danger)]" : "text-[var(--ops-text-muted)]"}`}
      >
        {status}
      </p>
    </div>
  );
}
