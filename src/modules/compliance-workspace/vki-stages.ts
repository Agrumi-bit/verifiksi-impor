import { TECHNICAL_MODULE_STATUS_LABELS, type TechnicalModuleStatusValue } from "@/modules/technical-analyst-workspace/status";
import { capacitySummary, materialNeeds, rencanaKebutuhanOf } from "@/modules/technical-analyst-workspace/lhvki-summary";
import type { TechnicalAnalysisData } from "@/modules/technical-analyst-workspace/schema";
import { computeBottleneck } from "@/modules/technical-analyst-workspace/kapasitas-calc";
import { computeListrik } from "@/modules/technical-analyst-workspace/listrik-calc";
import { parseNumeric } from "@/modules/technical-analyst-workspace/components/detail/analysis-types";
import type {
  CapacityRow,
  MachineChecklistItem,
  ProductChecklistItem,
  ProductionQtyChecklistItem,
  RawMaterialChecklistItem,
  RawMaterialConversionRow,
  RawMaterialUsageRow,
  SalesRow,
} from "@/modules/verifikator-workspace/schema";
import {
  PRODUCT_VERIFICATION_STATUS_LABELS,
  PRODUCTION_QTY_VERIFICATION_STATUS_LABELS,
  rawMaterialUsageRowKey,
  type ProductionQtyVerificationStatusValue,
  type ProductVerificationStatusValue,
} from "@/modules/verifikator-workspace/status";
import { formatLegalBasis } from "@/modules/schemes/shared/legal";
import { VKI_LEGAL_BASIS } from "@/modules/schemes/vki/legal-basis";
import type { Evidence } from "./case-detail";
import type { DocumentRow } from "./document-matrix";
import type { Tone, Verdict } from "./konsumsi-stages";

/**
 * Tahap 5–14 of the Compliance case view for VKI (pure): Produk, Alur Proses Produksi, Pemakaian Listrik, Data Mesin, Kapasitas
 * Produksi, Kebutuhan Bahan Baku, Penjualan Dalam Negeri & Ekspor, Tenaga Kerja, Surat Pernyataan and Analisis Teknis. Every value is what the applicant declared and every verdict what
 * the source workspace recorded (Verifikator document status, Technical Analyst module decision).
 */

export const VKI_MODULE_KEYS = ["listrik", "kapasitas", "bahanbaku"] as const;
export type VkiModuleKey = (typeof VKI_MODULE_KEYS)[number];

export type VkiModuleDecision = { status: TechnicalModuleStatusValue; keterangan: string | null; kesimpulan: string | null };

export type VkiStageInput = {
  submittedAt: string | null;
  /** Every VKI checklist document with its recorded status (VKI scheme definitions). */
  documents: (DocumentRow & { category: string })[];
  /** The products as the Verifikator's Verifikasi Produk checklist lists them, with its decision per product (by id). */
  products: ProductChecklistItem[];
  productStatuses: Record<string, { status: ProductVerificationStatusValue; note: string | null } | undefined>;
  /** The raw materials (bahan baku/penolong) and their conversion ratios per product, as declared. */
  rawMaterials: RawMaterialChecklistItem[];
  conversions: RawMaterialConversionRow[];
  /** Kapasitas Produksi berdasarkan perizinan, per KBLI (the Verifikator's capacity rows). */
  capacity: CapacityRow[];
  /** Jumlah produksi per product: tahun sebelumnya and rencana tahun berikutnya (Verifikator's checklist rows). */
  productionQty: ProductionQtyChecklistItem[];
  /** The Verifikator's decision per production row ("sebelumnya:<id>" / "rencana:<id>") and per section ("summary:<section>"). */
  productionQtyStatuses: Record<string, { status: ProductionQtyVerificationStatusValue; keterangan: string | null; kesimpulan: string | null } | undefined>;
  /** Bahan baku/penolong usage, stock and 1-year need, one row per raw material × product it is used for (Verifikator's rows). */
  rawMaterialUsage: RawMaterialUsageRow[];
  /** Penjualan dalam negeri & ekspor per product, as declared (the Verifikator concludes on the whole section). */
  sales: SalesRow[];
  /** The machines as the Verifikator's Verifikasi Mesin checklist computes them (kapasitas per hari/tahun). */
  machines: MachineChecklistItem[];
  /** The Technical Analyst's Kapasitas inputs (e.g. the chosen bottleneck machine). */
  kapasitasInputs?: Record<string, string>;
  electricity: { month: string | null; kwh: string | null; nominal: string | null; document: Evidence | null }[];
  workforce: { category: string; count: number }[];
  /** The applicant's statements (vkiSupportDocs other than the listrik / tenaga kerja evidence). */
  statements: { key: string; label: string; number: string | null; date: string | null; signer: string | null; document: Evidence | null }[];
  modules: Partial<Record<VkiModuleKey, VkiModuleDecision>>;
  /** The Technical Analyst's own inputs per module (tarif listrik, hari operasi, rekap bahan baku …). */
  technicalInputs?: Partial<Record<VkiModuleKey, Record<string, string>>>;
  /** The electricity tariff the analyst chose (Master Data), for the estimated monthly bill. */
  tariff?: { label: string; perKwh: number | null } | null;
};

const STATEMENT_LABELS: Record<string, string> = {
  "tidak-diperjualbelikan": "Surat Pernyataan Tidak Akan Diperjualbelikan atau Dipindahtangankan",
  "kebenaran-data": "Surat Pernyataan Kebenaran Data dan Dokumen",
  "memiliki-menguasai": "Surat Pernyataan Memiliki/Menguasai Gudang dan/atau Unit Pengolahan Limbah",
  "alur-proses": "Gambar Alur Proses Produksi",
};

