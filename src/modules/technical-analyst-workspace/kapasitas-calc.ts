import type { MachineChecklistItem } from "@/modules/verifikator-workspace/schema";
import { parseNumeric } from "./components/detail/analysis-types";

/**
 * Kapasitas Produksi — "B. Penentuan Bottleneck dan Kapasitas Teoritis", shared by the Technical
 * Analyst's Kapasitas tab and the printed Laporan Analisis Teknis so both show the same figures. Pure.
 */

/** Hari efektif per tahun when the bottleneck machine has none recorded (26 hari × 12). */
export const DEFAULT_HARI_EFEKTIF_PER_TAHUN = 312;

export const BOTTLENECK_TEXT =
  "Kapasitas produksi keseluruhan lini ditentukan oleh tahapan proses dengan kapasitas produksi harian terkecil (bottleneck), karena tahapan tersebut membatasi kapasitas produksi lini secara menyeluruh.";

/**
 * D. Perbandingan Kapasitas dengan Rencana Produksi — per product, the analyst can type the yearly
 * capacity it's compared against (default: the bottleneck line's kapasitas per tahun) and set the
 * status by hand (default: rencana ≤ kapasitas). Stored as JSON in inputs.perbandinganRencana,
 * keyed by productId.
 */
export type PerbandinganRencanaEntry = { vol?: string; status?: "SESUAI" | "TIDAK_SESUAI" | "" };

export function parsePerbandinganRencana(raw: string | undefined): Record<string, PerbandinganRencanaEntry> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, PerbandinganRencanaEntry>) : {};
  } catch {
    return {};
  }
}

export function rencanaComparison(
  productionQty: readonly { productId: string; section: string; jenisProduk: string; deskripsiProduk: string; hsCode: string; satuan: string; jumlah: string }[],
  kapasitasLiniTahunan: number | null,
  inputs: Record<string, string> | undefined,
) {
  const overrides = parsePerbandinganRencana(inputs?.perbandinganRencana);
  const byProduct = new Map<string, { jenisProduk: string; deskripsi: string; hsCode: string; satuan: string; sebelumnya: string; rencana: string }>();
  for (const item of productionQty) {
    const row = byProduct.get(item.productId) ?? {
      jenisProduk: item.jenisProduk,
      deskripsi: item.deskripsiProduk,
      hsCode: item.hsCode,
      satuan: item.satuan,
      sebelumnya: "",
      rencana: "",
    };
    if (item.section === "sebelumnya") row.sebelumnya = item.jumlah;
    if (item.section === "rencana") row.rencana = item.jumlah;
    byProduct.set(item.productId, row);
  }
  return [...byProduct.entries()].map(([productId, row]) => {
    const override = overrides[productId] ?? {};
    const manualVol = parseNumeric(override.vol);
    const volPerhitungan = manualVol ?? kapasitasLiniTahunan;
    const rencanaNum = parseNumeric(row.rencana);
    const autoSesuai = volPerhitungan === null || rencanaNum === null ? null : rencanaNum <= volPerhitungan;
    const statusManual = override.status === "SESUAI" || override.status === "TIDAK_SESUAI";
    const sesuai = statusManual ? override.status === "SESUAI" : autoSesuai;
    return { productId, ...row, rencanaNum, volPerhitungan, volManual: manualVol !== null, autoSesuai, sesuai, statusManual, override };
  });
}

export function computeBottleneck(machines: readonly MachineChecklistItem[], inputs: Record<string, string> | undefined) {
  // Same figures the verifikator sees on Verifikasi Mesin: Kapasitas/Hari = jumlah × kapasitas/jam ×
  // jam operasi, Kapasitas/Tahun = Kapasitas/Hari × hari efektif per tahun of that machine.
  const machineRows = machines.map((m) => ({ ...m, perHari: parseNumeric(m.kapasitasPerHari), perTahun: parseNumeric(m.kapasitasPerTahun) }));
  const withCapacity = machineRows.filter((m) => m.perHari !== null && m.perHari > 0);
  // Default: the lowest daily capacity among the machines that produce in the line's output unit (the
  // unit most machines share, e.g. pcs) — a plate maker counted in "plat" is not comparable. The
  // analyst can pick another machine/process (stored by name in inputs.mesinBottleneck).
  const unitCount = new Map<string, number>();
  for (const m of withCapacity) unitCount.set(m.kapasitasJamSatuan.trim().toLowerCase(), (unitCount.get(m.kapasitasJamSatuan.trim().toLowerCase()) ?? 0) + 1);
  const lineUnit = [...unitCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const sameUnit = withCapacity.filter((m) => m.kapasitasJamSatuan.trim().toLowerCase() === lineUnit);
  const autoBottleneck = sameUnit.length > 0 ? sameUnit.reduce((min, m) => (m.perHari! < min.perHari! ? m : min)) : null;
  const chosenName = inputs?.mesinBottleneck?.trim() ?? "";
  const chosenBottleneck = chosenName ? (machineRows.find((m) => (m.nama ?? "").trim() === chosenName) ?? null) : null;
  const bottleneck = chosenBottleneck ?? autoBottleneck;
  const kapasitasLiniHarian = bottleneck?.perHari ?? null;
  const hariEfektif = parseNumeric(bottleneck?.hariEfektifPerTahun) ?? DEFAULT_HARI_EFEKTIF_PER_TAHUN;
  const kapasitasLiniTahunan = bottleneck?.perTahun ?? (kapasitasLiniHarian !== null ? kapasitasLiniHarian * hariEfektif : null);
  const kapasitasLiniBulanan = kapasitasLiniTahunan !== null ? kapasitasLiniTahunan / 12 : null;
  const satuanLini = bottleneck?.kapasitasJamSatuan?.trim() || "pcs";
  return {
    machineRows,
    autoBottleneck,
    chosenName,
    chosenBottleneck,
    bottleneck,
    kapasitasLiniHarian,
    hariEfektif,
    kapasitasLiniTahunan,
    kapasitasLiniBulanan,
    satuanLini,
  };
}
