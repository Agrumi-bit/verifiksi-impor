import { resolveScheme } from "@/modules/schemes";

/**
 * Wording a survey report prints about "the verification this report is part of" — it must follow the
 * application's own scheme (VKI vs VIU, and for VIU the import type), never hard-code VKI. The names
 * come from the per-scheme terms in src/modules/schemes.
 */

export type ReportSchemeSource = {
  verificationType?: string | null;
  importTypes?: readonly string[] | null;
};

/** e.g. "Verifikasi Kemampuan Industri (VKI)" or "Verifikasi Importir Umum (VIU) untuk Impor Produk
 * Tekstil sebagai Barang Konsumsi"; several VIU import types are joined with "; ". */
export function reportVerificationName(source: ReportSchemeSource): string {
  const { terms } = resolveScheme(source);
  if (terms.length > 0) return terms.map((t) => t.verificationName).join("; ");
  // The application has no resolvable scheme (e.g. a VIU without import types): keep the family right.
  if (source.verificationType === "VIU") return "Verifikasi Importir Umum (VIU)";
  if (source.verificationType === "VKI") return "Verifikasi Kemampuan Industri (VKI)";
  return "proses verifikasi";
}

/** Cover footer: "VKI", "VIU", or the neutral "VKI / VIU" when the family is unknown. */
export function reportFamilyLabel(source: ReportSchemeSource): string {
  const { family } = resolveScheme(source);
  if (family) return family;
  return source.verificationType === "VIU" || source.verificationType === "VKI" ? source.verificationType : "VKI / VIU";
}