/** The Technical Analyst writes Keterangan/Kesimpulan as rich text — Compliance shows it as plain text. */
export function plainText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return text || null;
}

export function statementLabel(key: string): string {
  return STATEMENT_LABELS[key] ?? key;
}

const MODULE_TONES: Record<TechnicalModuleStatusValue, Tone> = { PENDING: "slate", SESUAI: "green", SESUAI_CATATAN: "orange", TIDAK_SESUAI: "red" };

export function moduleVerdict(decision: VkiModuleDecision | undefined): Verdict {
  const status = decision?.status ?? "PENDING";
  return { label: TECHNICAL_MODULE_STATUS_LABELS[status], tone: MODULE_TONES[status] };
}

// ─── Matriks pemeriksaan (Tipe Regulasi / Note Regulasi) ───────────────────────────────

/**
 * Permenperin 27/2025 Pasal 30 ayat (2) huruf a, per data item — the same angka the Verifikator's
 * "Rekapitulasi Hasil Pemeriksaan Kemampuan Produksi" cites; huruf b from the VKI legal basis.
 */
export const VKI_DATA_REGULATION = {
  dataProduksi: formatLegalBasis(VKI_LEGAL_BASIS.dataProduksi),
  kapasitas: "Pasal 30 ayat (2) huruf a angka 1",
  produksiSebelumnya: "Pasal 30 ayat (2) huruf a angka 2",
  konversi: "Pasal 30 ayat (2) huruf a angka 3",
  rencana: "Pasal 30 ayat (2) huruf a angka 4",
  penjualan: "Pasal 30 ayat (2) huruf a angka 5",
  stok: "Pasal 30 ayat (2) huruf a angka 6",
  mesin: formatLegalBasis(VKI_LEGAL_BASIS.mesin),
} as const;

export type VkiCheck = { parameter: string; object: string; result: string; verdict: Verdict; type: string; regulation: string };

const NOT_FILLED: Verdict = { label: "Belum Diisi", tone: "slate" };
// Data the Verifikator records without a per-row decision: present is all the recap asks of it.
const DATA_PRESENT: Verdict = { label: "Tersedia", tone: "green" };

/** The section's own conclusion when the Verifikator gave one, otherwise what its rows add up to. */
function rowsVerdict(rows: { verdict: Verdict }[], summary: Verdict | null): Verdict {
  if (summary) return summary;
  if (rows.length === 0) return NOT_FILLED;
  if (rows.some((row) => row.verdict.tone === "red")) return { label: "Tidak Sesuai", tone: "red" };
  if (rows.every((row) => row.verdict.tone === "green")) return { label: "Sesuai", tone: "green" };
  return { label: "Belum Diperiksa", tone: "slate" };
}

function presenceVerdict(count: number, summary: Verdict | null = null): Verdict {
  return summary ?? (count ? DATA_PRESENT : NOT_FILLED);
}

function check(parameter: string, object: string, result: string, verdict: Verdict, regulation: string): VkiCheck {
  return { parameter, object, result, verdict, type: "Wajib", regulation };
}

function summaryVerdict(input: VkiStageInput, key: string): Verdict | null {
  const summary = input.productionQtyStatuses[key];
  return summary && summary.status !== "PENDING" ? productionVerdict(summary.status) : null;
}

const sectionResult = (rows: { verdict: Verdict }[], total: string) =>
  rows.length ? `${rows.filter((row) => row.verdict.tone === "green").length} dari ${rows.length} baris sesuai · total ${total}` : "—";

function documentsWhere(input: VkiStageInput, match: (row: DocumentRow & { category: string }) => boolean): DocumentRow[] {
  return input.documents.filter(match);
}

// ─── Tahap 5 — Produk ─────────────────────────────────────────────────────────────────

const PRODUCT_TONES: Record<ProductVerificationStatusValue, Tone> = { PENDING: "slate", VERIFIED: "green", NEED_REVISION: "orange", REJECTED: "red" };

const MATERIAL_CATEGORIES: Record<string, string> = { BAHAN_BAKU: "Bahan Baku", BAHAN_PENOLONG: "Bahan Penolong" };

/** Produk, Bahan Baku and Rasio Konversi bahan baku ke produk — as declared, with the Verifikator's decisions. */
export function buildProdukStage(input: VkiStageInput) {
  const stage = produkData(input);
  const usedFor = new Set(input.conversions.map((row) => row.productId).filter(Boolean)).size;
  return {
    ...stage,
    checks: [
      check(
        "Jenis produk dan pos tarif/HS",
        `${stage.products.length} produk`,
        stage.products.length ? `${stage.products.filter((product) => product.verdict.tone === "green").length} dari ${stage.products.length} produk Verified` : "—",
        rowsVerdict(stage.products, null),
        VKI_DATA_REGULATION.dataProduksi,
      ),
      check("Jenis bahan baku/penolong dan pos tarif/HS", `${stage.materials.length} bahan baku`, stage.materials.length ? `Digunakan untuk ${usedFor} produk` : "—", presenceVerdict(stage.materials.length), VKI_DATA_REGULATION.dataProduksi),
      check(
        "Konversi penggunaan bahan baku/penolong per jenis produk",
        `${stage.conversions.rows.length} rasio konversi`,
        stage.conversions.rows.length ? `${stage.conversions.rows.length} pasangan produk–bahan baku` : "—",
        presenceVerdict(stage.conversions.rows.length, stage.conversions.verdict),
        VKI_DATA_REGULATION.konversi,
      ),
    ] satisfies VkiCheck[],
  };
}

