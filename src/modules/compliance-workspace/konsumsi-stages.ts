import { computeTrademarkEvidenceValidity, trademarkEvidenceAsOf } from "@/modules/applications/viu-schemes/konsumsi/business-rules";
import { qualityTestSubmissionWindow } from "@/modules/applications/viu-schemes/konsumsi/quality-test-window";
import type { MerkEvidenceType } from "@/modules/merk/schema";
import { PRODUCT_VERIFICATION_STATUS_LABELS, type ProductVerificationStatusValue } from "@/modules/verifikator-workspace/status";
import { TECHNICAL_MODULE_LABELS, TECHNICAL_MODULE_STATUS_LABELS, type TechnicalModuleStatusValue } from "@/modules/technical-analyst-workspace/status";
import type { DocumentRow } from "./document-matrix";

/**
 * Tahap 4–8 of the Compliance case view for VIU Konsumsi (pure): Merek & Hubungan Importir, Rencana
 * Impor, Stok Terkini, Uji Mutu and Pernyataan Label. Every verdict shown is one the source workspace
 * recorded (Verifikator product/document status, Technical Analyst module status) or one the
 * production rules already compute (9-month trademark evidence rule, 6-month quality-test window).
 * Compliance adds no rule of its own.
 */

export const MEREK_CATEGORIES = ["Dokumen Merek"];
export const UJI_MUTU_CATEGORIES = ["Sertifikat Uji Mutu"];
export const LABEL_CATEGORIES = ["Dokumen Label"];
export const KONSUMSI_STAGE_CATEGORIES = [...MEREK_CATEGORIES, ...UJI_MUTU_CATEGORIES, ...LABEL_CATEGORIES];

export type Tone = "green" | "orange" | "red" | "slate";

export type BrandInput = {
  brandId: string;
  brandName: string;
  ownerName: string | null;
  ownerLocation: "DOMESTIC" | "FOREIGN" | null;
  ownerCountry: string | null;
  evidenceType: MerkEvidenceType | null;
  evidenceTypeLabel: string;
  registrationNumber: string | null;
  registrationDate: string | null;
  registrationExpiryDate: string | null;
  applicantRole: string | null;
  appointedBy: string | null;
  requiredDocuments: string[];
};

export type ProductInput = {
  id: string;
  brandId: string;
  brandName: string;
  productName: string;
  kelompok: string | null;
  subKelompok: string | null;
  commodityGroupId: string;
  hsCode: string;
  hsDescription: string | null;
  quantity: number;
  stock: number;
  unit: string | null;
  unitPrice: number;
  currency: string;
};

export type CertificateInput = {
  brandId: string;
  commodityGroupId: string;
  subKelompok: string | null;
  certificateNumber: string;
  laboratory: string;
  issueDate: string | null;
  validUntil: string | null;
  filePath: string | null;
};

export type ModuleDecisionInput = { status: TechnicalModuleStatusValue; keterangan: string | null; kesimpulan: string | null };

export type KonsumsiStageInput = {
  submittedAt: string | null;
  brands: BrandInput[];
  products: ProductInput[];
  certificates: CertificateInput[];
  productStatuses: Record<string, { status: ProductVerificationStatusValue; note: string | null } | undefined>;
  modules: Partial<Record<"stokKonsumsi" | "penyimpanan" | "modal", ModuleDecisionInput>>;
  documents: DocumentRow[];
  warehouses: string[];
};

const PRODUCT_TONES: Record<ProductVerificationStatusValue, Tone> = { PENDING: "slate", VERIFIED: "green", NEED_REVISION: "orange", REJECTED: "red" };
const MODULE_TONES: Record<TechnicalModuleStatusValue, Tone> = { PENDING: "slate", SESUAI: "green", SESUAI_CATATAN: "orange", TIDAK_SESUAI: "red" };

export type Verdict = { label: string; tone: Tone };

export function productVerdict(input: KonsumsiStageInput, productId: string): Verdict & { note: string | null } {
  const entry = input.productStatuses[productId];
  const status = entry?.status ?? "PENDING";
  return { label: PRODUCT_VERIFICATION_STATUS_LABELS[status], tone: PRODUCT_TONES[status], note: entry?.note ?? null };
}

export function moduleVerdict(decision: ModuleDecisionInput | undefined): Verdict {
  const status = decision?.status ?? "PENDING";
  return { label: TECHNICAL_MODULE_STATUS_LABELS[status], tone: MODULE_TONES[status] };
}

/** Matrix rows of one checklist category, in checklist order. */
function documentsOf(input: KonsumsiStageInput, prefix: string): DocumentRow[] {
  return input.documents.filter((row) => row.key.startsWith(prefix));
}

