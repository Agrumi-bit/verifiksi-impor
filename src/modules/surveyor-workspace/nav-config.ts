import { CalendarDays, ClipboardList, FileBarChart, LayoutDashboard, UserCircle } from "lucide-react";
import type { NavSection } from "@/components/layout/sidebar";

const BASE = "/surveyor-workspace";

export const SURVEYOR_WORKSPACE_NAV: NavSection[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: BASE },
  { label: "My Assignments", icon: ClipboardList, href: `${BASE}/assignments` },
  { label: "My Schedule", icon: CalendarDays, href: `${BASE}/schedule` },
  { label: "Reports", icon: FileBarChart, href: `${BASE}/reports` },
  { label: "Account", icon: UserCircle, href: `${BASE}/account` },
];