function produkData(input: VkiStageInput) {
  const productName = new Map(input.products.map((product) => [product.id, product.materialType || product.deskripsi || "—"]));
  const summary = input.productionQtyStatuses["summary:konversi"];
  return {
    products: input.products.map((product) => {
      const entry = input.productStatuses[product.id];
      const status = entry?.status ?? "PENDING";
      return {
        id: product.id,
        name: productName.get(product.id)!,
        category: product.kategori || null,
        description: product.deskripsi || null,
        hsCode: product.hsCode || null,
        hsDescription: product.hsDesc || null,
        volume: formatQuantity(parseNumeric(product.estimatedVolume), product.volumeUnit),
        verdict: { label: PRODUCT_VERIFICATION_STATUS_LABELS[status], tone: PRODUCT_TONES[status] },
        note: entry?.note ?? null,
      };
    }),
    materials: input.rawMaterials.map((material) => ({
      id: material.id,
      name: material.jenis || "—",
      hsCode: material.hsCode || null,
      hsDescription: material.hsDesc || null,
      description: material.deskripsi || null,
      usedFor: [...new Set(input.conversions.filter((row) => row.rawMaterialId === material.id).map((row) => productName.get(row.productId ?? "") ?? row.productName))]
        .filter(Boolean)
        .join(", ") || null,
    })),
    conversions: {
      rows: input.conversions.map((row) => ({
        id: row.id,
        product: row.productName || "—",
        production: formatQuantity(parseNumeric(row.volumeProduksiJumlah), row.volumeProduksiSatuan),
        material: row.jenis || "—",
        hsCode: row.hsCode || null,
        category: MATERIAL_CATEGORIES[row.kategori] ?? (row.kategori || null),
        need: formatQuantity(parseNumeric(row.volumeKebutuhanJumlah), row.volumeKebutuhanSatuan),
        ratio: row.rasioKonversi || "—",
        note: row.keterangan || null,
      })),
      verdict: summary ? productionVerdict(summary.status) : null,
      conclusion: summary?.kesimpulan ?? null,
    },
  };
}

// ─── Tahap 6 — Alur Proses Produksi ───────────────────────────────────────────────────

export function buildAlurProsesStage(input: VkiStageInput) {
  return { documents: documentsWhere(input, (row) => row.key === "vki-support:alur-proses") };
}

// ─── Tahap 7 — Pemakaian Listrik ──────────────────────────────────────────────────────

/** Bukti pembayaran listrik 3 (tiga) bulan sebelumnya: per month, with the total and the monthly average. */
export function buildListrikStage(input: VkiStageInput) {
  const usage = input.electricity.map((month) => parseNumeric(month.kwh)).filter((kwh): kwh is number => kwh !== null);
  const total = usage.reduce((sum, kwh) => sum + kwh, 0);
  return {
    electricity: input.electricity,
    totalKwh: usage.length ? formatQuantity(total, "kWh") : "—",
    averageKwh: usage.length ? formatQuantity(total / usage.length, "kWh") : "—",
    documents: documentsWhere(input, (row) => row.key.startsWith("vki-support:listrik")),
  };
}

// ─── Tahap 8 — Data Mesin ─────────────────────────────────────────────────────────────

const NUMBER = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

/** A number as the reports print it ("1.234,5"), or "—". */
export function formatQuantity(value: number | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return [NUMBER.format(value), unit?.trim()].filter(Boolean).join(" ");
}

/**
 * Data Mesin, Kemampuan Kapasitas Mesin and Penggunaan Daya Mesin — with the same calculations the
 * Verifikator (Verifikasi Mesin) and the Technical Analyst (Kapasitas, Energi Listrik) use, so the
 * figures never disagree with theirs.
 */
export function buildMesinStage(input: VkiStageInput) {
  const stage = mesinData(input);
  const summary = summaryVerdict(input, "summary:mesin");
  return {
    ...stage,
    checks: [
      check("Data mesin produksi", `${stage.machines.length} jenis mesin`, stage.machines.length ? `${stage.totalUnits.toLocaleString("id-ID")} unit` : "—", presenceVerdict(stage.machines.length, summary), VKI_DATA_REGULATION.mesin),
      check(
        "Kemampuan produksi mesin per hari",
        stage.line.machine ? `Bottleneck ${stage.line.machine}` : "—",
        stage.line.machine ? `${stage.line.perDay}/hari · ${stage.line.perYear}/tahun` : "—",
        presenceVerdict(stage.machines.length, summary),
        VKI_DATA_REGULATION.kapasitas,
      ),
      check("Penggunaan daya mesin", `${stage.power.length} jenis mesin`, stage.power.length ? `${stage.totalPower} · ${stage.totalPerDay}/hari` : "—", presenceVerdict(stage.power.length), VKI_DATA_REGULATION.mesin),
    ] satisfies VkiCheck[],
  };
}

