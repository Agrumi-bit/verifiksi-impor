import {
  Building2,
  ClipboardCheck,
  FileText,
  Handshake,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import type { NavSection } from "@/components/layout/sidebar";

export type { NavItem, NavSection } from "@/components/layout/sidebar";

export const NAV_SECTIONS: NavSection[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  {
    label: "Application Management",
    icon: FileText,
    children: [
      { label: "Create New Application", href: "/applications/new" },
      { label: "Application Dashboard" },
      { label: "Application List", href: "/applications" },
      { label: "Application Review" },
      { label: "Application Status" },
    ],
  },
  {
    label: "VIU Management",
    icon: ClipboardCheck,
    children: [
      { label: "Verification Assignment" },
      { label: "Verification Schedule" },
      { label: "Verification Document" },
      { label: "On Site Verification" },
      { label: "Validation" },
      { label: "Report" },
    ],
  },
  {
    label: "VKI Management",
    icon: ClipboardCheck,
    children: [
      { label: "Verification Assignment" },
      { label: "Verification Schedule" },
      { label: "Verification Document" },
      { label: "On Site Verification" },
      { label: "Validation" },
      { label: "Report" },
    ],
  },
  {
    label: "Mitra Management",
    icon: Handshake,
    children: [
      { label: "Mitra Industri", href: "/mitra/industri" },
      { label: "Mitra Non Industri", href: "/mitra/non-industri" },
      { label: "Mitra Verification" },
      { label: "Merk", href: "/mitra/merk" },
    ],
  },
  {
    label: "Company Management",
    icon: Building2,
    children: [
      { label: "Company Registry", href: "/company" },
      { label: "Add New Company", href: "/company/new" },
    ],
  },
  {
    label: "User Management",
    icon: Users,
    children: [
      { label: "User List", href: "/user-management/users" },
      { label: "Role Management", href: "/user-management/roles" },
      { label: "Permission Management" },
    ],
  },
  {
    label: "System Configuration",
    icon: Settings,
    children: [
      { label: "HS Code Master Data", href: "/system-configuration/hs-code" },
      { label: "KBLI Master Data", href: "/system-configuration/kbli" },
      {
        label: "Commodity Group",
        href: "/system-configuration/commodity-group",
      },
      {
        label: "Commodity Sub Group",
        href: "/system-configuration/commodity-sub-group",
      },
      {
        label: "Unit of Measurement",
        href: "/system-configuration/unit-of-measurement",
      },
      { label: "Notification & Communication" },
      { label: "Application Setting" },
    ],
  },
];
