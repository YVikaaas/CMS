import {
  CalendarDays,
  ClipboardList,
  Flag,
  LayoutDashboard,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavSectionId = "floor" | "setup" | "catalog";

export type NavItem = {
  href: string;
  label: string;
  pageRole: string;
  section?: NavSectionId;
  icon?: LucideIcon;
};

export const NAV_SECTIONS: Array<{ id: NavSectionId; label: string }> = [
  { id: "floor", label: "Floor" },
  { id: "setup", label: "Setup" },
  { id: "catalog", label: "Catalog" },
];

/** Sidebar destinations and the page role each will enforce later. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", pageRole: "dashboard.view", icon: LayoutDashboard },
  {
    href: "/gameplay/fixtures",
    label: "Fixtures",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: CalendarDays,
  },
  {
    href: "/gameplay/scoring",
    label: "Scoring",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: ClipboardList,
  },
  {
    href: "/gameplay/results",
    label: "Results",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: Trophy,
  },
  {
    href: "/championships",
    label: "Championships",
    pageRole: "championship.manage",
    section: "setup",
    icon: Flag,
  },
  {
    href: "/masters/sports",
    label: "Sport",
    pageRole: "masters.manage",
    section: "catalog",
  },
  {
    href: "/masters/categories",
    label: "Category",
    pageRole: "masters.manage",
    section: "catalog",
  },
];

export function pathTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return "Dashboard";
  if (pathname.startsWith("/gameplay/scoring")) return "Scoring";
  if (pathname.startsWith("/gameplay/results")) return "Results";
  if (pathname.startsWith("/gameplay/fixtures")) return "Fixtures";
  if (pathname.startsWith("/championships")) return "Championships";
  if (pathname.startsWith("/masters/sports")) return "Sport";
  if (pathname.startsWith("/masters/categories")) return "Category";
  if (pathname.startsWith("/masters")) return "Catalog";
  return "CMS";
}

export function needsChampionship(pathname: string): boolean {
  return pathname.startsWith("/gameplay") || pathname === "/dashboard";
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  if (href === "/gameplay/fixtures" && pathname.startsWith("/gameplay/fixtures")) {
    return !pathname.startsWith("/gameplay/scoring") && !pathname.startsWith("/gameplay/results");
  }
  return false;
}
