import type {
  CapacityRow,
  MachineChecklistItem,
  ProductionQtyChecklistItem,
  RawMaterialConversionRow,
} from "@/modules/verifikator-workspace/schema";
import type { KonsumsiImportPlan } from "@/modules/applications/viu-import-plan";
import type { TechnicalAnalysisData } from "../../schema";
import type { TechnicalModuleStatusValue } from "../../status";

export type ElectricityMonth = {
  id: string;
  bulan?: string;
  kwh?: string;
  nominal?: string;
  documentPath?: string;
};

export type AnalysisData = {
  status: string;
  /** SUBMITTED, or reopened after a resubmitted revision — see isAssignmentReviewable. */
  reviewable?: boolean;
  verificationType: string;
  /** VIU import types (BAHAN_BAKU_INDUSTRI / BAHAN_BAKU_NON_INDUSTRI / BARANG_KONSUMSI) — pick the scheme's modules. */
  importTypes?: string[];
  /** VIU Barang Konsumsi only — the application's own product lines and their totals per currency. */
  konsumsiImportPlan?: KonsumsiImportPlan | null;
  /** VIU only — Jumlah Modal Kerja from each scheme's own Surat Pernyataan Kepemilikan Modal Kerja (Rp). */
  modalKerjaFromApplication?: { bahanBaku: number | null; konsumsi: number | null } | null;
  technicalAnalysisData: TechnicalAnalysisData;
  machines: MachineChecklistItem[];
  electricityMonths: ElectricityMonth[];
  capacity: CapacityRow[];
  productionQty: ProductionQtyChecklistItem[];
  rawMaterialConversion: RawMaterialConversionRow[];
};

/** Props every per-module report component receives — computed data, manual inputs, and the trailing Kesimpulan Analis card's bound state. */
export type ModuleProps = {
  data: AnalysisData;
  inputs: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  keterangan: string;
  onKeteranganChange: (value: string) => void;
  kesimpulan: string;
  onKesimpulanChange: (value: string) => void;
  status: TechnicalModuleStatusValue;
  onMarkSesuai: () => void;
  onMarkTidakSesuai: () => void;
  onSubmit: () => void;
  canEdit: boolean;
  submitting: boolean;
};

/**
 * Extracts the first numeric token from a free-text field written in Indonesian number
 * format — "." is the thousands separator, "," is the decimal separator (e.g. "1.444,70
 * kWh" -> 1444.7, "0,55 kW" -> 0.55). Returns null when nothing parses.
 */
/**
 * Number from what a company / verifikator / analyst typed. Accepts the Indonesian format
 * ("1.250.000", "7,5", "1.250,5") and a plain decimal point ("7.5", as the verifikator's machine
 * fields store it): a dot is a thousands separator only when it groups exactly three digits.
 */
export function parseNumeric(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = String(value).match(/-?[\d.,]+/);
  if (!match) return null;
  let s = match[0];
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** One row of the Kebutuhan Bahan Baku rekapitulasi (inputs.rekapBahanBaku, keyed by conversion row id). */
export type RekapBahanBakuEntry = { produk: string; bahanBaku: string; hsCode: string; izin: string; vki: string; permohonan: string; satuan: string };

export function parseRekapBahanBaku(value: string | undefined | null): Record<string, RekapBahanBakuEntry> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, RekapBahanBakuEntry>) : {};
  } catch {
    return {};
  }
}

/** Machine power in kW from the value + unit the verifikator recorded (kW when no unit is given). */
export function powerInKw(value: string | undefined | null, unit: string | undefined | null): number | null {
  const n = parseNumeric(value);
  if (n === null) return null;
  const u = (unit ?? "").trim().toLowerCase().replace(/[\s/]+.*$/, "");
  if (u === "w" || u === "watt") return n / 1000;
  if (u === "mw") return n * 1000;
  if (u === "hp" || u === "pk") return n * 0.7457;
  return n; // kW, kWh (per jam) or no unit
}

export function fmtNum(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: digits });
}
