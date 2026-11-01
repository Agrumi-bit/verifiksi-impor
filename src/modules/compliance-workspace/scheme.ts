import { viuSchemeOf } from "@/modules/project-manager-workspace/viu-schemes";
import type { SchemeId } from "@/modules/schemes/types";

/**
 * The verification schemes the Compliance Workspace covers. Each one has its own stages,
 * requirements and source workspaces; everything else (handover, findings, dossier, report) is
 * shared. VIU Konsumsi has no Technical Analyst step; VKI has one.
 */
export const COMPLIANCE_SCHEMES = ["konsumsi", "vki"] as const;
export type ComplianceScheme = (typeof COMPLIANCE_SCHEMES)[number];

export const SCHEME_META: Record<
  ComplianceScheme,
  {
    /** Short name for lists, filters and tabs. */
    label: string;
    /** The scheme's full name, as on the case header and the report cover. */
    title: string;
    /** Scheme id in src/modules/schemes — requirement type and regulation of every document. */
    schemeId: SchemeId;
    /** The final output issued by the Project Manager. */
    output: "LHVIU" | "LHVKI";
  }
> = {
  konsumsi: { label: "VIU – Barang Konsumsi", title: "VIU – Produk Tekstil sebagai Barang Konsumsi", schemeId: "VIU_KONSUMSI", output: "LHVIU" },
  vki: { label: "VKI", title: "VKI – Verifikasi Kemampuan Industri", schemeId: "VKI", output: "LHVKI" },
};

export function isComplianceScheme(value: unknown): value is ComplianceScheme {
  return typeof value === "string" && (COMPLIANCE_SCHEMES as readonly string[]).includes(value);
}

/**
 * Which Compliance scheme an application belongs to, or null when Compliance does not cover it. A VIU
 * application belongs to the scheme of its first import type — the same rule as the Project Manager
 * Workspace's sub menus (viuSchemeOf).
 */
export function schemeOfApplication(verificationType: string, importTypes: readonly string[] | null | undefined): ComplianceScheme | null {
  if (verificationType === "VKI") return "vki";
  if (verificationType === "VIU" && viuSchemeOf(importTypes)?.slug === "konsumsi") return "konsumsi";
  return null;
}
