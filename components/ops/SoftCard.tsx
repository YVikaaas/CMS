"use client";

import Card from "@mui/material/Card";
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
  md: "p-4",
  lg: "p-5",
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
    <Card
      className={cn(
        paddingMap[padding],
        interactive && "ops-lift cursor-pointer",
        selected && "border-[var(--ops-text)] bg-[var(--ops-primary-soft)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Card>
  );
}