function mesinData(input: VkiStageInput) {
  const listrik = computeListrik(input.machines, [], undefined, null);
  const line = computeBottleneck(input.machines, input.kapasitasInputs);
  const bottleneckId = line.bottleneck?.id ?? null;
  return {
    machines: input.machines,
    totalUnits: input.machines.reduce((sum, machine) => sum + (parseNumeric(machine.quantity) ?? 0), 0),
    capacity: line.machineRows.map((machine) => ({
      id: machine.id,
      name: machine.nama || "—",
      process: machine.proses || null,
      quantity: [machine.quantity, machine.quantitySatuan].filter(Boolean).join(" ") || null,
      perHour: [machine.kapasitasJam, machine.kapasitasJamSatuan].filter(Boolean).join(" ") || null,
      hoursPerDay: machine.waktuBeroperasi || null,
      perDay: formatQuantity(machine.perHari, machine.kapasitasJamSatuan),
      effectiveDays: machine.hariEfektifPerTahun || null,
      perYear: formatQuantity(machine.perTahun, machine.kapasitasJamSatuan),
      isBottleneck: bottleneckId !== null && machine.id === bottleneckId,
    })),
    line: {
      machine: line.bottleneck?.nama ?? null,
      chosenByAnalyst: line.chosenBottleneck !== null,
      perDay: formatQuantity(line.kapasitasLiniHarian, line.satuanLini),
      perMonth: formatQuantity(line.kapasitasLiniBulanan, line.satuanLini),
      perYear: formatQuantity(line.kapasitasLiniTahunan, line.satuanLini),
    },
    power: listrik.machineRows.map((machine) => ({
      id: machine.id,
      name: machine.nama || "—",
      powerPerUnit: formatQuantity(machine.power, "kW"),
      quantity: formatQuantity(machine.jumlah),
      totalPower: formatQuantity(machine.totalDaya, "kW"),
      hoursPerDay: formatQuantity(machine.waktu, "jam"),
      perDay: formatQuantity(machine.dayaPerHari, "kWh"),
    })),
    totalPower: formatQuantity(listrik.totalPower, "kW"),
    totalPerDay: formatQuantity(listrik.totalDailyConsumption, "kWh"),
  };
}

// ─── Tahap 9 — Kapasitas Produksi ─────────────────────────────────────────────────────

const PRODUCTION_TONES: Record<ProductionQtyVerificationStatusValue, Tone> = {
  PENDING: "slate",
  SESUAI: "green",
  MEMENUHI: "green",
  TIDAK_SESUAI: "red",
  TIDAK_MEMENUHI: "red",
};

export function productionVerdict(status: ProductionQtyVerificationStatusValue | undefined): Verdict {
  const value = status ?? "PENDING";
  return { label: PRODUCTION_QTY_VERIFICATION_STATUS_LABELS[value], tone: PRODUCTION_TONES[value] };
}

/** Totals per unit — quantities in different units are never summed together. */
function totalsByUnit(rows: { quantity: number | null; unit: string }[]): string {
  const totals = new Map<string, number>();
  for (const row of rows) if (row.quantity !== null) totals.set(row.unit, (totals.get(row.unit) ?? 0) + row.quantity);
  return [...totals].map(([unit, total]) => formatQuantity(total, unit)).join(" · ") || "—";
}

/**
 * Kapasitas Produksi berdasarkan Perizinan, Jumlah Produksi Periode Satu Tahun Sebelumnya and
 * Jumlah Rencana Produksi Periode Tahun Berikutnya — as declared, with the Verifikator's decision.
 */
export function buildKapasitasStage(input: VkiStageInput) {
  const stage = kapasitasData(input);
  // As the Verifikator's recap: the installed capacity may not exceed the licensed one.
  const overLicence = input.capacity.filter((row) => {
    const licensed = parseNumeric(row.berdasarkanIzin);
    const installed = parseNumeric(row.kapasitasTerpasang);
    return licensed !== null && installed !== null && installed > licensed;
  }).length;
  const licensedVerdict: Verdict = !input.capacity.length ? NOT_FILLED : overLicence ? { label: "Tidak Sesuai", tone: "red" } : { label: "Sesuai", tone: "green" };
  return {
    ...stage,
    checks: [
      check(
        "Kapasitas produksi berdasarkan perizinan",
        `${stage.licensed.length} KBLI`,
        !input.capacity.length ? "—" : overLicence ? `${overLicence} kapasitas terpasang melebihi izin` : "Kapasitas terpasang tidak melebihi izin",
        licensedVerdict,
        VKI_DATA_REGULATION.kapasitas,
      ),
      check("Jumlah produksi periode satu tahun sebelumnya", `${stage.previous.rows.length} produk`, sectionResult(stage.previous.rows, stage.previous.total), rowsVerdict(stage.previous.rows, stage.previous.verdict), VKI_DATA_REGULATION.produksiSebelumnya),
      check("Rencana produksi periode tahun berikutnya", `${stage.plan.rows.length} produk`, sectionResult(stage.plan.rows, stage.plan.total), rowsVerdict(stage.plan.rows, stage.plan.verdict), VKI_DATA_REGULATION.rencana),
    ] satisfies VkiCheck[],
  };
}

function kapasitasData(input: VkiStageInput) {
  const section = (name: "sebelumnya" | "rencana") => {
    const rows = input.productionQty
      .filter((item) => item.section === name)
      .map((item) => {
        const entry = input.productionQtyStatuses[item.key];
        return {
          key: item.key,
          productId: item.productId,
          product: item.jenisProduk || "—",
          description: item.deskripsiProduk || null,
          hsCode: item.hsCode || null,
          quantity: parseNumeric(item.jumlah),
          unit: item.satuan || "",
          verdict: productionVerdict(entry?.status),
          note: entry?.keterangan ?? null,
        };
      });
    const summary = input.productionQtyStatuses[`summary:${name}`];
    return {
      rows,
      total: totalsByUnit(rows),
      verdict: summary ? productionVerdict(summary.status) : null,
      conclusion: summary?.kesimpulan ?? null,
    };
  };
  const previous = section("sebelumnya");
  const plan = section("rencana");
  const previousOf = new Map(previous.rows.map((row) => [row.productId, row.quantity]));
  return {
    licensed: input.capacity.map((row) => {
      const licensed = parseNumeric(row.berdasarkanIzin);
      const installed = parseNumeric(row.kapasitasTerpasang);
      return {
        id: row.id,
        product: row.jenisProduk || "—",
        kbli: [row.kbliCode, row.kbliDescription].filter(Boolean).join(" – ") || null,
        licensed: formatQuantity(licensed, row.satuan),
        installed: formatQuantity(installed, row.satuan),
        // Share of the licensed capacity actually installed.
        utilisation: licensed && installed !== null ? `${formatQuantity((installed / licensed) * 100)}%` : "—",
      };
    }),
    previous,
    plan: {
      ...plan,
      rows: plan.rows.map((row) => {
        const before = previousOf.get(row.productId) ?? null;
        const growth = before && row.quantity !== null ? ((row.quantity - before) / before) * 100 : null;
        return { ...row, growth: growth === null ? "—" : `${growth >= 0 ? "+" : ""}${formatQuantity(growth)}%` };
      }),
    },
  };
}

