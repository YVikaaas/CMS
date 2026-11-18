"use client";

import NativeSelect from "@mui/material/NativeSelect";
import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import type { ReactNode, SelectHTMLAttributes } from "react";

// Native <select> under MUI styling: callers keep <option> children and event.target.value.
export function SoftSelect({
  className,
  children,
  value,
  onChange,
  disabled,
  size = "medium",
  startIcon,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: "small" | "medium"; startIcon?: ReactNode }) {
  // Callers may pass fieldClass / fieldErrorClass: MUI draws the border, so map them to `error` instead.
  const error = /\bops-control-error\b/.test(className ?? "");
  const rootClass = className?.replace(/\bops-control(-error)?\b/g, "").trim();
  return (
    <NativeSelect
      className={rootClass}
      value={value}
      onChange={onChange}
      disabled={disabled}
      input={
        <OutlinedInput
          size={size}
          error={error}
          startAdornment={startIcon ? <InputAdornment position="start">{startIcon}</InputAdornment> : undefined}
        />
      }
      inputProps={rest}
    >
      {children}
    </NativeSelect>
  );
}
