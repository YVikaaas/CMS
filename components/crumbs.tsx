import Link from "next/link";

export function Crumbs({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-[var(--cms-muted)]">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="underline-offset-2 hover:text-[var(--ops-text)] hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--ops-text)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
