"use client";

import type { InputHTMLAttributes } from "react";
import { fieldClass } from "@/components/Modal";
import {
  sanitizeCategoryNameInput,
  sanitizeNameInput,
  sanitizePhoneInput,
} from "@/lib/utils/validation";

export function NameInput({
  value,
  onChange,
  className = fieldClass,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      {...rest}
      value={value}
      pattern={rest.pattern ?? "[A-Za-z]+( [A-Za-z]+)*"}
      title={rest.title ?? "Letters only"}
      onChange={(event) => onChange(sanitizeNameInput(event.target.value))}
      className={className}
      autoComplete={rest.autoComplete ?? "off"}
    />
  );
}

export function CategoryNameInput({
  value,
  onChange,
  className = fieldClass,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      {...rest}
      value={value}
      pattern={rest.pattern ?? "[A-Za-z0-9]+([ xX][A-Za-z0-9]+)*"}
      title={rest.title ?? "Letters, numbers, and spaces"}
      onChange={(event) => onChange(sanitizeCategoryNameInput(event.target.value))}
      className={className}
      autoComplete={rest.autoComplete ?? "off"}
    />
  );
}

export function PhoneInput({
  value,
  onChange,
  className = fieldClass,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      {...rest}
      value={value}
      inputMode="numeric"
      maxLength={10}
      pattern={rest.pattern ?? "[6-9][0-9]{9}"}
      title={rest.title ?? "10 digits starting with 6-9"}
      placeholder={rest.placeholder ?? "10-digit mobile"}
      onChange={(event) => onChange(sanitizePhoneInput(event.target.value))}
      className={className}
      autoComplete={rest.autoComplete ?? "tel"}
    />
  );
}
