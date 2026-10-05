import type { SchemeTerms } from "../types";
import { VKI_LEGAL_BASIS as L } from "./legal-basis";

export const VKI_TERMS: SchemeTerms = {
  id: "VKI",
  family: "VKI",
  verificationName: "Verifikasi Kemampuan Industri (VKI)",
  shortLabel: "VKI",
  reportName: "Laporan Hasil Verifikasi Kemampuan Industri (LHVKI)",
  reportAbbreviation: "LHVKI",
  subject: "Perusahaan API-P atau Perusahaan Industri",
  importPurpose:
    "Impor Tekstil dan/atau Produk Tekstil untuk digunakan sebagai bahan baku dan/atau bahan penolong produksinya sendiri",
  subjectBasis: L.subject,
  requirementBasis: L.requirement,
  verificationBasis: L.verification,
  reportContentBasis: L.reportContent,
  validity: { text: "3 (tiga) tahun sejak diterbitkan", basis: L.validity },
  requiredLocationTypes: ["KANTOR", "PABRIK"],
  forbiddenTerms: [
    "Verifikasi Importir Umum",
    "VIU",
    "LHVIU",
    "barang konsumsi",
    "uji mutu",
    "label berbahasa Indonesia",
    "modal kerja",
    "Perusahaan Non Industri",
    "Perwakilan Resmi",
  ],
};
