import type { CapacityRow, MachineChecklistItem, RawMaterialConversionRow, RawMaterialUsageRow } from "@/modules/verifikator-workspace/schema";
import { parseNumeric, parseRekapBahanBaku } from "./components/detail/analysis-types";
import type { TechnicalAnalysisData } from "./schema";

/**
 * Figures the Analisis Teknis VKI hands to the LHVKI — Permenperin 27/2025 Pasal 32 ayat (3):
 *   c. kapasitas produksi per tahun sesuai Perizinan Berusaha;
 *   d. kapasitas produksi per tahun sesuai hasil VKI;
 *   e. kebutuhan bahan baku dan/atau bahan penolong dalam 1 tahun sesuai kapasitas produksi;
 *   f. kebutuhan bahan baku dan/atau bahan penolong dalam 1 tahun sesuai hasil VKI.
 * Pure — used by the Analisis Teknis tab, the Kapasitas/Bahan Baku modules and the printed report.
 */

export const WORKING_DAYS_PER_MONTH = 26;

/** Line capacity from the bottleneck machine — the analyst's pick (inputs.mesinBottleneck) or the lowest per day. */
export function computeBottleneck(machines: readonly MachineChecklistItem[], chosenName?: string) {
  const rows = machines.map((m) => ({ ...m, perHari: parseNumeric(m.kapasitasPerHari), perTahun: parseNumeric(m.kapasitasPerTahun) }));
  const withCapacity = rows.filter((m) => m.perHari !== null && m.perHari > 0);
  const unitOf = (m: { kapasitasJamSatuan: string }) => m.kapasitasJamSatuan.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const m of withCapacity) counts.set(unitOf(m), (counts.get(unitOf(m)) ?? 0) + 1);
  const lineUnit = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const sameUnit = withCapacity.filter((m) => unitOf(m) === lineUnit);
  const auto = sameUnit.length > 0 ? sameUnit.reduce((min, m) => (m.perHari! < min.perHari! ? m : min)) : null;
  const name = chosenName?.trim() ?? "";
  const chosen = name ? (rows.find((m) => (m.nama ?? "").trim() === name) ?? null) : null;
  const bottleneck = chosen ?? auto;
  const harian = bottleneck?.perHari ?? null;
  const hariEfektif = parseNumeric(bottleneck?.hariEfektifPerTahun) ?? WORKING_DAYS_PER_MONTH * 12;
  const tahunan = bottleneck?.perTahun ?? (harian !== null ? harian * hariEfektif : null);
  const bulanan = tahunan !== null ? tahunan / 12 : null;
  return { rows, auto, chosen, bottleneck, harian, bulanan, tahunan };
}

