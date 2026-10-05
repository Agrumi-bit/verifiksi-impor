import type { SchemeTerms } from "../types";
import { VIU_INDUSTRI_LEGAL_BASIS as L } from "./legal-basis";

/** KBLI perdagangan besar — Pasal 37 ayat (2) huruf a angka 2 huruf b). */
export const VIU_INDUSTRI_KBLI = ["46411", "46414", "46699", "46100", "45301"] as const;

export const VIU_INDUSTRI_TERMS: SchemeTerms = {
  id: "VIU_BAHAN_BAKU_INDUSTRI",
  family: "VIU",
  verificationName:
    "Verifikasi Importir Umum (VIU) untuk Impor Tekstil dan/atau Produk Tekstil sebagai Bahan Baku dan/atau Bahan Penolong bagi Perusahaan Industri",
  shortLabel: "VIU Bahan Baku Industri",
  reportName: "Laporan Hasil Verifikasi Importir Umum (LHVIU)",
  reportAbbreviation: "LHVIU",
  subject: "Perusahaan API-U",
  importPurpose:
    "Impor Tekstil dan/atau Produk Tekstil untuk digunakan sebagai bahan baku dan/atau bahan penolong bagi Perusahaan Industri",
  subjectBasis: L.subject,
  requirementBasis: L.requirement,
  verificationBasis: L.verification,
  reportContentBasis: L.reportContent,
  validity: { text: "1 (satu) tahun sejak diterbitkan", basis: L.validity },
  requiredLocationTypes: ["KANTOR", "GUDANG"],
  allowedKbli: VIU_INDUSTRI_KBLI,
  // "LHVKI" is allowed here: the partner Perusahaan Industri's LHVKI is a requirement (huruf g).
  forbiddenTerms: [
    "VKI",
    "API-P",
    "kemampuan produksi Pemohon",
    "pabrik Pemohon",
    "barang konsumsi",
    "uji mutu",
    "label berbahasa Indonesia",
    "Perwakilan Resmi",
    "Perusahaan Non Industri",
  ],
};
