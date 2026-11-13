"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  selected?: boolean;
};

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

export function SoftCard({
  children,
  className,
  interactive = false,
  padding = "md",
  selected = false,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "soft-card",
        paddingMap[padding],
        interactive && "cursor-pointer hover:border-[var(--ops-primary)]/40 hover:bg-[var(--ops-primary-soft)]/40",
        selected && "border-[var(--ops-primary)] bg-[var(--ops-primary-soft)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
