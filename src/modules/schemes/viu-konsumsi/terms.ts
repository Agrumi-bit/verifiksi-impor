import type { SchemeTerms } from "../types";
import { VIU_KONSUMSI_LEGAL_BASIS as L } from "./legal-basis";

/** KBLI perdagangan besar — Pasal 37 ayat (2) huruf c angka 2 huruf b). */
export const VIU_KONSUMSI_KBLI = ["46411", "46412", "46414", "46499", "46691", "46699", "46795", "46100"] as const;

export const VIU_KONSUMSI_TERMS: SchemeTerms = {
  id: "VIU_KONSUMSI",
  family: "VIU",
  verificationName: "Verifikasi Importir Umum (VIU) untuk Impor Produk Tekstil sebagai Barang Konsumsi",
  shortLabel: "VIU Barang Konsumsi",
  reportName: "Laporan Hasil Verifikasi Importir Umum (LHVIU)",
  reportAbbreviation: "LHVIU",
  subject: "Perusahaan API-U",
  importPurpose: "Impor Produk Tekstil untuk digunakan sebagai barang konsumsi",
  subjectBasis: L.subject,
  requirementBasis: L.requirement,
  verificationBasis: L.verification,
  reportContentBasis: L.reportContent,
  validity: { text: "1 (satu) tahun sejak diterbitkan", basis: L.validity },
  requiredLocationTypes: ["KANTOR", "GUDANG"],
  allowedKbli: VIU_KONSUMSI_KBLI,
  forbiddenTerms: [
    "Verifikasi Kemampuan Industri",
    "VKI",
    "LHVKI",
    "API-P",
    "pabrik",
    "kemampuan produksi",
    "bahan baku",
    "bahan penolong",
    "Perusahaan Non Industri",
    "Partner Industri",
    "Mitra Industri",
  ],
};
