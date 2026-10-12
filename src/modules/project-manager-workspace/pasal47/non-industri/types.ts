import type { P47Application, P47Finding, Status } from "../types";

/**
 * Pelaporan Pasal 47 for VIU Bahan Baku/Penolong Perusahaan Non Industri (Permenperin 27/2025, Pasal 37
 * ayat (2) huruf b, LHVIU Pasal 39 ayat (4)). Same period rule, review state and findings as the Barang
 * Konsumsi report; the subject is bahan baku/penolong supplied to a Perusahaan Non Industri mitra.
 * The system holds no price, origin country or brand for these goods, so those analyses are absent.
 */

/** One bahan baku/penolong row of Product Information. */
export type NonIndustriLine = {
  id: string;
  applicationId: string;
  applicationNumber: string;
  company: string;
  material: string;
  hs: string;
  hsDescription: string;
  /** Rencana kebutuhan as entered; 0 when the applicant left it empty. */
  quantity: number;
  unit: string;
  intendedUse: string;
};

export type NonIndustriModuleKey = "kebutuhanNonIndustri" | "penyimpanan" | "modal";

/** Technical Analyst's verdict per module: Kebutuhan Mitra Non Industri, Kapasitas Gudang, Kepemilikan Modal. */
export type NonIndustriAnalysis = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  moduleKey: NonIndustriModuleKey;
  module: string;
  status: Status;
  conclusion: string;
};

/** Kebutuhan Mitra Non Industri (TA module): contract need vs API-U stock and requested volume. */
export type NonIndustriNeed = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  hs: string;
  /** Kebutuhan mitra sesuai kontrak (unit/tahun); null when not entered. */
  contractNeed: number | null;
  stock: number | null;
  requested: number | null;
  status: Status;
};

/** Gudang of an application: surveyor's measurements and the Technical Analyst's Kapasitas Gudang check. */
export type NonIndustriWarehouse = {
  id: string;
  applicationId: string;
  applicationNumber: string;
  company: string;
  city: string;
  province: string;
  ownership: string;
  /** Luas total (m²) measured by the surveyor. */
  area: number | null;
  /** Kapasitas efektif (m³) from the surveyor's gudang report. */
  capacity: number | null;
  /** Technical Analyst (first gudang of the application only): kapasitas, stok, rencana impor in m³. */
  analystCapacity: number | null;
  analystStock: number | null;
  analystPlan: number | null;
  analystDecision: Status;
};

export type NonIndustriValue = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  /** Nilai impor (Rp) entered by the Technical Analyst; null when not analysed. */
  nilaiImpor: number | null;
  /** Jumlah Modal Kerja (Rp) from the Surat Pernyataan Kepemilikan Modal Kerja. */
  modalKerja: number | null;
  /** Titles of the supporting financial evidence the applicant attached (Bukti Kemampuan Finansial). */
  evidence: string[];
  decision: Status;
};

export type NonIndustriDataset = {
  period: { from: string; to: string };
  generatedAt: string;
  applications: P47Application[];
  lines: NonIndustriLine[];
  needs: NonIndustriNeed[];
  analysis: NonIndustriAnalysis[];
  warehouses: NonIndustriWarehouse[];
  values: NonIndustriValue[];
  findings: P47Finding[];
};
