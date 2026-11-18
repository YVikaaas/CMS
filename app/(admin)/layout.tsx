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
  IconComponents,
  IconLayoutDashboard,
  IconLayoutSidebar,
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
        className={cn(!showLabels && "justify-center")}
      >
        {Icon ? (
          <ListItemIcon className={cn(!showLabels && "min-w-0")}>
            <Icon size={20} stroke={1.5} />
          </ListItemIcon>
        ) : null}
        {showLabels ? <ListItemText primary={item.label} /> : null}
      </ListItemButton>
    );
  };

  return (
    <aside
      className={cn(
        "z-40 flex h-dvh shrink-0 flex-col border-r border-[var(--ops-line)] bg-[var(--ops-surface)]",
        collapsed && !isMobile ? "w-[88px]" : "w-[270px]",
        isMobile && "w-full border-r-0",
      )}
    >
      <div className={cn("relative flex h-[70px] shrink-0 items-center", showLabels ? "px-6" : "justify-center")}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2" onClick={onClose}>
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#030e09] text-sm font-bold text-[var(--ops-accent)]">
            C
          </span>
          {showLabels ? <span className="truncate text-[22px] font-semibold text-[#030e09]">CMS</span> : null}
        </Link>
        {isMobile && onClose ? (
          <IconButton onClick={onClose} aria-label="Close menu" className="absolute right-3">
            <IconX size={20} />
          </IconButton>
        ) : null}
      </div>
      <nav className={cn("flex-1 overflow-y-auto pb-6", showLabels ? "px-6" : "px-4")}>
        <List disablePadding>
          {showLabels ? <ListSubheader className="mt-6">Dashboard</ListSubheader> : null}
          {ADMIN_NAV.filter((item) => !item.section).map(itemButton)}
        </List>
        {NAV_SECTIONS.map((section) => {
          const items = ADMIN_NAV.filter((item) => item.section === section.id);
          if (items.length === 0) return null;
          return (
            <List key={section.id} disablePadding>
              <Divider className="my-4" />
              {showLabels ? <ListSubheader className="mt-0">{section.label}</ListSubheader> : null}
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
  const userName = appUser?.fullName || appUser?.email || "";

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
        slotProps={{ paper: { className: "w-[270px]" } }}
      >
        <Sidebar isMobile onClose={() => setMobileOpen(false)} collapsed={false} />
      </Drawer>
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        <AppBar position="sticky">
          <Toolbar className="gap-2">
            <IconButton
              aria-label={screen === "mobile" ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
              color="inherit"
              onClick={() => {
                if (screen === "mobile") setMobileOpen(true);
                else setCollapsed((value) => !value);
              }}
            >
              <IconLayoutSidebar size={20} stroke={1.5} />
            </IconButton>
            {/* NiceAdmin puts search here; CMS puts the championship everything else depends on */}
            {loading ? (
              <Shimmer className="h-9 w-48 sm:w-64" />
            ) : (
              <SoftSelect
                size="small"
                value={selectedId ?? ""}
                onChange={(event) => setSelectedId(event.target.value || null)}
                className="w-full min-w-0 max-w-[18rem]"
                aria-label="Championship"
                startIcon={<IconTrophy size={18} stroke={1.5} />}
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
            )}
            <div className="flex-1" />
            <IconButton
              aria-label="Open profile"
              aria-haspopup="dialog"
              onClick={() => setProfileOpen(true)}
              className="p-1"
            >
              <Avatar className="size-[34px] bg-[var(--ops-primary)] text-xs font-semibold text-[var(--ops-accent)]">
                {initials(userName) || "?"}
              </Avatar>
            </IconButton>
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
              <Avatar className="mb-2 size-[72px] bg-[var(--ops-primary)] text-xl font-semibold text-[var(--ops-accent)]">
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
              <SoftButton variant="primary" className="w-full [&]:bg-[var(--ops-accent)] [&]:text-[var(--ops-on-accent)]" onClick={() => void signOut("/login")}>
                <IconLogout size={18} className="mr-2" />
                Log out
              </SoftButton>
            </div>
          </div>
        </Drawer>
        <main key={pathname} className="min-h-0 flex-1 px-4 pb-6 pt-6 sm:px-6">
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
