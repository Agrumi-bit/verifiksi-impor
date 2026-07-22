import {
  FileText,
  Folder,
  LayoutDashboard,
  BarChart3,
  UserCircle,
  Building2,
} from "lucide-react";

import type { NavSection } from "@/components/layout/sidebar";

const BASE = "/company-workspace";

export const COMPANY_WORKSPACE_NAV: NavSection[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: BASE },
  {
    label: "Application",
    icon: FileText,
    children: [
      { label: "Application List", href: `${BASE}/applications` },
      { label: "New Application", href: `${BASE}/applications/new` },
    ],
  },
  {
    label: "Company Profile",
    icon: Building2,
    href: `${BASE}/profile`,
  },
  {
    label: "Supporting",
    icon: Folder,
    children: [
      { label: "Partner Companies", href: `${BASE}/supporting/partners` },
      { label: "Brand Management", href: `${BASE}/supporting/brands` },
      { label: "Supporting Documents", href: `${BASE}/supporting/documents` },
      { label: "Media Library", href: `${BASE}/supporting/media` },
    ],
  },
  { label: "Reports", icon: BarChart3, href: `${BASE}/reports` },
  { label: "Account", icon: UserCircle, href: `${BASE}/account` },
];
