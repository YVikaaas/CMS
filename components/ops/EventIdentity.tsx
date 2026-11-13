import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function EventIdentity({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl bg-[var(--ops-header)] px-4 py-3 text-white",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          {eyebrow}
        </p>
        <p className="truncate text-lg font-semibold text-[var(--ops-sky)]">{title}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
