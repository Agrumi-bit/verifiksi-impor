import {
  FileText,
  Folder,
  LayoutDashboard,
  BarChart3,
  UserCircle,
  Building2,
  Tag,
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
    label: "Merek",
    icon: Tag,
    children: [
      { label: "Dashboard", href: `${BASE}/supporting/brands/dashboard` },
      { label: "Daftar Merek", href: `${BASE}/supporting/brands` },
      { label: "Draft", href: `${BASE}/supporting/brands/drafts` },
      { label: "Dokumen", href: `${BASE}/supporting/brands/documents` },
      { label: "Hasil Uji Mutu", href: `${BASE}/supporting/brands/quality-tests` },
      { label: "Riwayat Aktivitas", href: `${BASE}/supporting/brands/activity` },
    ],
  },
  {
    label: "Supporting",
    icon: Folder,
    children: [
      { label: "Partner Companies", href: `${BASE}/supporting/partners` },
      { label: "Supporting Documents", href: `${BASE}/supporting/documents` },
      { label: "Media Library", href: `${BASE}/supporting/media` },
    ],
  },
  { label: "Reports", icon: BarChart3, href: `${BASE}/reports` },
  { label: "Account", icon: UserCircle, href: `${BASE}/account` },
];
