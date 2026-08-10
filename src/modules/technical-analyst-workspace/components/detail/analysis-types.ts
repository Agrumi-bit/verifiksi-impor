import type {
  CapacityRow,
  MachineChecklistItem,
  ProductionQtyChecklistItem,
  RawMaterialConversionRow,
} from "@/modules/verifikator-workspace/schema";
import type { TechnicalAnalysisData } from "../../schema";

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
  productionQtyRencana: ProductionQtyChecklistItem[];
  rawMaterialConversion: RawMaterialConversionRow[];
};

/** Extracts the first numeric token from a free-text field (e.g. "5.5 kW" -> 5.5). Returns null when nothing parses. */
export function parseNumeric(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: digits });
}
