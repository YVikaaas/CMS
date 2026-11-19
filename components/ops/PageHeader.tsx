import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Page heading. The top app bar already shows "Section / Page", so nothing big is drawn here:
 * the title stays as a screen-reader h1, nested pages get one small breadcrumb line (their only
 * way back up), and an action, if any, sits on the right. `hint` is kept for callers but not shown.
 */
export function PageHeader({
  title,
  action,
  crumbs,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Parent steps for nested pages; the title is added as the last crumb. */
  crumbs?: Array<{ href?: string; label: string }>;
  className?: string;
}) {
  const heading = <h1 className="sr-only">{title}</h1>;
  if (!crumbs && !action) return heading;

  const trail = crumbs ? [...crumbs, { label: title }] : [];
  return (
    <div className={cn("flex min-h-11 flex-wrap items-center justify-between gap-3", className)}>
      {heading}
      {crumbs ? (
        <Breadcrumbs aria-label="Breadcrumb" className="text-sm text-[var(--ops-text-muted)]">
          {trail.map((crumb, index) =>
            crumb.href && index < trail.length - 1 ? (
              <Link key={`${crumb.label}-${index}`} href={crumb.href} className="hover:text-[var(--ops-text)] hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span
                key={`${crumb.label}-${index}`}
                aria-current={index === trail.length - 1 ? "page" : undefined}
                className={index === trail.length - 1 ? "font-medium text-[var(--ops-text)]" : undefined}
              >
                {crumb.label}
              </span>
            ),
          )}
        </Breadcrumbs>
      ) : (
        <span />
      )}
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}
