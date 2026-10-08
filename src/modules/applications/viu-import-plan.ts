import { MODAL_STATEMENT_LETTER_DOC_DEF } from "./financial-capability-defs";
import type { ApplicationWizardValues } from "./schema";
import { konsumsiProductTotal } from "./viu-schemes/konsumsi/schema";

/**
 * VIU figures read straight from the application, shared by every workspace that shows them
 * (Technical Analyst's modal analysis, Project Manager's application detail) so nobody re-types
 * them and every view agrees.
 */

export type KonsumsiImportPlanProduct = {
  id: string;
  productName: string;
  brandId: string;
  brandName: string | null;
  hsCode: string;
  hsDescription: string | null;
  subKelompokKomoditas: string | null;
  originCountryNames: string[];
  quantity: number;
  stockQuantity: number;
  unit: string | null;
  averageUnitPrice: number;
  currency: string;
  total: number;
};

export type KonsumsiImportPlan = {
  products: KonsumsiImportPlanProduct[];
  /** Totals stay per currency — products may be priced in USD/EUR/CNY/... and the system holds no exchange rate. */
  totalsByCurrency: Record<string, number>;
  /** Jumlah Modal Kerja on Konsumsi's own Surat Pernyataan Kepemilikan Modal Kerja (Rp). */
  modalKerja: number | null;
};

/** Jumlah Modal Kerja declared on a Surat Pernyataan Kepemilikan Modal Kerja entry (digits-only Rupiah string). */
export function statementAmount(docs: { key: string; amount?: string }[] | undefined): number | null {
  const statement = (docs ?? []).find((doc) => doc.key === MODAL_STATEMENT_LETTER_DOC_DEF.key);
  return statement?.amount ? Number(statement.amount.replace(/[^\d]/g, "")) || null : null;
}

/** VIU Barang Konsumsi's import plan from the Product Information step (Ps 37 ayat (2) huruf c; LHVIU Ps 39 ayat (5) huruf d-f). */
export function buildKonsumsiImportPlan(
  payload: ApplicationWizardValues,
  brandNameById?: Map<string, string>,
): KonsumsiImportPlan | null {
  if (!payload.importTypes?.includes("BARANG_KONSUMSI")) return null;
  const products = (payload.konsumsiProducts ?? []).map((product) => ({
    id: product.id,
    productName: product.productName,
    brandId: product.brandId,
    brandName: product.productSnapshot?.brandName || brandNameById?.get(product.brandId) || null,
    hsCode: product.hsCode,
    hsDescription: product.hsDescription ?? product.productSnapshot?.hsDescription ?? null,
    subKelompokKomoditas: product.commodityName ?? product.productSnapshot?.commodityName ?? null,
    originCountryNames: product.originCountryNames ?? product.productSnapshot?.countryOfOriginNames ?? product.originCountries,
    quantity: Number(product.quantity) || 0,
    stockQuantity: Number(product.stockQuantity) || 0,
    unit: product.unit ?? null,
    averageUnitPrice: Number(product.averageUnitPrice) || 0,
    currency: product.currency ?? "USD",
    total: konsumsiProductTotal(product),
  }));
  const totalsByCurrency: Record<string, number> = {};
  for (const product of products) {
    totalsByCurrency[product.currency] = (totalsByCurrency[product.currency] ?? 0) + product.total;
  }
  return { products, totalsByCurrency, modalKerja: statementAmount(payload.konsumsiFinancialDocuments) };
}

/**
 * Every VIU scheme submits its own Surat Pernyataan Kepemilikan Modal Kerja — Bahan Baku Industri/Non Industri
 * in `nonIndustriDocuments`, Barang Konsumsi in `konsumsiFinancialDocuments`.
 */
export function buildModalKerjaFromApplication(payload: ApplicationWizardValues) {
  if (!payload.importTypes || payload.importTypes.length === 0) return null;
  const types = new Set(payload.importTypes);
  const bahanBaku = types.has("BAHAN_BAKU_INDUSTRI") || types.has("BAHAN_BAKU_NON_INDUSTRI");
  return {
    bahanBaku: bahanBaku ? statementAmount(payload.nonIndustriDocuments) : null,
    konsumsi: types.has("BARANG_KONSUMSI") ? statementAmount(payload.konsumsiFinancialDocuments) : null,
  };
}
