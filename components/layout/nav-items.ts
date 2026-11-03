import {
  BookOpenText,
  Brain,
  LayoutDashboard,
  type LucideIcon,
  NotebookPen,
  Timer,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Key under `nav.*` in the message catalogs. */
  labelKey: "dashboard" | "lessons" | "notebook" | "review" | "pomodoro";
  icon: LucideIcon;
}

/** Single source of truth for the sidebar (desktop) and bottom bar (mobile). */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/lessons", labelKey: "lessons", icon: BookOpenText },
  { href: "/review", labelKey: "review", icon: Brain },
  { href: "/notebook", labelKey: "notebook", icon: NotebookPen },
  { href: "/pomodoro", labelKey: "pomodoro", icon: Timer },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
