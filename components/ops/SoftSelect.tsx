"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function SoftSelect({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("ops-control", className)} {...rest}>
      {children}
    </select>
  );
}