/** Kapasitas Hasil VKI per capacity row, typed by the analyst (kapasitas module, inputs.kapasitasVki). */
export function parseKapasitasVki(value: string | undefined | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export type CapacitySummaryRow = {
  id: string;
  jenisProduk: string;
  kbli: string;
  satuan: string;
  izin: number | null;
  terpasang: number | null;
  vki: number | null;
  /** (vki − izin) / izin, in %. */
  selisihPct: number | null;
};

export function capacitySummary(capacity: readonly CapacityRow[], kapasitasInputs: Record<string, string> | undefined): CapacitySummaryRow[] {
  const vkiById = parseKapasitasVki(kapasitasInputs?.kapasitasVki);
  return capacity.map((row) => {
    const izin = parseNumeric(row.berdasarkanIzin);
    const vki = parseNumeric(vkiById[row.id]);
    return {
      id: row.id,
      jenisProduk: row.jenisProduk,
      kbli: [row.kbliCode, row.kbliDescription].filter(Boolean).join(" – "),
      satuan: row.satuan,
      izin,
      terpasang: parseNumeric(row.kapasitasTerpasang),
      vki,
      selisihPct: izin && vki !== null ? ((vki - izin) / izin) * 100 : null,
    };
  });
}

/** Bahan baku per unit produk: volume kebutuhan ÷ volume produksi, else a plain numeric rasio konversi. */
export function conversionRatio(row: RawMaterialConversionRow): number | null {
  const kebutuhan = parseNumeric(row.volumeKebutuhanJumlah);
  const produksi = parseNumeric(row.volumeProduksiJumlah);
  if (kebutuhan !== null && produksi) return kebutuhan / produksi;
  if (row.rasioKonversi && !/[:/]/.test(row.rasioKonversi)) return parseNumeric(row.rasioKonversi);
  return null;
}

/** The capacity row of a product: the one with the same Jenis Produk, or the only row there is. */
function capacityOf(row: RawMaterialConversionRow, capacity: readonly CapacityRow[], summary: readonly CapacitySummaryRow[]) {
  const norm = (s: string) => s.trim().toLowerCase();
  const match = capacity.find((c) => c.jenisProduk && row.productName && norm(c.jenisProduk) === norm(row.productName)) ?? (capacity.length === 1 ? capacity[0] : undefined);
  return match ? (summary.find((s) => s.id === match.id) ?? null) : null;
}

/**
 * Rencana Kebutuhan Bahan Baku/Penolong 1 Tahun ke Depan of a conversion row — the same figures the
 * verifikator checks on Verifikasi Jumlah Produksi (payload.rawMaterialUsage, per raw material).
 */
export function rencanaKebutuhanOf(row: RawMaterialConversionRow, usage: readonly RawMaterialUsageRow[]) {
  const u = usage.find((x) => x.conversionId === row.id) ?? usage.find((x) => x.rawMaterialId && x.rawMaterialId === row.rawMaterialId);
  return {
    total: parseNumeric(u?.rencanaKebutuhan),
    dalamNegeri: parseNumeric(u?.rencanaKebutuhanDalamNegeri),
    luarNegeri: parseNumeric(u?.rencanaKebutuhanLuarNegeri),
    negaraAsal: u?.rencanaKebutuhanNegaraAsal ?? "",
    satuan: u?.satuan || row.volumeKebutuhanSatuan,
  };
}

export type MaterialNeedRow = {
  id: string;
  rawMaterialId: string | null;
  produk: string;
  bahanBaku: string;
  hsCode: string;
  satuan: string;
  permohonan: number | null;
  /** Huruf e — kapasitas Perizinan Berusaha × rasio konversi, or the analyst's own figure. */
  izin: number | null;
  izinOtomatis: number | null;
  /** Huruf f — kapasitas hasil VKI × rasio konversi, or the analyst's own figure. */
  vki: number | null;
  vkiOtomatis: number | null;
  izinManual: string;
  vkiManual: string;
};

export function materialNeeds(
  conversions: readonly RawMaterialConversionRow[],
  capacity: readonly CapacityRow[],
  data: TechnicalAnalysisData,
  usage: readonly RawMaterialUsageRow[] = [],
): MaterialNeedRow[] {
  const capSummary = capacitySummary(capacity, data.kapasitas?.inputs);
  const rekap = parseRekapBahanBaku(data.bahanbaku?.inputs?.rekapBahanBaku);
  return conversions.map((row) => {
    const ratio = conversionRatio(row);
    const cap = capacityOf(row, capacity, capSummary);
    const izinOtomatis = ratio !== null && cap?.izin != null ? cap.izin * ratio : null;
    const vkiOtomatis = ratio !== null && cap?.vki != null ? cap.vki * ratio : null;
    const izinManual = rekap[row.id]?.izin?.trim() ?? "";
    const vkiManual = rekap[row.id]?.vki?.trim() ?? "";
    const rencana = rencanaKebutuhanOf(row, usage);
    return {
      id: row.id,
      rawMaterialId: row.rawMaterialId,
      produk: row.productName,
      bahanBaku: row.jenis,
      hsCode: row.hsCode,
      satuan: rencana.satuan,
      // Berdasarkan Permohonan = Rencana Kebutuhan 1 Tahun ke Depan (Verifikasi Jumlah Produksi).
      permohonan: rencana.total,
      izin: izinManual ? parseNumeric(izinManual) : izinOtomatis,
      izinOtomatis,
      vki: vkiManual ? parseNumeric(vkiManual) : vkiOtomatis,
      vkiOtomatis,
      izinManual,
      vkiManual,
    };
  });
}

export type MaterialTotalRow = { bahanBaku: string; hsCode: string; satuan: string; izin: number | null; vki: number | null; permohonan: number | null };

/** Huruf e/f per bahan baku (HS + satuan): one material used by several products is summed. */
export function materialTotals(rows: readonly MaterialNeedRow[]): MaterialTotalRow[] {
  const map = new Map<string, MaterialTotalRow>();
  const add = (a: number | null, b: number | null) => (b === null ? a : (a ?? 0) + b);
  // Rencana kebutuhan is recorded per raw material: count it once even when the material feeds several products.
  const countedRaw = new Set<string>();
  for (const r of rows) {
    const key = `${r.hsCode}|${r.bahanBaku.trim().toLowerCase()}|${r.satuan}`;
    const t = map.get(key) ?? { bahanBaku: r.bahanBaku, hsCode: r.hsCode, satuan: r.satuan, izin: null, vki: null, permohonan: null };
    t.izin = add(t.izin, r.izin);
    t.vki = add(t.vki, r.vki);
    if (!r.rawMaterialId || !countedRaw.has(r.rawMaterialId)) t.permohonan = add(t.permohonan, r.permohonan);
    if (r.rawMaterialId) countedRaw.add(r.rawMaterialId);
    map.set(key, t);
  }
  return [...map.values()];
}
