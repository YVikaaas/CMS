import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// Buttons and chips on a teal surface use the lime accent, as in NiceAdmin's welcome card.
export const onTeal = [
  "[&_.MuiButton-contained.MuiButton-colorPrimary]:bg-[var(--ops-accent)] [&_.MuiButton-contained.MuiButton-colorPrimary]:text-[var(--ops-on-accent)]",
  "[&_.MuiButton-outlined.MuiButton-colorPrimary]:border-white/60 [&_.MuiButton-outlined.MuiButton-colorPrimary]:text-white",
  "[&_.MuiChip-root]:bg-[var(--ops-accent)] [&_.MuiChip-root]:text-[var(--ops-on-accent)]",
].join(" ");

// NiceAdmin page banner: teal box, white title, breadcrumb (or the page action) on the right.
export function PageHeader({
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
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--ops-primary)] p-5 text-white",
        onTeal,
        className,
      )}
    >
      <div className="min-w-0">
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {hint ? <p className="mt-1 text-sm text-white/70">{hint}</p> : null}
      </div>
      {action ? (
        <div className="shrink-0">{action}</div>
      ) : (
        <Breadcrumbs aria-label="Breadcrumb" className="text-sm [&_.MuiBreadcrumbs-separator]:text-white/60">
          <Link href="/dashboard" className="text-white hover:underline">
            Dashboard
          </Link>
          <span className="text-white/60">{title}</span>
        </Breadcrumbs>
      )}
    </div>
  );
}
