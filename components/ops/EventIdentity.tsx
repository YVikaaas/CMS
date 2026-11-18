import Card from "@mui/material/Card";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// "Where am I" card: teal eyebrow + card title.
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
    <Card className={cn("flex flex-wrap items-center justify-between gap-3 px-6 py-4", className)}>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-[var(--ops-primary)] uppercase">{eyebrow}</p>
        <p className="truncate text-lg font-semibold">{title}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Card>
  );
}
