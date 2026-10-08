/**
 * The three VIU sub menus of the Project Manager workspace. One application applies for one import
 * type, so it belongs to exactly one sub menu. `slug` is the URL segment under
 * /project-manager-workspace/viu/{slug}, `importType` the value in `payload.importTypes`.
 */
export const PM_VIU_SCHEMES = [
  { slug: "industri", label: "VIU Industri", importType: "BAHAN_BAKU_INDUSTRI", icon: "factory" },
  { slug: "non-industri", label: "VIU Non Industri", importType: "BAHAN_BAKU_NON_INDUSTRI", icon: "storefront" },
  { slug: "konsumsi", label: "VIU Konsumsi", importType: "BARANG_KONSUMSI", icon: "shopping_bag" },
] as const;

export type PmViuScheme = (typeof PM_VIU_SCHEMES)[number];
export type PmViuSchemeSlug = PmViuScheme["slug"];

export function viuSchemeFromSlug(slug: string | null | undefined): PmViuScheme | null {
  return PM_VIU_SCHEMES.find((scheme) => scheme.slug === slug) ?? null;
}

/**
 * The one sub menu a VIU application belongs to: the scheme of its first import type. An
 * application applies for a single import type; older records that ticked several still land in
 * exactly one sub menu — never in two.
 */
export function viuSchemeOf(importTypes: readonly string[] | null | undefined): PmViuScheme | null {
  const first = importTypes?.[0];
  return PM_VIU_SCHEMES.find((scheme) => scheme.importType === first) ?? null;
}

export function applicationMatchesViuScheme(
  verificationType: string,
  importTypes: readonly string[] | null | undefined,
  scheme: PmViuScheme,
): boolean {
  return verificationType === "VIU" && viuSchemeOf(importTypes)?.slug === scheme.slug;
}

/** The sub menu pages of every VIU scheme, in sidebar order. */
export const PM_VIU_SCHEME_PAGES = [
  { key: "dashboard", label: "Dashboard", icon: "space_dashboard", path: "" },
  { key: "applications", label: "Application List", icon: "assignment", path: "/applications" },
  { key: "reports", label: "Report", icon: "summarize", path: "/reports" },
  { key: "laporan-kemenperin", label: "Laporan Kemenperin", icon: "account_balance", path: "/laporan-kemenperin" },
] as const;

export function viuSchemeHref(scheme: PmViuScheme, path: string): string {
  return `/project-manager-workspace/viu/${scheme.slug}${path}`;
}
