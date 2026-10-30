import type { LucideIcon } from "lucide-react";
import { BookOpen, ClipboardCheck, FileCheck2, FolderOpen, Grid3x3, History, LayoutDashboard, Layers, TriangleAlert } from "lucide-react";

export const COMPLIANCE_HOME = "/compliance-workspace";

export type ComplianceNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** False until the page is built — shown disabled ("Segera") rather than as a dead link. */
  available: boolean;
};

/** Sidebar of the Compliance Workspace (docs/handoff/design-reference/Compliance.dc.html), in build order. */
export const COMPLIANCE_NAV: ComplianceNavItem[] = [
  { label: "Dashboard", href: COMPLIANCE_HOME, icon: LayoutDashboard, available: true },
  { label: "Daftar Permohonan", href: `${COMPLIANCE_HOME}/permohonan`, icon: ClipboardCheck, available: true },
  { label: "Workspace Results", href: `${COMPLIANCE_HOME}/workspace-results`, icon: Layers, available: false },
  { label: "Compliance Matrix", href: `${COMPLIANCE_HOME}/matrix`, icon: Grid3x3, available: true },
  { label: "Temuan & Exception", href: `${COMPLIANCE_HOME}/temuan`, icon: TriangleAlert, available: true },
  { label: "Compliance Dossier", href: `${COMPLIANCE_HOME}/dossier`, icon: FolderOpen, available: true },
  { label: "LHVIU & Final Output", href: `${COMPLIANCE_HOME}/lhviu`, icon: FileCheck2, available: true },
  { label: "Audit & Traceability", href: `${COMPLIANCE_HOME}/audit`, icon: History, available: true },
  { label: "Referensi", href: `${COMPLIANCE_HOME}/referensi`, icon: BookOpen, available: false },
];

/** The nav item a path belongs to (longest matching href), for the active state and breadcrumb. */
export function activeNavItem(pathname: string): ComplianceNavItem | null {
  const matches = COMPLIANCE_NAV.filter((item) =>
    item.href === COMPLIANCE_HOME ? pathname === COMPLIANCE_HOME : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}
