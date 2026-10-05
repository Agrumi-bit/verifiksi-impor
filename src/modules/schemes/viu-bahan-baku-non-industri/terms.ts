import type { SchemeTerms } from "../types";
import { VIU_NON_INDUSTRI_LEGAL_BASIS as L } from "./legal-basis";

/** KBLI perdagangan besar — Pasal 37 ayat (2) huruf b angka 2 huruf b). */
export const VIU_NON_INDUSTRI_KBLI = ["46411", "46414", "46100"] as const;

export const VIU_NON_INDUSTRI_TERMS: SchemeTerms = {
  id: "VIU_BAHAN_BAKU_NON_INDUSTRI",
  family: "VIU",
  verificationName:
    "Verifikasi Importir Umum (VIU) untuk Impor Tekstil dan/atau Produk Tekstil sebagai Bahan Baku dan/atau Bahan Penolong bagi Perusahaan Non Industri",
  shortLabel: "VIU Bahan Baku Non Industri",
  reportName: "Laporan Hasil Verifikasi Importir Umum (LHVIU)",
  reportAbbreviation: "LHVIU",
  subject: "Perusahaan API-U",
  importPurpose:
    "Impor Tekstil dan/atau Produk Tekstil untuk digunakan sebagai bahan baku dan/atau bahan penolong bagi Perusahaan Non Industri",
  subjectBasis: L.subject,
  requirementBasis: L.requirement,
  verificationBasis: L.verification,
  reportContentBasis: L.reportContent,
  validity: { text: "1 (satu) tahun sejak diterbitkan", basis: L.validity },
  requiredLocationTypes: ["KANTOR", "GUDANG"],
  allowedKbli: VIU_NON_INDUSTRI_KBLI,
  forbiddenTerms: [
    "Verifikasi Kemampuan Industri",
    "VKI",
    "LHVKI",
    "API-P",
    "pabrik",
    "kemampuan produksi",
    "barang konsumsi",
    "uji mutu",
    "label berbahasa Indonesia",
    "Perwakilan Resmi",
    "Partner Industri",
  ],
};
