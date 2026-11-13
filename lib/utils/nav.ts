export type NavItem = {
  href: string;
  label: string;
  pageRole: string;
  children?: NavItem[];
};

/** Sidebar destinations and the page role each will enforce later. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", pageRole: "dashboard.view" },
  {
    href: "/championships",
    label: "Championship management",
    pageRole: "championship.manage",
  },
  {
    href: "/gameplay/fixtures",
    label: "Gameplay",
    pageRole: "gameplay.manage",
    children: [
      { href: "/gameplay/fixtures", label: "Fixtures", pageRole: "gameplay.manage" },
      { href: "/gameplay/scoring", label: "Scoring", pageRole: "gameplay.manage" },
    ],
  },
  {
    href: "/masters/sports",
    label: "Masters",
    pageRole: "masters.manage",
    children: [
      { href: "/masters/sports", label: "Sport", pageRole: "masters.manage" },
      {
        href: "/masters/categories",
        label: "Category",
        pageRole: "masters.manage",
      },
    ],
  },
];
