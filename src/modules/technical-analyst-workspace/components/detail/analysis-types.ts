import type {
  CapacityRow,
  MachineChecklistItem,
  ProductionQtyChecklistItem,
  RawMaterialConversionRow,
} from "@/modules/verifikator-workspace/schema";
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
  verificationType: string;
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
export function parseNumeric(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = value.match(/-?[\d.,]+/);
  if (!match) return null;
  const normalized = match[0].replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: digits });
}