function day(value: string | null): string | null {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

// ─── Tahap 4 — Merek & Hubungan Importir ──────────────────────────────────────────────

export type BrandValidity = Verdict & { detail: string | null };

/**
 * The trademark evidence as of the application's Tanggal Pengajuan: the production 9-month rule for a
 * Tanda Pendaftaran Merek (Pasal 37 ayat (7)), and the registration's own Masa Berlaku.
 */
export function brandValidity(brand: BrandInput, submittedAt: string | null): BrandValidity {
  if (!brand.evidenceType) return { label: "Tidak ada bukti merek", tone: "red", detail: null };
  const asOf = trademarkEvidenceAsOf(submittedAt) ?? new Date();
  const nineMonths = computeTrademarkEvidenceValidity(brand.evidenceType, brand.registrationDate, asOf);
  if (nineMonths.status === "EXPIRED_9_MONTH_LIMIT") {
    return { label: "Melewati batas 9 bulan", tone: "red", detail: nineMonths.expiryDate ? `Batas ${day(nineMonths.expiryDate)}` : "Tanggal registrasi kosong" };
  }
  const expiry = day(brand.registrationExpiryDate);
  const asOfDay = asOf.toISOString().slice(0, 10);
  if (expiry && expiry < asOfDay) return { label: "Kedaluwarsa saat pengajuan", tone: "red", detail: `Berlaku s.d. ${expiry}` };
  if (nineMonths.status === "VALID_WITHIN_9_MONTHS") return { label: "Berlaku (≤ 9 bulan)", tone: "green", detail: `Batas ${day(nineMonths.expiryDate)}` };
  return { label: "Berlaku", tone: "green", detail: expiry ? `s.d. ${expiry}` : null };
}

export type BrandRelationRow = {
  brand: BrandInput;
  relation: string;
  appointedBy: string;
  documents: DocumentRow[];
  completeness: { uploaded: number; required: number };
  status: Verdict;
};

/** One row per brand entry: the relationship the applicant declared and how its documents stand. */
export function buildMerekStage(input: KonsumsiStageInput) {
  const relations: BrandRelationRow[] = input.brands.map((brand) => {
    const documents = documentsOf(input, `konsumsi-brand:${brand.brandId}:`);
    const relationshipDocs = documents.filter((row) => row.key.includes(":rel:"));
    const uploaded = relationshipDocs.filter((row) => row.document).length;
    return {
      brand,
      relation: brand.applicantRole ?? "—",
      appointedBy: brand.appointedBy ?? "—",
      documents,
      completeness: { uploaded, required: brand.requiredDocuments.length },
      status: documentsVerdict(documents),
    };
  });
  return {
    relations,
    brands: input.brands.map((brand) => ({ brand, validity: brandValidity(brand, input.submittedAt), status: documentsVerdict(documentsOf(input, `konsumsi-brand:${brand.brandId}:evidence`)) })),
    matrix: input.brands.flatMap((brand) => documentsOf(input, `konsumsi-brand:${brand.brandId}:`).map((row) => ({ brandName: brand.brandName, relation: brand.applicantRole ?? "—", row }))),
  };
}

/** Worst recorded status across a set of documents (Ditolak > Perlu Revisi > Belum > Terverifikasi). */
export function documentsVerdict(rows: DocumentRow[]): Verdict {
  if (rows.length === 0) return { label: "Tidak ada dokumen", tone: "slate" };
  if (rows.some((row) => row.status === "REJECTED" || row.status === "EXPIRED")) return { label: "Ditolak / Kedaluwarsa", tone: "red" };
  if (rows.some((row) => row.status === "NEED_REVISION")) return { label: "Perlu Revisi", tone: "orange" };
  if (rows.some((row) => row.status === "NOT_YET_VERIFIED")) return { label: "Belum Diverifikasi", tone: "slate" };
  return { label: "Terverifikasi", tone: "green" };
}

// ─── Tahap 5 — Rencana Impor ──────────────────────────────────────────────────────────

/** Totals per currency — products in different currencies are never summed together. */
export function totalsByCurrency(products: ProductInput[], amount: (product: ProductInput) => number): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const product of products) totals.set(product.currency, (totals.get(product.currency) ?? 0) + amount(product));
  return [...totals].map(([currency, total]) => ({ currency, total }));
}

