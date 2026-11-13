import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("soft-card p-8 text-center", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {hint ? <p className="mt-2 text-sm text-[var(--ops-text-muted)]">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
