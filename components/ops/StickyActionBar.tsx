import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Save / submit row for a board. Sticks to the screen bottom while its board is on screen,
 * so the official never scrolls back down to save. 48px buttons for gloves and thumbs.
 */
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
        "sticky bottom-0 z-10 mt-2 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--ops-line)] bg-[var(--ops-surface)]/95 py-2 backdrop-blur [&_button]:min-h-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
