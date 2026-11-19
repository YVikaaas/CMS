import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  queue: ReactNode;
  board: ReactNode;
  className?: string;
  splitAt?: "md" | "lg";
};

const SPLIT = {
  md: "md:grid-cols-[minmax(220px,36%)_1fr] md:items-start lg:grid-cols-[minmax(220px,28%)_1fr]",
  lg: "lg:grid-cols-[minmax(220px,32%)_1fr] lg:items-start",
} as const;

export function SplitWorkspace({ queue, board, className, splitAt = "lg" }: Props) {
  return (
    <div
      className={cn(
        "soft-card grid grid-cols-1 overflow-hidden bg-[var(--ops-board)]",
        SPLIT[splitAt],
        className,
      )}
    >
      <aside
        className={cn(
          "flex min-h-[120px] min-w-0 flex-col gap-1.5 overflow-y-auto border-b border-[var(--ops-line)] p-3",
          // stacked: cap the queue so the board stays near the top; side by side: full height
          splitAt === "md"
            ? "max-h-[40dvh] md:max-h-none md:border-r md:border-b-0"
            : "max-h-[40dvh] lg:max-h-none lg:border-r lg:border-b-0",
        )}
      >
        {queue}
      </aside>
      <div className="flex min-h-[240px] min-w-0 flex-col overflow-auto bg-[var(--ops-board-muted)] p-3">
        {board}
      </div>
    </div>
  );
}
