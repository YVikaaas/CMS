import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function StepCrumbs({
  items,
  className,
}: {
  items: Array<{ href?: string; label: string }>;
  className?: string;
}) {
  return (
    <nav
      className={cn("flex flex-wrap items-center gap-1 text-sm text-[var(--ops-text-muted)]", className)}
      aria-label="Steps"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="font-medium hover:text-[var(--ops-text)]">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-[var(--ops-text)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
