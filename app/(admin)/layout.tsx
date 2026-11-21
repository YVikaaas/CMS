"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Toolbar from "@mui/material/Toolbar";
import {
  IconChevronDown,
  IconComponents,
  IconLayoutDashboard,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMenu2,
  IconLock,
  IconLogout,
  IconMail,
  IconTrophy,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import { ChampionshipProvider, useChampionship } from "@/app/providers/ChampionshipProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { EmptyState, Shimmer, SoftButton, SoftSelect } from "@/components/ops";
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

  const itemButton = (item: (typeof ADMIN_NAV)[number]) => {
    const Icon = item.icon;
    const active = isNavItemActive(pathname, item.href);
    return (
      <ListItemButton
        key={item.href}
        component={Link}
        href={item.href}
        selected={active}
        aria-current={active ? "page" : undefined}
        title={!showLabels ? item.label : undefined}
        onClick={onClose}
        // Kit nav: white on black; active = accent outline + accent label, no fill
        className={cn(
          "border-[1.5px] border-transparent text-[var(--ops-nav-ink)] hover:bg-white/10",
          "[&.Mui-selected]:border-[var(--ops-accent)] [&.Mui-selected]:bg-transparent [&.Mui-selected]:text-[var(--ops-accent)] [&.Mui-selected:hover]:bg-white/10",
          !showLabels && "justify-center px-0",
        )}
      >
        {Icon ? (
          <ListItemIcon className={cn(!showLabels && "min-w-0")}>
            <Icon size={24} stroke={1.75} />
          </ListItemIcon>
        ) : null}
        {showLabels ? <ListItemText primary={item.label} /> : null}
      </ListItemButton>
    );
  };

  return (
    <aside
      className={cn(
        "z-40 flex h-dvh shrink-0 flex-col bg-[var(--ops-nav)] text-[var(--ops-nav-ink)]",
        collapsed && !isMobile ? "w-[88px]" : "w-[264px]",
        isMobile && "w-full",
      )}
    >
      <div className={cn("flex shrink-0 items-center gap-2 pt-7 pb-5", showLabels ? "justify-between px-7" : "flex-col px-3")}>
        <Link href="/dashboard" className="flex min-w-0 items-center" onClick={onClose}>
          <span className={cn("font-bold tracking-tight", showLabels ? "text-[30px] leading-none" : "text-xl")}>
            {showLabels ? "CMS" : "C"}
          </span>
        </Link>
        {isMobile && onClose ? (
          <IconButton onClick={onClose} aria-label="Close menu" className="text-[var(--ops-nav-ink)] hover:bg-white/10">
            <IconX size={20} />
          </IconButton>
        ) : null}
      </div>
      <nav className={cn("flex-1 overflow-y-auto pb-6", showLabels ? "px-4" : "px-3")}>
        <List disablePadding>{ADMIN_NAV.filter((item) => !item.section).map(itemButton)}</List>
        {NAV_SECTIONS.map((section) => {
          const items = ADMIN_NAV.filter((item) => item.section === section.id);
          if (items.length === 0) return null;
          return (
            <List key={section.id} disablePadding>
              <Divider className="my-3 border-[var(--ops-nav-line)]" />
              {showLabels ? <ListSubheader className="pt-2 pb-2 text-xs text-white/55">{section.label}</ListSubheader> : null}
              {items.map(itemButton)}
            </List>
          );
        })}
      </nav>
    </aside>
  );
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const screen = useScreen();
  const { signOut } = useAuth();
  const { appUser } = useCurrentUser();
  const { championships, selectedId, setSelectedId, loading } = useChampionship();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(screen !== "desktop");
  }, [screen]);

  const gated = needsChampionship(pathname) && !loading && championships.length === 0;
  const activeItem = ADMIN_NAV.find((item) => isNavItemActive(pathname, item.href));
  const where = {
    section: NAV_SECTIONS.find((section) => section.id === activeItem?.section)?.label,
    page: activeItem?.label ?? pathTitle(pathname),
  };
  const userName = appUser?.fullName || appUser?.email || "";
  const avatar = (size: string) => (
    <Avatar className={cn(size, "bg-[var(--ops-accent)] text-xs font-semibold text-[var(--ops-on-accent)]")}>
      {initials(userName) || "?"}
    </Avatar>
  );

  // Event everything depends on: always in the top bar, right side.
  const switcher = loading ? (
    <Shimmer className="h-10 w-44 sm:w-64" />
  ) : (
    <SoftSelect
      size="small"
      value={selectedId ?? ""}
      onChange={(event) => setSelectedId(event.target.value || null)}
      className="w-44 min-w-0 rounded-xl bg-[var(--ops-surface)] sm:w-72 [&_.MuiOutlinedInput-notchedOutline]:rounded-xl"
      aria-label="Event"
      startIcon={<IconTrophy size={18} stroke={1.75} />}
    >
      {championships.length === 0 ? (
        <option value="">No events yet</option>
      ) : (
        championships.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))
      )}
    </SoftSelect>
  );


  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--ops-bg)]">
      <div className="relative hidden h-full w-[88px] shrink-0 sm:block xl:w-auto">
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
          className="fixed inset-0 z-[35] hidden bg-[var(--ops-overlay)] sm:block xl:hidden"
          aria-label="Collapse menu"
          onClick={() => setCollapsed(true)}
        />
      ) : null}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="sm:hidden"
        slotProps={{ paper: { className: "w-[264px] bg-[var(--ops-nav)]" } }}
      >
        <Sidebar isMobile onClose={() => setMobileOpen(false)} collapsed={false} />
      </Drawer>
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {/* Top app bar: menu / sidebar toggle and where you are on the left; event and account on the right */}
        <AppBar position="sticky" className="border-b border-[var(--ops-line)] bg-[var(--ops-surface)]">
          <Toolbar className="gap-2 px-2 sm:gap-3 sm:px-6">
            <IconButton
              aria-label={screen === "mobile" ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
              color="inherit"
              onClick={() => (screen === "mobile" ? setMobileOpen(true) : setCollapsed((value) => !value))}
            >
              {screen === "mobile" ? (
                <IconMenu2 size={22} />
              ) : collapsed ? (
                <IconLayoutSidebarLeftExpand size={22} stroke={1.75} />
              ) : (
                <IconLayoutSidebarLeftCollapse size={22} stroke={1.75} />
              )}
            </IconButton>
            <p className="hidden min-w-0 truncate text-base sm:block">
              {where.section ? <span className="text-[var(--ops-text-muted)]">{where.section} / </span> : null}
              <span className="font-medium">{where.page}</span>
            </p>
            <div className="flex-1" />
            {switcher}
            <span className="hidden h-8 w-px bg-[var(--ops-line)] sm:block" aria-hidden />
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-haspopup="dialog"
              aria-label="Open profile"
              className="flex min-h-11 items-center gap-2 rounded-full p-1 hover:bg-[var(--ops-surface-hover)] sm:pr-3"
            >
              {avatar("size-9")}
              <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:block">{appUser?.fullName || appUser?.email}</span>
              <IconChevronDown size={16} className="hidden text-[var(--ops-text-muted)] lg:block" aria-hidden />
            </button>
          </Toolbar>
        </AppBar>
        <Drawer
          anchor="right"
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          slotProps={{ paper: { className: "w-[270px]" } }}
        >
          <div className="flex h-full flex-col">
            <div className="flex justify-end p-2">
              <IconButton aria-label="Close profile" onClick={() => setProfileOpen(false)}>
                <IconX size={20} />
              </IconButton>
            </div>
            <div className="flex flex-col items-center gap-1 px-6 pb-6 text-center">
              <Avatar className="mb-2 size-[72px] bg-[var(--ops-accent)] text-xl font-semibold text-[var(--ops-on-accent)]">
                {initials(userName) || "?"}
              </Avatar>
              <p className="text-base font-semibold">{appUser?.fullName || "No name yet"}</p>
              <p className="flex items-center gap-1 text-sm text-[var(--ops-text-muted)]">
                <IconMail size={14} />
                <span className="truncate">{appUser?.email}</span>
              </p>
              {appUser?.roles.length ? (
                <p className="text-xs text-[var(--ops-text-muted)] capitalize">{appUser.roles.join(" · ")}</p>
              ) : null}
            </div>
            <Divider />
            <List className="px-3 py-3">
              {[
                { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
                { href: "/account", label: "Account Setting", icon: IconUserCircle },
                { href: "/account#security", label: "Change password", icon: IconLock },
                { href: "/ui-kit", label: "UI Kit", icon: IconComponents },
              ].map(({ href, label, icon: Icon }) => (
                <ListItemButton key={href} component={Link} href={href} onClick={() => setProfileOpen(false)}>
                  <ListItemIcon>
                    <Icon size={20} stroke={1.5} />
                  </ListItemIcon>
                  <ListItemText primary={label} />
                </ListItemButton>
              ))}
            </List>
            <div className="mt-auto p-6">
              <SoftButton variant="primary" className="w-full" onClick={() => void signOut("/login")}>
                <IconLogout size={18} className="mr-2" />
                Log out
              </SoftButton>
            </div>
          </div>
        </Drawer>
        {/* full-height column: a page that ends in <ActionDock> keeps it on the screen bottom even when short */}
        <main key={pathname} className="flex flex-1 flex-col px-4 pt-4 pb-6 sm:px-6 sm:pt-5">
          {gated ? (
            <EmptyState
              title="Create an event to get started"
              hint="Add an event, then pick it at the top right."
              action={
                <Link href="/events">
                  <SoftButton variant="primary">Events</SoftButton>
                </Link>
              }
            />
          ) : (
            children
          )}
        </main>
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
