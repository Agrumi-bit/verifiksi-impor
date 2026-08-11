import {
  Building2,
  ClipboardCheck,
  FileText,
  Handshake,
  LayoutDashboard,
  Settings,
  Tag,
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
      { label: "Tambah Application VKI", href: "/applications/new?type=VKI" },
      { label: "Verification Assignment" },
      { label: "Verification Schedule" },
      { label: "Verification Document" },
      { label: "On Site Verification" },
      { label: "Validation" },
      { label: "Report" },
    ],
  },
  { label: "Partner Management", icon: Handshake, href: "/partners" },
  { label: "Merk", icon: Tag, href: "/mitra/merk" },
  {
    label: "Company Management",
    icon: Building2,
    children: [
      { label: "Company List", href: "/company" },
      { label: "Tambah Perusahaan", href: "/company/new" },
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
      { label: "Lartas", href: "/system-configuration/lartas" },
      {
        label: "Kelompok Industri",
        href: "/system-configuration/industry-group",
      },
      {
        label: "Commodity Group",
        href: "/system-configuration/commodity-group",
      },
      {
        label: "Commodity Sub Group",
        href: "/system-configuration/commodity-sub-group",
      },
      {
        label: "Satuan",
        href: "/system-configuration/unit-of-measurement",
      },
      {
        label: "Golongan Tarif Listrik",
        href: "/system-configuration/electricity-tariff",
      },
      { label: "Notification & Communication" },
      { label: "Application Setting" },
    ],
  },
];
