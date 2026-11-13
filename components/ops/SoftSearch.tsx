"use client";

import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  onSearch?: () => void;
};

export function SoftSearch({ className, onSearch, ...rest }: Props) {
  return (
    <label className="relative block min-w-0 flex-1">
      <Search
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ops-text-muted)]"
      />
      <input
        type="search"
        onKeyDown={(event) => {
          if (event.key === "Enter") onSearch?.();
        }}
        className={cn("ops-control w-full pl-9", className)}
        {...rest}
      />
    </label>
  );
}
