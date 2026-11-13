"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { ChampionshipProvider, useChampionship } from "@/app/providers/ChampionshipProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { EmptyState, SoftButton, SoftSelect } from "@/components/ops";
import {
  ADMIN_NAV,
  NAV_SECTIONS,
  isNavItemActive,
  needsChampionship,
  pathTitle,
} from "@/lib/utils/nav";
import { cn } from "@/lib/utils/cn";

function useScreen() {
  const [width, setWidth] = useState(1280);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  if (width < 640) return "mobile" as const;
  if (width < 1280) return "tablet" as const;
  return "desktop" as const;
}

function Sidebar({
  collapsed,
  isMobile,
  onClose,
}: {
  collapsed: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const showLabels = !collapsed || isMobile;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    floor: true,
    setup: true,
    catalog: false,
  });

  const itemButton = (item: (typeof ADMIN_NAV)[number], nested: boolean) => {
    const Icon = item.icon;
    const active = isNavItemActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={!showLabels ? item.label : undefined}
        onClick={onClose}
        className={cn(
          "flex min-h-11 w-full items-center rounded-xl text-left text-sm font-semibold",
          !showLabels ? "justify-center px-0" : nested ? "gap-3 py-2 pr-3 pl-3" : "gap-3 px-3",
          active
            ? "bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]"
            : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
        )}
      >
        {Icon ? <Icon size={18} className="shrink-0" strokeWidth={active ? 2.25 : 1.75} /> : null}
        {showLabels ? <span className="truncate">{item.label}</span> : null}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "z-40 flex h-dvh shrink-0 flex-col border-r border-[var(--ops-line)] bg-[var(--ops-surface)]",
        collapsed && !isMobile ? "w-[76px]" : "w-[248px]",
        isMobile && "w-full",
      )}
    >
      <div className="relative flex shrink-0 items-center gap-2 px-3 py-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2" onClick={onClose}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ops-primary)] text-sm font-semibold text-white">
            C
          </span>
          {showLabels ? (
            <span className="truncate text-sm font-semibold">CMS</span>
          ) : null}
        </Link>
        {isMobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 inline-flex size-10 items-center justify-center rounded-xl text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)]"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {ADMIN_NAV.filter((item) => !item.section).map((item) => itemButton(item, false))}
        {NAV_SECTIONS.map((section) => {
          const items = ADMIN_NAV.filter((item) => item.section === section.id);
          if (items.length === 0) return null;
          const open = openSections[section.id] ?? true;
          return (
            <div key={section.id} className="mt-2">
              {showLabels ? (
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((prev) => ({ ...prev, [section.id]: !open }))
                  }
                  className="flex min-h-9 w-full items-center justify-between rounded-lg px-2 text-[11px] font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase"
                >
                  {section.label}
                  <ChevronDown size={14} className={cn("transition", open ? "rotate-0" : "-rotate-90")} />
                </button>
              ) : (
                <div className="mx-auto my-2 h-px w-8 bg-[var(--ops-line)]" />
              )}
              {open || !showLabels ? items.map((item) => itemButton(item, true)) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const screen = useScreen();
  const { signOut } = useAuth();
  const { appUser } = useCurrentUser();
  const { championships, selectedId, setSelectedId, loading } = useChampionship();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(screen !== "desktop");
  }, [screen]);

  const title = useMemo(() => pathTitle(pathname), [pathname]);
  const gated = needsChampionship(pathname) && !loading && championships.length === 0;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--ops-bg)]">
      <div className="relative hidden h-full w-[76px] shrink-0 sm:block xl:w-auto">
        <div className="absolute inset-y-0 left-0 z-40 xl:static">
          <Sidebar
            collapsed={collapsed}
            onClose={screen === "tablet" ? () => setCollapsed(true) : undefined}
          />
        </div>
      </div>
      {screen === "tablet" && !collapsed ? (
        <button
          type="button"
          className="fixed inset-0 z-[35] hidden bg-black/30 sm:block xl:hidden"
          aria-label="Collapse menu"
          onClick={() => setCollapsed(true)}
        />
      ) : null}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[280px] bg-[var(--ops-surface)] shadow-xl">
            <Sidebar isMobile onClose={() => setMobileOpen(false)} collapsed={false} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--ops-line)] bg-[var(--ops-surface)] px-4 py-3">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--ops-line)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)]"
            aria-label="Menu"
            onClick={() => {
              if (screen === "mobile") setMobileOpen(true);
              else setCollapsed((value) => !value);
            }}
          >
            <Menu size={18} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h1>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden shrink-0 text-[var(--ops-text-muted)] sm:inline">Championship</span>
            <SoftSelect
              value={selectedId ?? ""}
              onChange={(event) => setSelectedId(event.target.value || null)}
              className="max-w-[16rem]"
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
            </SoftSelect>
          </label>
          <p className="hidden max-w-[10rem] truncate text-xs text-[var(--ops-text-muted)] xl:block">
            {appUser?.fullName || appUser?.email}
          </p>
          <button
            type="button"
            onClick={() => void signOut("/login")}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--ops-line)] text-[var(--ops-text-muted)] hover:border-[var(--ops-danger)] hover:text-[var(--ops-danger)]"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {gated ? (
            <EmptyState
              title="Create a championship to get started"
              hint="Floor pages need a championship in the header."
              action={
                <Link href="/championships">
                  <SoftButton variant="primary">Championships</SoftButton>
                </Link>
              }
            />
          ) : (
            children
          )}
        </div>
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
