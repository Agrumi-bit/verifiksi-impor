import type { P47Application, P47Finding, P47Place, Status } from "../types";

/**
 * Pelaporan Pasal 47 for Verifikasi Kemampuan Industri (VKI, Permenperin 27/2025 Pasal 25 and 30–32):
 * the Perusahaan API-P / Perusahaan Industri, its products, licensed capacity and production, the
 * bahan baku/penolong it needs (from domestic sources and imports), machines, workforce, electricity,
 * sales, the Technical Analyst's verdicts and the findings of the period.
 */

type Ref = { applicationId: string; applicationNumber: string; company: string };

/** A VKI application: the shared company/location profile plus its pabrik (factory) locations; `lhviu` holds the LHVKI. */
export type VkiApplication = P47Application & { pabrik: P47Place[] };

/** A product the factory makes, with its production and sales per year. */
export type VkiProduct = Ref & {
  id: string;
  category: string;
  name: string;
  hs: string;
  hsDescription: string;
  /** Produksi tahun sebelumnya and rencana produksi per tahun; null when not filled. */
  producedLastYear: number | null;
  plannedProduction: number | null;
  productionUnit: string;
  /** Penjualan dalam negeri / luar negeri; null when not filled. */
  salesDomestic: number | null;
  salesExport: number | null;
  exportDestination: string;
  salesUnit: string;
};

/** Licensed (izin) installed production capacity, per KBLI / jenis produk. */
export type VkiCapacity = Ref & { product: string; kbli: string; basis: string; capacity: number | null; unit: string };

/** A bahan baku/penolong the factory uses, with stock and planned need from domestic sources and imports. */
export type VkiMaterial = Ref & {
  id: string;
  name: string;
  hs: string;
  hsDescription: string;
  /** "Bahan Baku" | "Bahan Penolong" | "" from the product–material conversion rows. */
  category: string;
  use: string;
  stock: number | null;
  needDomestic: number | null;
  needImport: number | null;
  needTotal: number | null;
  importCountry: string;
  unit: string;
};

export type VkiMachine = Ref & { name: string; brand: string; year: string; count: number; process: string; capacity: number | null; capacityUnit: string; condition: string; power: number | null; powerUnit: string };

export type VkiWorkforce = Ref & { category: string; count: number };

export type VkiElectricity = Ref & { month: string; kwh: number | null; nominal: number | null };

export type VkiModuleKey = "listrik" | "kapasitas" | "bahanbaku";

/** Technical Analyst's verdict per module: Energi Listrik, Kapasitas Produksi, Kebutuhan Bahan Baku. */
export type VkiAnalysis = Ref & { moduleKey: VkiModuleKey; module: string; status: Status; conclusion: string };

export type VkiDataset = {
  period: { from: string; to: string };
  generatedAt: string;
  applications: VkiApplication[];
  products: VkiProduct[];
  capacities: VkiCapacity[];
  materials: VkiMaterial[];
  machines: VkiMachine[];
  workforce: VkiWorkforce[];
  electricity: VkiElectricity[];
  analysis: VkiAnalysis[];
  findings: P47Finding[];
};
