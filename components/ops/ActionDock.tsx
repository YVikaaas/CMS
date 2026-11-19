import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Thumb-zone action bar pinned to the bottom of the screen.
 * Put it last inside a page root with `flex flex-1 flex-col`: mt-auto keeps it at the bottom
 * on short pages, sticky keeps it in view on long ones.
 */
export function ActionDock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 -mb-6 mt-auto border-t border-[var(--ops-line)] bg-[var(--ops-surface)]/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
