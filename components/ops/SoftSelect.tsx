"use client";

import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select from "@mui/material/Select";
import {
  Children,
  Fragment,
  isValidElement,
  type ChangeEvent,
  type OptionHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

type OptionEl = ReactElement<OptionHTMLAttributes<HTMLOptionElement>>;

/** Flatten <option> children, including ones inside arrays and fragments. */
function options(children: ReactNode): OptionEl[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) return options((child.props as { children?: ReactNode }).children);
    return child.type === "option" ? [child as OptionEl] : [];
  });
}

/**
 * MUI Select with a themed menu. Callers keep the native API: <option> children and event.target.value.
 * Callers may pass fieldClass / fieldErrorClass: MUI draws the border, so they map to `error`.
 */
export function SoftSelect({
  className,
  children,
  value,
  onChange,
  disabled,
  size = "medium",
  startIcon,
  "aria-label": ariaLabel,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: "small" | "medium"; startIcon?: ReactNode }) {
  const error = /\bops-control-error\b/.test(className ?? "");
  const rootClass = className?.replace(/\bops-control(-error)?\b/g, "").trim();
  return (
    <Select
      className={rootClass}
      // controlled when the caller passes value, otherwise uncontrolled from defaultValue
      {...(value !== undefined ? { value } : { defaultValue: rest.defaultValue ?? "" })}
      displayEmpty
      disabled={disabled}
      // MUI's event carries { target: { value, name } }, which is all callers read
      onChange={(event) => onChange?.(event as unknown as ChangeEvent<HTMLSelectElement>)}
      input={
        <OutlinedInput
          size={size}
          error={error}
          startAdornment={startIcon ? <InputAdornment position="start">{startIcon}</InputAdornment> : undefined}
        />
      }
      inputProps={{ name: rest.name, id: rest.id, required: rest.required }}
      // the visible combobox carries the label (the native input MUI keeps is hidden)
      SelectDisplayProps={{ "aria-label": ariaLabel } as React.HTMLAttributes<HTMLDivElement>}
      MenuProps={{ slotProps: { paper: { className: "mt-1 max-h-80" } } }}
    >
      {options(children).map((option) => (
        <MenuItem key={String(option.props.value ?? option.key)} value={String(option.props.value ?? "")} disabled={option.props.disabled}>
          {option.props.children}
        </MenuItem>
      ))}
    </Select>
  );
}