// ─── Tahap 10 — Kebutuhan Bahan Baku ───────────────────────────────────────────────────

type MaterialTopic = "penggunaan" | "stok" | "rencana-kebutuhan";

/**
 * Penggunaan Bahan Baku/Penolong Periode Satu Tahun Sebelumnya, Jumlah Stok Terkini and Rencana
 * Kebutuhan 1 Tahun ke Depan — as declared, with the Verifikator's decision per row and per section.
 */
export function buildBahanBakuStage(input: VkiStageInput) {
  const stage = bahanBakuData(input);
  const row = (parameter: string, section: typeof stage.usage, regulation: string) =>
    check(parameter, `${new Set(section.rows.map((item) => item.rawMaterialId)).size} bahan baku`, sectionResult(section.rows, section.total), rowsVerdict(section.rows, section.verdict), regulation);
  return {
    ...stage,
    checks: [
      row("Penggunaan bahan baku/penolong periode satu tahun sebelumnya", stage.usage, VKI_DATA_REGULATION.produksiSebelumnya),
      row("Stok terkini bahan baku/penolong", stage.stock, VKI_DATA_REGULATION.stok),
      row("Rencana kebutuhan bahan baku/penolong 1 tahun ke depan", stage.plan, VKI_DATA_REGULATION.rencana),
    ] satisfies VkiCheck[],
  };
}

function bahanBakuData(input: VkiStageInput) {
  const section = (topic: MaterialTopic, value: (row: RawMaterialUsageRow) => number | null) => {
    const rows = input.rawMaterialUsage.map((row) => {
      const entry = input.productionQtyStatuses[rawMaterialUsageRowKey(topic, row.id)];
      return {
        key: row.id,
        rawMaterialId: row.rawMaterialId,
        material: row.jenis || "—",
        description: row.deskripsi || row.hsDesc || null,
        hsCode: row.hsCode || null,
        product: row.productName || null,
        quantity: value(row),
        unit: row.satuan || "",
        verdict: productionVerdict(entry?.status),
        note: entry?.keterangan ?? null,
      };
    });
    // A raw material used for several products repeats the same figure on each row — count it once.
    const counted = rows.filter((row, index) => rows.findIndex((other) => other.rawMaterialId === row.rawMaterialId) === index);
    const summary = input.productionQtyStatuses[`summary:${topic}`];
    return {
      rows,
      total: totalsByUnit(counted),
      verdict: summary ? productionVerdict(summary.status) : null,
      conclusion: summary?.kesimpulan ?? null,
    };
  };
  const plan = section("rencana-kebutuhan", (row) => {
    const domestic = parseNumeric(row.rencanaKebutuhanDalamNegeri);
    const foreign = parseNumeric(row.rencanaKebutuhanLuarNegeri);
    return parseNumeric(row.rencanaKebutuhan) ?? (domestic === null && foreign === null ? null : (domestic ?? 0) + (foreign ?? 0));
  });
  return {
    usage: section("penggunaan", (row) => parseNumeric(row.penggunaan)),
    stock: section("stok", (row) => parseNumeric(row.dataStock)),
    plan: {
      ...plan,
      rows: plan.rows.map((row, index) => {
        const source = input.rawMaterialUsage[index];
        return {
          ...row,
          domestic: formatQuantity(parseNumeric(source.rencanaKebutuhanDalamNegeri), row.unit),
          foreign: formatQuantity(parseNumeric(source.rencanaKebutuhanLuarNegeri), row.unit),
          origin: source.rencanaKebutuhanNegaraAsal || null,
        };
      }),
    },
  };
}

// ─── Tahap 11 — Penjualan Dalam Negeri & Ekspor ───────────────────────────────────────

/** Penjualan dalam negeri and ekspor per product, with the export share and the Verifikator's conclusion. */
export function buildPenjualanStage(input: VkiStageInput) {
  const stage = penjualanData(input);
  return {
    ...stage,
    checks: [
      check(
        "Penjualan dalam negeri dan ekspor",
        `${stage.rows.length} produk`,
        stage.rows.length ? `Dalam negeri ${stage.totalDomestic} · ekspor ${stage.totalExport}` : "—",
        presenceVerdict(stage.rows.length, stage.verdict),
        VKI_DATA_REGULATION.penjualan,
      ),
    ] satisfies VkiCheck[],
  };
}

function penjualanData(input: VkiStageInput) {
  const rows = input.sales.map((row) => {
    const domestic = parseNumeric(row.dalamNegeri);
    const exported = parseNumeric(row.luarNegeri);
    const total = domestic === null && exported === null ? null : (domestic ?? 0) + (exported ?? 0);
    return {
      id: row.id,
      product: row.productName || "—",
      description: row.deskripsi || null,
      hsCode: row.hsCode || null,
      unit: row.satuan || "",
      domestic,
      exported,
      total,
      exportShare: total ? `${formatQuantity(((exported ?? 0) / total) * 100)}%` : "—",
      destination: row.negaraTujuan || null,
    };
  });
  const summary = input.productionQtyStatuses["summary:penjualan"];
  return {
    rows,
    totalDomestic: totalsByUnit(rows.map((row) => ({ quantity: row.domestic, unit: row.unit }))),
    totalExport: totalsByUnit(rows.map((row) => ({ quantity: row.exported, unit: row.unit }))),
    verdict: summary ? productionVerdict(summary.status) : null,
    conclusion: summary?.kesimpulan ?? null,
  };
}

