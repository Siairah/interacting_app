export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  /** If true, use router for same-tab nav; false = full page (e.g. exit to site) */
  internal?: boolean;
};

/**
 * Same order and labels as PTH Django `templates/Admin/admin_base.html`.
 */
export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "fa-tachometer-alt" },
  { href: "/admin/users", label: "User Management", icon: "fa-users" },
  { href: "/admin/posts", label: "Post Management", icon: "fa-newspaper" },
  { href: "/admin/comments", label: "Comment Management", icon: "fa-comments" },
  { href: "/admin/circles", label: "Circle Management", icon: "fa-circle" },
  { href: "/admin/reports", label: "Report Management", icon: "fa-flag" },
  { href: "/admin/flagged-posts", label: "Flagged Post", icon: "fa-flag" },
  { href: "/admin/analytics", label: "Analytics", icon: "fa-chart-bar" },
  { href: "/", label: "Exit Admin Panel", icon: "fa-sign-out-alt", internal: false },
];

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
