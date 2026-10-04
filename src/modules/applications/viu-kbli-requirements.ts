/**
 * KBLI an API-U company must hold for each VIU application type — Pasal 26 and Pasal 37
 * Permenperin No. 27 Tahun 2025. A company qualifies for a type when any of its registered KBLI
 * (Utama or Pendukung) is in that type's list; the KBLI version doesn't matter here.
 *
 * Keys mirror `IMPORT_TYPES` in ./schema.ts — kept as plain literals so this module has no
 * import from schema.ts, which itself imports this file for its submit rules.
 */
export const VIU_REQUIRED_KBLI = {
  BAHAN_BAKU_INDUSTRI: ["46411", "46414", "46699", "46100", "45301"],
  BAHAN_BAKU_NON_INDUSTRI: ["46411", "46414", "46100"],
  BARANG_KONSUMSI: ["46411", "46412", "46414", "46499", "46691", "46699", "46795", "46100"],
} as const satisfies Record<string, readonly string[]>;

type ViuImportType = keyof typeof VIU_REQUIRED_KBLI;

type KbliLike = { code: string };

/** The company's KBLI codes that satisfy `importType`'s requirement, in the requirement's order. */
export function matchingViuKbli(importType: ViuImportType, kbliEntries: readonly KbliLike[] | null | undefined): string[] {
  const held = new Set((kbliEntries ?? []).map((entry) => entry.code.trim()));
  return VIU_REQUIRED_KBLI[importType].filter((code) => held.has(code));
}

/** The requirement only applies to API-U companies (API-P companies apply for VKI, not VIU). */
export function isViuImportTypeAllowed(
  importType: ViuImportType,
  companyApiType: string | null | undefined,
  kbliEntries: readonly KbliLike[] | null | undefined,
): boolean {
  if (companyApiType !== "API-U") return true;
  return matchingViuKbli(importType, kbliEntries).length > 0;
}

/** First selected type the company doesn't qualify for, or undefined when every selection is allowed. */
export function findDisallowedViuImportType(
  importTypes: readonly string[],
  companyApiType: string | null | undefined,
  kbliEntries: readonly KbliLike[] | null | undefined,
): ViuImportType | undefined {
  return importTypes.find(
    (type): type is ViuImportType =>
      type in VIU_REQUIRED_KBLI && !isViuImportTypeAllowed(type as ViuImportType, companyApiType, kbliEntries),
  );
}

const VIU_IMPORT_TYPE_SHORT_LABELS: Record<ViuImportType, string> = {
  BAHAN_BAKU_INDUSTRI: "Bahan Baku/Penolong Perusahaan Industri",
  BAHAN_BAKU_NON_INDUSTRI: "Bahan Baku/Penolong Perusahaan Non Industri",
  BARANG_KONSUMSI: "Produk Tekstil sebagai Barang Konsumsi",
};

export function viuKbliRequirementMessage(importType: ViuImportType): string {
  return `Jenis permohonan VIU API-U – ${VIU_IMPORT_TYPE_SHORT_LABELS[importType]} mensyaratkan perusahaan memiliki salah satu KBLI: ${VIU_REQUIRED_KBLI[importType].join(", ")}.`;
}
