import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function StickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--ops-line)] pt-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
