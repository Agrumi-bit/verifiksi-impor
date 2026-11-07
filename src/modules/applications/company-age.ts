import type { CompanyAge } from "@/modules/company/schema";

/**
 * Umur Perizinan Berusaha (Pasal 30 ayat (2) huruf b angka 7): 3 tahun atau lebih → bukti pembayaran pajak
 * 3 tahun terakhir; kurang dari 3 tahun → Surat Keterangan Terdaftar (SKT) pajak. Derived from the NIB's
 * issue date at the reference date (the Tanggal Pengajuan, or today) when the applicant/company hasn't
 * stated it. Returns null without a usable NIB date.
 */
export function deriveCompanyAge(nibIssueDate: string | Date | null | undefined, referenceDate: string | Date | null | undefined = new Date()): CompanyAge | null {
  if (!nibIssueDate) return null;
  const nib = new Date(nibIssueDate);
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  if (Number.isNaN(nib.getTime()) || Number.isNaN(ref.getTime())) return null;
  const threeYears = new Date(nib);
  threeYears.setFullYear(threeYears.getFullYear() + 3);
  return ref >= threeYears ? "OVER_3" : "UNDER_3";
}

export const COMPANY_AGE_LABELS: Record<CompanyAge, { label: string; desc: string }> = {
  OVER_3: { label: "3 tahun atau lebih", desc: "Lampirkan bukti pembayaran pajak 3 (tiga) tahun terakhir" },
  UNDER_3: { label: "Kurang dari 3 tahun", desc: "Lampirkan Surat Keterangan Terdaftar (SKT) pajak" },
};
