import { financialEvidence, modalKerjaStatement } from "../shared/financial-documents";
import { viuCommonDocuments } from "../shared/viu-common-documents";
import type { SchemeDocumentDef } from "../types";
import { VIU_KONSUMSI_LEGAL_BASIS as L } from "./legal-basis";

/**
 * Brand relationship documents (Merk module codes, merk/document-requirements.ts). Which of them a
 * brand actually needs depends on the applicant's role — that logic stays in getRequiredBrandDocuments;
 * this table only gives each code its sifat + legal basis for THIS scheme.
 */
const BRAND_RELATIONSHIP_DOCS: SchemeDocumentDef[] = [
  ["official_representative_appointment", "Bukti Penunjukan sebagai Perwakilan Resmi", "WAJIB", L.penunjukanPerwakilanResmi],
  ["license_or_sublicense", "Perjanjian Lisensi / Sublisensi", "WAJIB", L.perjanjianLisensi],
  ["license_registration", "Bukti Pencatatan Perjanjian Lisensi / Sublisensi", "WAJIB", L.pencatatanLisensi],
  ["official_rep_deed", "Akta Pendirian Perwakilan Resmi", "WAJIB", L.aktaPerwakilanResmi],
  ["official_rep_deed_amendment", "Akta Perubahan Perwakilan Resmi", "PENDUKUNG_JIKA_ADA", L.aktaPerwakilanResmi],
  ["official_rep_business_license", "Perizinan Berusaha Perwakilan Resmi", "WAJIB", L.perizinanPerwakilanResmi],
  ["importer_appointment", "Surat Penunjukan Importir", "WAJIB", L.penunjukanImportir],
  ["importer_appointment_from_brand_owner", "Surat Penunjukan Importir dari Pemilik Merek", "WAJIB", L.penunjukanImportirPemilikMerek],
].map(([code, label, sifat, legalBasis]) => ({
  id: `brand-rel-${code as string}`,
  keyPatterns: [`konsumsi-brand:{brandId}:rel:${code as string}`],
  label: label as string,
  section: "merek" as const,
  sifat: sifat as SchemeDocumentDef["sifat"],
  legalBasis: legalBasis as SchemeDocumentDef["legalBasis"],
}));

/** VIU Barang Konsumsi — Permenperin 27/2025 Pasal 37 ayat (2) huruf c, ayat (3)–(9). */
export const VIU_KONSUMSI_DOCUMENTS: readonly SchemeDocumentDef[] = [
  ...viuCommonDocuments(L),
  modalKerjaStatement("konsumsi-financial", L.modalKerja),
  ...financialEvidence("konsumsi-financial", "PENDUKUNG_JIKA_ADA", L.buktiFinansialPendukung),
  {
    id: "brand-evidence",
    keyPatterns: ["konsumsi-brand:{brandId}:evidence"],
    label: "Sertifikat Merek / Tanda Pendaftaran Merek",
    section: "merek",
    sifat: "WAJIB",
    legalBasis: L.merek,
  },
  ...BRAND_RELATIONSHIP_DOCS,
  {
    id: "uji-mutu",
    keyPatterns: ["konsumsi-qt:{brandId}:{commodityGroupId}"],
    label: "Sertifikat Hasil Uji Mutu",
    section: "uji-mutu",
    sifat: "WAJIB",
    legalBasis: L.ujiMutu,
  },
  {
    id: "label-statement",
    keyPatterns: ["konsumsi-label:statement"],
    label: "Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia",
    section: "label",
    sifat: "WAJIB",
    legalBasis: L.label,
  },
  {
    id: "label-documentation",
    keyPatterns: ["konsumsi-label:documentation"],
    label: "Dokumentasi Label Produk",
    section: "label",
    sifat: "WAJIB",
    legalBasis: L.labelDokumentasi,
  },
];