// ─── Tahap 12 — Tenaga Kerja ───────────────────────────────────────────────────────────

export function buildTenagaKerjaStage(input: VkiStageInput) {
  return {
    workforce: input.workforce,
    total: input.workforce.reduce((sum, entry) => sum + entry.count, 0),
    documents: documentsWhere(input, (row) => row.category === "Tenaga Kerja"),
  };
}

// ─── Tahap 13 — Surat Pernyataan ───────────────────────────────────────────────────────

const STATEMENT_KEYS = ["vki-support:tidak-diperjualbelikan", "vki-support:kebenaran-data", "vki-support:memiliki-menguasai"];

export function buildPernyataanStage(input: VkiStageInput) {
  return {
    statements: input.statements.filter((statement) => statement.key !== "alur-proses"),
    documents: documentsWhere(input, (row) => STATEMENT_KEYS.includes(row.key)),
  };
}

// ─── Tahap 14 — Analisis Teknis ────────────────────────────────────────────────────────

/** The three sub-stages of Tahap 14, in order. */
export const VKI_ANALYSIS_LABELS: Record<VkiModuleKey, string> = {
  listrik: "Analisis Kebutuhan dan Pemakaian Energi Listrik",
  kapasitas: "Analisis Kapasitas Produksi",
  bahanbaku: "Analisis Kapasitas Kebutuhan Bahan Baku",
};

export type AnalysisCell = string | { text: string; tone: Tone };
export type AnalysisTable = { title: string; headers: string[]; rows: AnalysisCell[][]; empty: string };
/** One lettered part of a sub-stage, as the Technical Analyst's module lays it out. */
export type AnalysisPart = {
  title: string;
  stats: [string, string][];
  formula?: string;
  tables: AnalysisTable[];
};

const rupiah = (value: number | null, digits = 0) =>
  value === null ? "—" : `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value)}`;
const lettered = (parts: Omit<AnalysisPart, "title">[], titles: string[]): AnalysisPart[] =>
  parts.map((part, index) => ({ ...part, title: `${String.fromCharCode(65 + index)}. ${titles[index]}` }));

// The Technical Analyst's bill-vs-estimate bands, as tones.
const VARIANCE_TONES: Record<string, Tone> = { "Sangat Sesuai": "green", "Masih Wajar": "green", "Perlu Klarifikasi": "orange", "Perlu Verifikasi Lebih Lanjut": "red" };
const varianceCell = (label: string): AnalysisCell => ({ text: label, tone: VARIANCE_TONES[label] ?? "slate" });

/** Sumber energi listrik selain PLN, as the Technical Analyst's Energi Listrik tab lists them. */
const ENERGY_SOURCES = [
  ["genset", "Genset", "Pembangkit listrik sendiri, umumnya menggunakan diesel/solar"],
  ["plts", "PLTS / Solar Panel", "Pembangkit listrik tenaga surya"],
  ["pltmh", "PLTMH / PLTA", "Pembangkit listrik tenaga air"],
  ["pltb", "PLTB", "Pembangkit listrik tenaga angin"],
  ["biomassa", "Biomassa", "Pembangkit listrik berbasis biomassa"],
  ["gas", "Pembangkit Listrik Gas", "Pembangkit sendiri menggunakan gas"],
  ["lainnya", "Lainnya", "Sumber listrik lain yang dapat dibuktikan secara administratif/fisik"],
] as const;

/**
 * 14.1 — as the Technical Analyst's Energi Listrik tab: A. daya per mesin, B. beban produksi teoritis
 * (load factor 85% + non-operasional 15%, tarif, estimasi tagihan), C. the PLN bills against it.
 */
