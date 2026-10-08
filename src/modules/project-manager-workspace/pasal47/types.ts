/**
 * Pelaporan Pasal 47 (Permenperin 27/2025) — the VIU Barang Konsumsi report dataset the Project
 * Manager works from. Built server-side from real applications (dataset.server.ts); every derived
 * view (KPIs, rankings, charts, export) is computed client-side from this one shape (derive.ts).
 */

export type Tone = "ok" | "warn" | "bad" | "na";
export type Status = { label: string; tone: Tone };

export type P47Place = {
  address: string;
  city: string;
  province: string;
  /** "Milik Sendiri" | "Sewa" | "" when the applicant did not say. */
  ownership: string;
};

export type P47Application = {
  id: string;
  applicationNumber: string;
  companyId: string | null;
  company: string;
  nib: string;
  /** KBLI Utama. */
  kbli: { code: string; description: string }[];
  /** Tanggal Pengajuan, YYYY-MM-DD. */
  submittedAt: string;
  status: string;
  /** Laporan Hasil VIU PDF uploaded by the Project Manager; the system holds no LHVIU number or validity. */
  lhviu: { fileName: string; uploadedAt: string; path: string } | null;
  kantor: P47Place | null;
  gudang: P47Place[];
};

export type P47Line = {
  id: string;
  applicationId: string;
  applicationNumber: string;
  company: string;
  productName: string;
  brandId: string;
  brandName: string;
  hs: string;
  hsDescription: string;
  kelompok: string;
  subKelompok: string;
  komoditas: string;
  countries: string[];
  quantity: number;
  stock: number;
  unit: string;
  price: number;
  currency: string;
  total: number;
};

/** One application's use of one brand (role, appointment basis, document completeness). */
export type P47BrandUse = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  role: string;
  basis: string;
  docStatus: Status;
  missingDocuments: string[];
};

export type P47Brand = {
  id: string;
  name: string;
  owner: string;
  ownerCountry: string;
  representative: string;
  evidenceType: string;
  registrationNumber: string;
  registrationDate: string;
  expiryDate: string;
  classes: string[];
  evidencePath: string | null;
  uses: P47BrandUse[];
};

export type P47Technical = {
  id: string;
  applicationId: string;
  applicationNumber: string;
  company: string;
  brandName: string;
  subKelompok: string;
  documentType: string;
  laboratory: string;
  reportNumber: string;
  issueDate: string;
  validUntil: string;
  /** Surat Pernyataan Label Berbahasa Indonesia for the application. */
  labelStatement: Status;
  verification: string;
  status: Status;
};

export type P47Warehouse = {
  id: string;
  applicationId: string;
  applicationNumber: string;
  company: string;
  place: P47Place;
  /** Kapasitas Gudang entered by the Technical Analyst (penyimpanan module); unit as entered. */
  capacity: number | null;
  /** Stok Terkini entered by the Technical Analyst, same unit as capacity. */
  analystStock: number | null;
  /** Stock declared per product line, per unit — never summed across units. */
  declaredStock: Record<string, number>;
  analystDecision: string;
};

export type P47Value = {
  applicationId: string;
  applicationNumber: string;
  company: string;
  currency: string;
  plan: number;
  /** Jumlah Modal Kerja (Rp) from the Surat Pernyataan Kepemilikan Modal Kerja. */
  modalKerja: number | null;
  /** Rupiah per unit of `currency` entered by the Technical Analyst (IDR = 1). */
  rate: number | null;
  decision: Status;
};

export type P47Finding = {
  /** Stable key — materiality is stored per key. */
  key: string;
  applicationId: string;
  applicationNumber: string;
  company: string;
  source: "Survei Lapangan" | "Verifikasi Dokumen" | "Analisis Teknis" | "Verifikasi Produk";
  area: string;
  text: string;
  severity: "Minor" | "Major" | "Critical";
  status: Status;
  followUp: string;
  pic: string;
};

export type Materiality = "MATERIAL" | "NON_MATERIAL" | "NEEDS_REVIEW";
export type ReportStatus = "DRAFT" | "REVIEWED" | "APPROVED";

export type P47Report = {
  status: ReportStatus;
  pmNote: string;
  materiality: Record<string, Materiality>;
  updatedAt: string | null;
  updatedByName: string | null;
};

export type P47Dataset = {
  period: { from: string; to: string };
  generatedAt: string;
  applications: P47Application[];
  lines: P47Line[];
  brands: P47Brand[];
  technical: P47Technical[];
  warehouses: P47Warehouse[];
  values: P47Value[];
  findings: P47Finding[];
};