export function buildRencanaImporStage(input: KonsumsiStageInput) {
  const rows = input.products.map((product) => ({ product, total: product.quantity * product.unitPrice, verdict: productVerdict(input, product.id) }));
  const verified = rows.filter((row) => row.verdict.tone === "green").length;
  return {
    rows,
    totals: totalsByCurrency(input.products, (product) => product.quantity * product.unitPrice),
    hsCount: new Set(input.products.map((product) => product.hsCode)).size,
    checks: [
      {
        parameter: "Data produk per HS (merek, HS Code, jumlah, harga)",
        object: `${input.products.length} produk`,
        result: `${verified} dari ${input.products.length} produk Verified oleh Verifikator`,
        verdict: rows.length === 0 ? { label: "Tidak ada produk", tone: "slate" as Tone } : verified === rows.length ? { label: "Sesuai", tone: "green" as Tone } : productsWorst(rows.map((row) => row.verdict)),
        type: "Wajib",
        regulation: "Pasal 37 ayat (2) huruf c angka 2",
      },
      moduleCheck(input, "stokKonsumsi", "Pasal 39 ayat (5) huruf d–f"),
      moduleCheck(input, "penyimpanan", "—"),
    ],
  };
}

function productsWorst(verdicts: Verdict[]): Verdict {
  return verdicts.find((v) => v.tone === "red") ?? verdicts.find((v) => v.tone === "orange") ?? { label: "Belum Diperiksa", tone: "slate" };
}

function moduleCheck(input: KonsumsiStageInput, key: "stokKonsumsi" | "penyimpanan" | "modal", regulation: string) {
  const decision = input.modules[key];
  return {
    parameter: TECHNICAL_MODULE_LABELS[key],
    object: "Analisis Teknis",
    result: decision?.kesimpulan || decision?.keterangan || "Belum dianalisis",
    verdict: moduleVerdict(decision),
    type: "Analisis Teknis",
    regulation,
  };
}

// ─── Tahap 6 — Stok Terkini ───────────────────────────────────────────────────────────

export function buildStokStage(input: KonsumsiStageInput) {
  const stocked = input.products.filter((product) => product.stock > 0).length;
  return {
    rows: input.products.map((product) => ({ product, verdict: productVerdict(input, product.id) })),
    warehouses: input.warehouses,
    stocked,
    check: moduleCheck(input, "stokKonsumsi", "Pasal 39 ayat (5) huruf d–f"),
  };
}

// ─── Tahap 7 — Uji Mutu ───────────────────────────────────────────────────────────────

export type UjiMutuRow = {
  key: string;
  brandName: string;
  kelompok: string | null;
  subKelompok: string | null;
  hsCodes: string[];
  certificate: CertificateInput | null;
  window: Verdict & { detail: string };
  document: DocumentRow | null;
};

/**
 * One row per Merek × Sub Kelompok the products fall in — the level Pasal 37 requires a certificate
 * for. The age shown is the production 6-month submission window, judged at Tanggal Pengajuan.
 */
export function buildUjiMutuStage(input: KonsumsiStageInput): UjiMutuRow[] {
  const groups = new Map<string, ProductInput[]>();
  for (const product of input.products) {
    const key = `${product.brandId}|${product.commodityGroupId}`;
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  return [...groups].map(([key, products]) => {
    const first = products[0];
    const certificate = input.certificates.find((c) => c.brandId === first.brandId && c.commodityGroupId === first.commodityGroupId) ?? null;
    const window = certificate ? qualityTestSubmissionWindow(certificate.issueDate, day(input.submittedAt)) : null;
    return {
      key,
      brandName: first.brandName,
      kelompok: first.kelompok,
      subKelompok: first.subKelompok ?? certificate?.subKelompok ?? null,
      hsCodes: [...new Set(products.map((product) => product.hsCode))],
      certificate,
      window: !window
        ? { label: "Tidak ada sertifikat", tone: "red", detail: "Belum ada sertifikat uji mutu untuk kelompok ini" }
        : window.withinWindow === null
          ? { label: "Belum dapat dinilai", tone: "slate", detail: window.label }
          : { label: window.withinWindow ? "≤ 6 bulan" : "> 6 bulan", tone: window.withinWindow ? "green" : "red", detail: window.label },
      document: input.documents.find((row) => row.key === `konsumsi-qt:${first.brandId}:${first.commodityGroupId}`) ?? null,
    };
  });
}

/** Whole months between issue date and Tanggal Pengajuan (display only). */
export function documentAgeMonths(issueDate: string | null, submittedAt: string | null): number | null {
  const from = day(issueDate);
  const to = day(submittedAt);
  if (!from || !to) return null;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

// ─── Tahap 8 — Pernyataan Label ───────────────────────────────────────────────────────

export function buildLabelStage(input: KonsumsiStageInput) {
  const statement = input.documents.find((row) => row.key === "konsumsi-label:statement") ?? null;
  const documentation = input.documents.find((row) => row.key === "konsumsi-label:documentation") ?? null;
  const groups = buildUjiMutuStage(input).map(({ key, brandName, kelompok, subKelompok, hsCodes }) => ({ key, brandName, kelompok, subKelompok, hsCodes }));
  return { statement, documentation, groups, matrix: input.documents.filter((row) => row.key.startsWith("konsumsi-label:")) };
}
