"use client";

import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import type { InputHTMLAttributes } from "react";
import { IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  onSearch?: () => void;
};

export function SoftSearch({ className, onSearch, value, onChange, placeholder, disabled, ...rest }: Props) {
  return (
    <OutlinedInput
      type="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("min-w-0 flex-1", className)}
      startAdornment={
        <InputAdornment position="start">
          <IconSearch size={16} />
        </InputAdornment>
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") onSearch?.();
      }}
      inputProps={rest}
    />
  );
}