function energiAnalysis(input: VkiStageInput): AnalysisPart[] {
  const inputs = input.technicalInputs?.listrik;
  const months = input.electricity.map((month, index) => ({ id: String(index), bulan: month.month ?? undefined, kwh: month.kwh ?? undefined, nominal: month.nominal ?? undefined }));
  const calc = computeListrik(input.machines, months, inputs, input.tariff?.perKwh ?? null);
  const kw = (value: number | null) => formatQuantity(value, "kW");
  const kwh = (value: number | null) => formatQuantity(value, "kWh");
  return lettered(
    [
      {
        stats: [],
        tables: [
          {
            title: "Tabel Data Daya Mesin",
            headers: ["Mesin", "Quantity", "Daya/Unit (kW)", "Total Daya (kW)", "Jam Operasi", "Daya Digunakan/Hari (kWh)"],
            rows: calc.machineRows.length
              ? [
                  ...calc.machineRows.map((machine) => [
                    machine.nama || "—",
                    formatQuantity(machine.jumlah, "pcs"),
                    kw(machine.power),
                    formatQuantity(machine.totalDaya),
                    formatQuantity(machine.waktu, "jam"),
                    formatQuantity(machine.dayaPerHari),
                  ]),
                  ["Total Daya Mesin Produksi", "—", "—", kw(calc.totalPower), "—", kwh(calc.totalDailyConsumption)],
                ]
              : [],
            empty: "Belum ada data mesin.",
          },
        ],
      },
      {
        stats: [
          ["Total Daya Terpasang", kw(calc.totalPower)],
          ["Total Power Consumption per Hari", `${kwh(calc.totalDailyConsumption)}/hari`],
          ["Jumlah Hari Operasi per Bulan", `${formatQuantity(calc.hariOperasiPerBulan)} hari/bulan`],
          [`Total Power Consumption Perusahaan per Bulan (${formatQuantity(calc.hariOperasiPerBulan)} hari operasi)`, formatQuantity(Math.round(calc.totalMonthlyConsumption), "kWh")],
          ["Golongan Tarif Listrik", input.tariff?.label ?? "—"],
          ["Tarif Nominal per kWh", input.tariff?.perKwh != null ? `${rupiah(input.tariff.perKwh, 2)} / kWh` : "—"],
          ["Estimasi Jumlah Pembayaran Listrik per Bulan", rupiah(calc.estimasiPembayaran)],
        ],
        formula: `${kwh(calc.totalDailyConsumption)}/hari × 85% = ${kwh(calc.rataRataBeban)} (mesin) + ${kwh(calc.nonOperasional)} (non-operasional, 15%) = ${kwh(calc.totalKebutuhanHarian)}/hari`,
        tables: [
          {
            title: "Sumber Energi Listrik Selain PLN",
            headers: ["No", "Sumber Energi Listrik", "Keterangan", "Ada / Tidak", "Jumlah Pemakaian"],
            rows: ENERGY_SOURCES.map(([key, label, description], index) => {
              const present = inputs?.[`energySource_${key}_status`] === "ada";
              return [String(index + 1), label, description, present ? { text: "Ada", tone: "green" } : "Tidak", present ? inputs?.[`energySource_${key}_jumlah`] || "—" : "—"];
            }),
            empty: "—",
          },
        ],
      },
      {
        stats: [],
        tables: [
          {
            title: "Perbandingan dengan Rekening Listrik",
            headers: ["Bulan", "Estimasi Perhitungan", "Tagihan PLN Aktual", "Selisih", "Status"],
            rows: calc.varianceRows.map((row) => [
              row.month.bulan ?? "—",
              rupiah(calc.estimasiPembayaran),
              rupiah(row.actualNominal),
              row.variancePct === null ? "—" : `${formatQuantity(row.variancePct)}%`,
              varianceCell(row.meta.label),
            ]),
            empty: "Belum ada data tagihan listrik.",
          },
        ],
      },
    ],
    ["Data Mesin dan Perhitungan Daya", "Beban Produksi Teoritis", "Analisis Tagihan Listrik terhadap Kapasitas Produksi"],
  );
}

/**
 * 14.2 — as the Technical Analyst's Kapasitas Produksi tab: A. capacity per machine (bottleneck marked),
 * B. the bottleneck and the line's theoretical capacity, C. kapasitas per tahun sesuai Perizinan
 * Berusaha vs hasil VKI, D. the planned production against the line's yearly capacity.
 */
function kapasitasAnalysis(input: VkiStageInput): AnalysisPart[] {
  const line = computeBottleneck(input.machines, input.kapasitasInputs);
  const unit = line.satuanLini;
  const yearly = line.kapasitasLiniTahunan;
  // One row per product: last year's and the planned volume, as on Verifikasi Jumlah Produksi.
  const byProduct = new Map<string, { product: string; hsCode: string; unit: string; previous: string; plan: string }>();
  for (const item of input.productionQty) {
    const row = byProduct.get(item.productId) ?? { product: item.jenisProduk, hsCode: item.hsCode, unit: item.satuan, previous: "", plan: "" };
    if (item.section === "sebelumnya") row.previous = item.jumlah;
    else row.plan = item.jumlah;
    byProduct.set(item.productId, row);
  }
  return lettered(
    [
      {
        stats: [],
        tables: [
          {
            title: "",
            headers: ["Mesin", "Unit", "Kapasitas/Unit per Jam", "Jam Operasi", "Kapasitas/Hari", "Hari Efektif", "Kapasitas/Tahun"],
            rows: line.machineRows.map((machine) => [
              line.bottleneck?.id === machine.id ? { text: `${machine.nama || "—"} (Bottleneck)`, tone: "red" } : machine.nama || "—",
              machine.quantity || "—",
              machine.kapasitasJam ? `${machine.kapasitasJam} ${machine.kapasitasJamSatuan}`.trim() : "—",
              machine.waktuBeroperasi ? `${machine.waktuBeroperasi} jam` : "—",
              formatQuantity(machine.perHari, machine.kapasitasJamSatuan),
              machine.hariEfektifPerTahun ? `${machine.hariEfektifPerTahun} hari` : "—",
              formatQuantity(machine.perTahun, machine.kapasitasJamSatuan),
            ]),
            empty: "Belum ada data mesin.",
          },
        ],
      },
      {
        stats: [
          ["Mesin/Proses Bottleneck", line.bottleneck ? `${line.bottleneck.nama || "—"} (${line.chosenBottleneck ? "dipilih analis" : "otomatis, kapasitas/hari terkecil"})` : "—"],
          ["Kapasitas Lini per Hari", formatQuantity(line.kapasitasLiniHarian === null ? null : Math.round(line.kapasitasLiniHarian), unit)],
          ["Kapasitas Lini per Bulan (rata-rata)", formatQuantity(line.kapasitasLiniBulanan === null ? null : Math.round(line.kapasitasLiniBulanan), unit)],
          [
            "Kapasitas Produksi per Tahun",
            yearly === null
              ? "—"
              : `${formatQuantity(Math.round(yearly), unit)} (${formatQuantity(Math.round(line.kapasitasLiniHarian ?? 0))} × ${formatQuantity(line.hariEfektif)} hari efektif)`,
          ],
        ],
        tables: [],
      },
      {
        stats: [],
        tables: [
          {
            title: "",
            headers: ["No", "Jenis Produk", "KBLI", "Sesuai Perizinan Berusaha", "Kapasitas Terpasang", "Sesuai Hasil VKI", "Satuan", "Selisih"],
            rows: capacitySummary(input.capacity, input.kapasitasInputs).map((row, index) => [
              String(index + 1),
              row.jenisProduk || "—",
              row.kbli || "—",
              formatQuantity(row.izin),
              formatQuantity(row.terpasang),
              formatQuantity(row.vki),
              row.satuan || "—",
              row.selisihPct === null ? "—" : `${row.selisihPct >= 0 ? "+" : ""}${formatQuantity(row.selisihPct)}%`,
            ]),
            empty: "Belum ada data kapasitas perizinan.",
          },
        ],
      },
      {
        stats: [],
        tables: [
          {
            title: "",
            headers: ["Produk", "HS Code", "Vol. Sebelumnya", "Vol. Rencana", "Vol. Perhitungan (Tahunan)", "Satuan", "Status"],
            rows: [...byProduct.values()].map((row): AnalysisCell[] => {
              const plan = parseNumeric(row.plan);
              return [
                row.product || "—",
                row.hsCode || "—",
                formatQuantity(parseNumeric(row.previous)),
                formatQuantity(plan),
                formatQuantity(yearly === null ? null : Math.round(yearly)),
                row.unit || "—",
                // Within the line's yearly capacity — as the Technical Analyst judges it.
                yearly === null || plan === null ? "—" : plan <= yearly ? { text: "Sesuai", tone: "green" } : { text: "Tidak Sesuai", tone: "red" },
              ];
            }),
            empty: "Belum ada data rencana produksi.",
          },
        ],
      },
    ],
    [
      "Data Produksi Mesin",
      "Penentuan Bottleneck dan Kapasitas Teoritis",
      "Kapasitas Produksi per Tahun: Perizinan Berusaha dan Hasil VKI",
      "Perbandingan Kapasitas dengan Rencana Produksi",
    ],
  );
}

