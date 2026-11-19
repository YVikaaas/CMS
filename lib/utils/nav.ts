import {
  IconAward,
  IconCalendarEvent,
  IconClipboardList,
  IconComponents,
  IconFlag,
  IconLayoutDashboard,
  IconMedal,
  IconStack2,
  IconTrophy,
  IconUserCheck,
  IconUserCircle,
  type TablerIcon,
} from "@tabler/icons-react";

export type NavSectionId = "floor" | "setup" | "catalog" | "pages";

export type NavItem = {
  href: string;
  label: string;
  pageRole: string;
  section?: NavSectionId;
  icon?: TablerIcon;
};

export const NAV_SECTIONS: Array<{ id: NavSectionId; label: string }> = [
  { id: "floor", label: "Floor" },
  { id: "setup", label: "Setup" },
  { id: "catalog", label: "Catalog" },
  { id: "pages", label: "Pages" },
];

/** Sidebar destinations and the page role each will enforce later. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", pageRole: "dashboard.view", icon: IconLayoutDashboard },
  {
    href: "/gameplay/call-room",
    label: "Call Room",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: IconUserCheck,
  },
  {
    href: "/gameplay/fixtures",
    label: "Fixtures",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: IconCalendarEvent,
  },
  {
    href: "/gameplay/scoring",
    label: "Scoring",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: IconClipboardList,
  },
  {
    href: "/gameplay/results",
    label: "Results",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: IconTrophy,
  },
  {
    href: "/gameplay/podium",
    label: "Podium",
    pageRole: "gameplay.manage",
    section: "floor",
    icon: IconAward,
  },
  {
    href: "/events",
    label: "Events",
    pageRole: "championship.manage",
    section: "setup",
    icon: IconFlag,
  },
  {
    href: "/masters/sports",
    label: "Sport",
    pageRole: "masters.manage",
    section: "catalog",
    icon: IconMedal,
  },
  {
    href: "/masters/categories",
    label: "Category",
    pageRole: "masters.manage",
    section: "catalog",
    icon: IconStack2,
  },
  {
    href: "/account",
    label: "Account Setting",
    pageRole: "account.self",
    section: "pages",
    icon: IconUserCircle,
  },
  {
    href: "/ui-kit",
    label: "UI Kit",
    pageRole: "dashboard.view",
    section: "pages",
    icon: IconComponents,
  },
];

export function pathTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return "Dashboard";
  if (pathname.startsWith("/gameplay/call-room")) return "Call Room";
  if (pathname.startsWith("/gameplay/scoring")) return "Scoring";
  if (pathname.startsWith("/gameplay/podium")) return "Podium";
  if (pathname.startsWith("/gameplay/results")) return "Results";
  if (pathname.startsWith("/gameplay/fixtures")) return "Fixtures";
  if (pathname.startsWith("/events")) return "Events";
  if (pathname.startsWith("/masters/sports")) return "Sport";
  if (pathname.startsWith("/masters/categories")) return "Category";
  if (pathname.startsWith("/masters")) return "Catalog";
  if (pathname.startsWith("/account")) return "Account Setting";
  if (pathname.startsWith("/ui-kit")) return "UI Kit";
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
