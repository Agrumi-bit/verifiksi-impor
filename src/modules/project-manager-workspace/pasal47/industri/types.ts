import type { P47Application, P47Finding, P47Warehouse, Status } from "../types";

/**
 * Pelaporan Pasal 47 for VIU Bahan Baku Industri (Permenperin 27/2025). Same period, review state and
 * findings as the Barang Konsumsi report, but the subject is bahan baku/penolong for a Partner Industri:
 * HS and volume against the partner's LHVKI instead of brands, countries and prices.
 */

/** One bahan baku/penolong row of Product Information. The system holds no price or origin country for it. */
export type IndustriLine = {
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
  partnerId: string;
  partnerName: string;
};

export type IndustriPartnerUse = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  lhvki: string;
  lhvkiPath: string | null;
  lines: number;
};

/** A Partner Industri used by one or more of the period's applications. */
export type IndustriPartner = {
  id: string;
  name: string;
  nib: string;
  type: string;
  contractNumber: string;
  contractEnd: string;
  uses: IndustriPartnerUse[];
};

export type IndustriModuleKey = "rencana" | "penyimpanan" | "modal";

/** Technical Analyst's verdict per module (HS & volume vs LHVKI, Kapasitas Gudang, Kepemilikan Modal). */
export type IndustriAnalysis = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  moduleKey: IndustriModuleKey;
  module: string;
  status: Status;
  conclusion: string;
};

export type IndustriValue = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  /** Nilai impor (Rp) entered by the Technical Analyst; null when not analysed. */
  nilaiImpor: number | null;
  /** Jumlah Modal Kerja (Rp) from the Surat Pernyataan Kepemilikan Modal Kerja. */
  modalKerja: number | null;
  decision: Status;
};

export type IndustriDataset = {
  period: { from: string; to: string };
  generatedAt: string;
  applications: P47Application[];
  lines: IndustriLine[];
  partners: IndustriPartner[];
  analysis: IndustriAnalysis[];
  warehouses: P47Warehouse[];
  values: IndustriValue[];
  findings: P47Finding[];
};
