import type { MachineChecklistItem } from "@/modules/verifikator-workspace/schema";
import { parseNumeric, powerInKw, type ElectricityMonth } from "./components/detail/analysis-types";

/**
 * Analisis Energi Listrik — the one calculation behind both the Technical Analyst's Energi Listrik tab
 * and the printed Laporan Analisis Teknis, so the two can never disagree. Pure: client and server.
 */

/** Load Factor applied to the machines' daily consumption. */
export const LISTRIK_LOAD_FACTOR = 0.85;
/** Non-operational allowance on top of the machines' load (lighting, office, utilities). */
export const LISTRIK_NON_OPERASIONAL = 0.15;
/** Hari operasi per bulan used when the analyst leaves "Jumlah Hari Operasi per Bulan" empty. */
export const DEFAULT_HARI_OPERASI_PER_BULAN = 26;

export type ListrikVarianceMeta = { label: string; bg: string; color: string };

export function listrikVarianceLabel(pct: number | null): ListrikVarianceMeta {
  if (pct === null) return { label: "—", bg: "#f2ece5", color: "#a68f80" };
  const abs = Math.abs(pct);
  if (abs <= 10) return { label: "Sangat Sesuai", bg: "#e2f7ea", color: "#1a9850" };
  if (abs <= 25) return { label: "Masih Wajar", bg: "#e6effa", color: "#2f6fe0" };
  if (abs <= 50) return { label: "Perlu Klarifikasi", bg: "#fdf0d5", color: "#a3690a" };
  return { label: "Perlu Verifikasi Lebih Lanjut", bg: "#fbe4de", color: "#c1361f" };
}

export function computeListrik(
  machines: readonly MachineChecklistItem[],
  electricityMonths: readonly ElectricityMonth[],
  inputs: Record<string, string> | undefined,
  tarifPerKwh: number | null,
) {
  const machineRows = machines.map((m) => {
    // Same values the verifikator saved on Verifikasi Mesin (payload.machines), converted to kW.
    const power = powerInKw(m.power, m.powerSatuan);
    const jumlah = parseNumeric(m.quantity);
    const waktu = parseNumeric(m.waktuBeroperasi);
    const totalDaya = power !== null && jumlah !== null ? power * jumlah : null;
    const dayaPerHari = totalDaya !== null && waktu !== null ? totalDaya * waktu : null;
    return { ...m, power, jumlah, waktu, totalDaya, dayaPerHari };
  });
  const totalPower = machineRows.reduce((sum, m) => sum + (m.totalDaya ?? 0), 0);
  const totalDailyConsumption = machineRows.reduce((sum, m) => sum + (m.dayaPerHari ?? 0), 0);
  const rataRataBeban = totalDailyConsumption * LISTRIK_LOAD_FACTOR;
  const nonOperasional = rataRataBeban * LISTRIK_NON_OPERASIONAL;
  const totalKebutuhanHarian = rataRataBeban + nonOperasional;
  const hariOperasiInput = parseNumeric(inputs?.hariOperasiPerBulan);
  const hariOperasiPerBulan = hariOperasiInput !== null && hariOperasiInput > 0 ? hariOperasiInput : DEFAULT_HARI_OPERASI_PER_BULAN;
  const totalMonthlyConsumption = totalKebutuhanHarian * hariOperasiPerBulan;
  const estimasiPembayaran = tarifPerKwh !== null ? totalMonthlyConsumption * tarifPerKwh : null;

  const varianceRows = electricityMonths.map((month) => {
    const actualNominal = parseNumeric(month.nominal);
    const variancePct =
      actualNominal !== null && estimasiPembayaran ? ((actualNominal - estimasiPembayaran) / estimasiPembayaran) * 100 : null;
    return { month, actualNominal, variancePct, meta: listrikVarianceLabel(variancePct) };
  });
  const maxAbsVariance = Math.max(0, ...varianceRows.map((r) => (r.variancePct !== null ? Math.abs(r.variancePct) : 0)));
  const overall = listrikVarianceLabel(varianceRows.length ? maxAbsVariance : null);

  return {
    machineRows,
    totalPower,
    totalDailyConsumption,
    rataRataBeban,
    nonOperasional,
    totalKebutuhanHarian,
    hariOperasiPerBulan,
    totalMonthlyConsumption,
    estimasiPembayaran,
    varianceRows,
    maxAbsVariance,
    overall,
  };
}

/** Texts shared by the Energi Listrik tab and the printed report. */
export const LISTRIK_TEXT = {
  dasar:
    "Analisis kebutuhan energi listrik dilakukan berdasarkan jumlah mesin produksi, daya terpasang masing-masing mesin, jam operasional perusahaan, faktor penggunaan mesin (Load Factor), dan hari kerja efektif. Hasil perhitungan teoritis kemudian dibandingkan terhadap konsumsi listrik aktual berdasarkan bukti pembayaran rekening listrik perusahaan.",
  dasarFormula: "Konsumsi Energi (kWh) = Total Daya Terpasang (kW) × Jam Operasional (jam/hari) × Load Factor × Hari Kerja Efektif (hari/tahun)",
  beban:
    "Dalam kondisi aktual, seluruh mesin tidak bekerja secara bersamaan pada beban maksimum (full load). Berdasarkan praktik operasional industri, faktor beban (Load Factor) mesin produksi umumnya berada pada kisaran 80–90%; analisis ini menggunakan Load Factor sebesar 85%.",
  tagihan:
    "Analisis pada bagian ini membandingkan estimasi kebutuhan daya listrik hasil perhitungan (dalam Rupiah, berdasarkan golongan tarif yang dipilih) dengan realisasi tagihan pembayaran listrik yang tercantum pada rekening PLN perusahaan. Selisih yang berada dalam rentang wajar mengindikasikan kapasitas produksi dan jumlah mesin yang dilaporkan sesuai dengan konsumsi energi listrik yang sebenarnya.",
} as const;