/**
 * 14.3 — as the Technical Analyst's Kapasitas Kebutuhan Bahan Baku tab: A. the 1-year need per product
 * and bahan baku (Verifikasi Jumlah Produksi) with its conversion ratio, B. the need by capacity per
 * Perizinan Berusaha and per hasil VKI (× rasio konversi, or the analyst's own figure) against the application.
 */
function bahanBakuAnalysis(input: VkiStageInput): AnalysisPart[] {
  const data: TechnicalAnalysisData = {
    kapasitas: { status: input.modules.kapasitas?.status ?? "PENDING", inputs: input.kapasitasInputs },
    bahanbaku: { status: input.modules.bahanbaku?.status ?? "PENDING", inputs: input.technicalInputs?.bahanbaku },
  };
  const needs = materialNeeds(input.conversions, input.capacity, data, input.rawMaterialUsage);
  return lettered(
    [
      {
        stats: [],
        tables: [
          {
            title: "",
            headers: ["Produk", "Bahan Baku", "HS Code", "Kategori", "Rencana Kebutuhan 1 Tahun (Total)", "Dalam Negeri", "Luar Negeri", "Satuan", "Rasio Konversi"],
            rows: input.conversions.map((row) => {
              const plan = rencanaKebutuhanOf(row, input.rawMaterialUsage);
              const abroad = formatQuantity(plan.luarNegeri);
              return [
                row.productName || "—",
                row.jenis || "—",
                row.hsCode || "—",
                MATERIAL_CATEGORIES[row.kategori] ?? (row.kategori || "—"),
                formatQuantity(plan.total),
                formatQuantity(plan.dalamNegeri),
                plan.negaraAsal ? `${abroad}\n${plan.negaraAsal}` : abroad,
                plan.satuan || "—",
                row.rasioKonversi || "—",
              ];
            }),
            empty: "Belum ada data konversi bahan baku.",
          },
        ],
      },
      {
        stats: [],
        tables: [
          {
            title: "",
            headers: ["No", "Jenis Produksi", "Bahan Baku dan/atau Bahan Penolong", "Berdasarkan Izin", "Berdasarkan VKI", "Berdasarkan Permohonan", "Satuan"],
            rows: needs.map((row, index) => [
              String(index + 1),
              row.produk || "—",
              row.hsCode ? `${row.bahanBaku || "—"}\nHS ${row.hsCode}` : row.bahanBaku || "—",
              formatQuantity(row.izin),
              formatQuantity(row.vki),
              formatQuantity(row.permohonan),
              row.satuan || "—",
            ]),
            empty: "Belum ada data konversi bahan baku.",
          },
        ],
      },
    ],
    ["Kebutuhan Bahan Baku per Produk", "Rekapitulasi Total Kebutuhan Bahan Baku"],
  );
}

const ANALYSES: Record<VkiModuleKey, (input: VkiStageInput) => AnalysisPart[]> = {
  listrik: energiAnalysis,
  kapasitas: kapasitasAnalysis,
  bahanbaku: bahanBakuAnalysis,
};

/**
 * Tahap 14 in three sub-stages — Energi Listrik, Kapasitas Produksi, Kebutuhan Bahan Baku: each in the
 * lettered parts of the Technical Analyst's module (the same calculations as the TA workspace and its
 * report), with the module decision and the analyst's kesimpulan.
 */
export function buildAnalisisStage(input: VkiStageInput) {
  return VKI_MODULE_KEYS.map((key, index) => {
    const decision = input.modules[key];
    return {
      key,
      number: `14.${index + 1}`,
      label: VKI_ANALYSIS_LABELS[key],
      verdict: moduleVerdict(decision),
      parts: ANALYSES[key](input),
      kesimpulan: decision?.kesimpulan ?? null,
    };
  });
}
