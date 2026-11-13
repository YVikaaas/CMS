"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChampionshipProvider, useChampionship } from "@/app/providers/ChampionshipProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { ADMIN_NAV } from "@/lib/utils/nav";
import { cn } from "@/lib/utils/cn";

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { appUser } = useCurrentUser();
  const { championships, selectedId, setSelectedId } = useChampionship();

  return (
    <div className="flex min-h-dvh bg-[var(--background)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--cms-line)] bg-white">
        <div className="flex items-center gap-2 border-b border-[var(--cms-line)] px-4 py-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cms-action)] text-sm font-semibold text-white">
            C
          </span>
          <div>
            <p className="text-sm font-semibold">CMS</p>
            <p className="text-xs text-[var(--cms-muted)]">Championships</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {ADMIN_NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.children?.some((child) => pathname === child.href) ?? false) ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <div key={item.href + item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {item.label}
                </Link>
                {item.children ? (
                  <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-[var(--cms-line)] pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "rounded-md px-2 py-1.5 text-sm",
                          pathname === child.href ||
                          pathname.startsWith(`${child.href}/`)
                            ? "font-medium text-[var(--cms-action)]"
                            : "text-slate-600 hover:text-slate-900",
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-[var(--cms-line)] px-4 py-3">
          <p className="truncate text-xs text-[var(--cms-muted)]">
            {appUser?.fullName || appUser?.email}
          </p>
          <button
            type="button"
            onClick={() => void signOut("/login")}
            className="mt-2 rounded-md px-1 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--cms-line)] bg-white px-6 py-3">
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-[var(--cms-muted)]">Championship</span>
            <select
              value={selectedId ?? ""}
              onChange={(event) => setSelectedId(event.target.value || null)}
              className="h-9 max-w-md rounded-lg border border-[var(--cms-line)] bg-white px-2 text-sm outline-none focus:border-[var(--cms-action)]"
            >
              {championships.length === 0 ? (
                <option value="">No championships yet</option>
              ) : (
                championships.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChampionshipProvider>
      <Shell>{children}</Shell>
    </ChampionshipProvider>
  );
}
