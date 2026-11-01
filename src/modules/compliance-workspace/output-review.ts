import { capacitySummary, materialNeeds, materialTotals } from "@/modules/technical-analyst-workspace/lhvki-summary";
import type { TechnicalAnalysisData } from "@/modules/technical-analyst-workspace/schema";
import type { CaseDetailInput } from "./case-detail";
import { formatCalendarDate } from "./components/case-list/format";
import { lhviuValidity } from "./dossier";
import type { KonsumsiStageInput, Verdict } from "./konsumsi-stages";
import type { LokasiInput } from "./lokasi";
import { SCHEME_META, type ComplianceScheme } from "./scheme";
import type { LegalitasStage } from "./server/load-legalitas";
import { formatQuantity, type VkiStageInput } from "./vki-stages";
import { workingDaysBetween } from "./working-days";

/*
 * The last stage of a case — the LHVKI (VKI) or LHVIU (VIU Konsumsi) — checked against Permenperin
 * 27/2025 (pure):
 * - its minimum content (LHVKI: Pasal 32 ayat (3) huruf a–i; LHVIU barang konsumsi: Pasal 39 ayat (5)
 *   huruf a–j): is the data each item needs on record;
 * - the time limits: VKI verification within 10 hari kerja (Pasal 31 ayat (1)), VIU verification within
 *   10 hari (Pasal 38 ayat (1) — calendar days, not hari kerja), the output within 5 hari kerja after it
 *   (Pasal 32 ayat (1), Pasal 39 ayat (1)). Both may be adjusted (Pasal 31 ayat (3), Pasal 38 ayat (4)),
 *   so a breach is a warning, never a finding of its own.
 */

export type OutputContentItem = { letter: string; label: string; value: string; verdict: Verdict };
export type OutputDeadline = {
  label: string;
  period: string;
  days: number | null;
  limit: number;
  unit: "hari" | "hari kerja";
  regulation: string;
  verdict: Verdict;
};

export type OutputReviewInput = {
  detail: Pick<CaseDetailInput, "row" | "lhviu" | "milestones">;
  company: LegalitasStage["company"] | null;
  lokasi: LokasiInput | null;
  vki?: VkiStageInput | null;
  konsumsi?: KonsumsiStageInput | null;
  today: string;
};

const DASH = "—";
const AVAILABLE: Verdict = { label: "Tersedia", tone: "green" };
const MISSING: Verdict = { label: "Belum tersedia", tone: "orange" };
const filled = (value: string | null | undefined) => Boolean(value && value.trim() && value.trim() !== DASH);
const dayOf = (value: string | null | undefined) => (value ? value.slice(0, 10) : null);

function item(letter: string, label: string, value: string | null, ready = filled(value)): OutputContentItem {
  return { letter, label, value: filled(value) ? value! : DASH, verdict: ready ? AVAILABLE : MISSING };
}

/** One item from several fields: "Belum ada: …" naming the missing ones, else `summary`. */
function composite(letter: string, label: string, fields: readonly (readonly [string, string | null | undefined])[], summary: () => string): OutputContentItem {
  const missing = fields.filter(([, value]) => !filled(value)).map(([name]) => name);
  return { letter, label, value: missing.length ? `Belum ada: ${missing.join(", ")}` : summary(), verdict: missing.length ? MISSING : AVAILABLE };
}

/** Per unit, summed — "1.500.000 Pasang", or "—" without a figure. */
function totals(rows: { value: number | null; unit: string }[]): string {
  const sums = new Map<string, number>();
  for (const row of rows) if (row.value !== null) sums.set(row.unit, (sums.get(row.unit) ?? 0) + row.value);
  return [...sums].map(([unit, sum]) => formatQuantity(sum, unit)).join(" · ") || DASH;
}

/** Issue date, validity and issuer — the closing items of both outputs. */
function issueItems(input: OutputReviewInput, letters: [string, string, string]): OutputContentItem[] {
  const { lhviu, row } = input.detail;
  const meta = SCHEME_META[row.scheme];
  const issued = row.lhviuIssued && lhviu.issuedAt ? lhviu.issuedAt : null;
  return [
    item(letters[0], `Tanggal penerbitan ${meta.output}`, issued ? formatCalendarDate(issued) : null),
    item(
      letters[1],
      `Masa berlaku ${meta.output} (${meta.validityYears} tahun, ${meta.validityBasis})`,
      issued ? `s.d. ${formatCalendarDate(lhviuValidity(issued, input.today, meta.validityYears).validUntil)}` : null,
    ),
    // The Project Manager's name is on record; the official's jabatan is printed on the output itself.
    item(letters[2], "Nama dan jabatan pejabat yang menerbitkan", lhviu.issuedBy ? `${lhviu.issuedBy} (Project Manager)` : null),
  ];
}

const MATERIAL_TABLE = "Tersedia di Analisis Teknis — 14.3 Analisis Kapasitas Kebutuhan Bahan Baku (Rekapitulasi Total Kebutuhan Bahan Baku)";

/** Pasal 32 ayat (3): what the LHVKI must state at least, and whether the case has the data for it. */
function lhvkiContent(input: OutputReviewInput): OutputContentItem[] {
  const { detail, company, lokasi, vki } = input;
  const pabrik = lokasi?.locations.find((location) => location.type === "Pabrik")?.address ?? null;
  const capacity = vki ? capacitySummary(vki.capacity, vki.kapasitasInputs) : [];
  const data: TechnicalAnalysisData = {
    kapasitas: { status: vki?.modules.kapasitas?.status ?? "PENDING", inputs: vki?.kapasitasInputs },
    bahanbaku: { status: vki?.modules.bahanbaku?.status ?? "PENDING", inputs: vki?.technicalInputs?.bahanbaku },
  };
  const needs = vki ? materialTotals(materialNeeds(vki.conversions, vki.capacity, data, vki.rawMaterialUsage)) : [];

  return [
    item("a", "Nomor LHVKI", detail.lhviu.number),
    composite(
      "b",
      "Identitas perusahaan: nama, alamat kantor, alamat pabrik, NIB, KBLI, dan bidang usaha",
      [["Nama", company?.name], ["Alamat kantor", company?.officeAddress], ["Alamat pabrik", pabrik], ["NIB", company?.nib], ["KBLI dan bidang usaha", company?.kbliUtama]],
      () => `${company!.name} · NIB ${company!.nib}`,
    ),
    item("c", "Kapasitas produksi per tahun sesuai Perizinan Berusaha", totals(capacity.map((entry) => ({ value: entry.izin, unit: entry.satuan })))),
    item("d", "Kapasitas produksi per tahun sesuai hasil VKI", totals(capacity.map((entry) => ({ value: entry.vki, unit: entry.satuan })))),
    // One figure per bahan baku, possibly many: pointed to, not listed here.
    item("e", "Kebutuhan bahan baku/penolong 1 tahun sesuai kapasitas produksi", needs.some((entry) => entry.izin !== null) ? MATERIAL_TABLE : null),
    item("f", "Kebutuhan bahan baku/penolong 1 tahun sesuai hasil VKI", needs.some((entry) => entry.vki !== null) ? MATERIAL_TABLE : null),
    ...issueItems(input, ["g", "h", "i"]),
  ];
}

/** Pasal 39 ayat (5): what the LHVIU barang konsumsi must state at least — per product or brand data is pointed to its stage. */
function lhviuContent(input: OutputReviewInput): OutputContentItem[] {
  const { detail, company, lokasi, konsumsi } = input;
  const gudang = lokasi?.locations.find((location) => location.type === "Gudang")?.address ?? konsumsi?.warehouses[0] ?? null;
  const brands = konsumsi?.brands ?? [];
  const products = konsumsi?.products ?? [];
  const withoutOwner = brands.filter((brand) => !filled(brand.ownerName)).length;
  const withoutHs = products.filter((product) => !filled(product.hsCode) || !filled(product.hsDescription)).length;
  const withoutOrigin = products.filter((product) => !product.originCountries?.length).length;
  const pointer = (stage: string) => `Tersedia di ${stage}`;

  return [
    item("a", "Nomor LHVIU", detail.lhviu.number),
    composite(
      "b",
      "Identitas Perusahaan API-U: nama, alamat kantor, alamat gudang, NIB, KBLI, dan bidang usaha",
      [["Nama", company?.name], ["Alamat kantor", company?.officeAddress], ["Alamat gudang", gudang], ["NIB", company?.nib], ["KBLI dan bidang usaha", company?.kbliUtama]],
      () => `${company!.name} · NIB ${company!.nib}`,
    ),
    item(
      "c",
      "Identitas pemilik merek, atau pemilik merek dan Perwakilan Resmi bila pemilik merek di luar negeri",
      brands.length && !withoutOwner ? pointer(`Tahap 4 — Merek & Hubungan Importir (${brands.length} merek)`) : brands.length ? `Pemilik belum tercatat pada ${withoutOwner} merek` : null,
      brands.length > 0 && withoutOwner === 0,
    ),
    item(
      "d",
      "Pos tarif/harmonized system dan uraian barang yang akan diimpor",
      products.length && !withoutHs ? pointer(`Tahap 5 — Rencana Impor (${products.length} produk)`) : products.length ? `HS/uraian belum lengkap pada ${withoutHs} produk` : null,
      products.length > 0 && withoutHs === 0,
    ),
    item(
      "e",
      "Asal negara dan merek",
      products.length && !withoutOrigin ? pointer("Tahap 5 — Rencana Impor") : products.length ? `Asal negara belum tercatat pada ${withoutOrigin} produk` : null,
      products.length > 0 && withoutOrigin === 0,
    ),
    item("f", "Jumlah stok terkini per jenis dan pos tarif/harmonized system", products.length ? pointer("Tahap 6 — Stok Terkini") : null),
    item(
      "g",
      "Hasil uji mutu, apabila SNI atau spesifikasi teknis tidak diberlakukan secara wajib",
      konsumsi?.certificates.length ? pointer(`Tahap 7 — Uji Mutu (${konsumsi.certificates.length} sertifikat)`) : null,
    ),
    ...issueItems(input, ["h", "i", "j"]),
  ];
}

/** The output's minimum content for the case's scheme. */
export function outputContent(input: OutputReviewInput): OutputContentItem[] {
  return input.detail.row.scheme === "vki" ? lhvkiContent(input) : lhviuContent(input);
}

/** Calendar days from `start` to `end` (the start day not counted). */
function calendarDaysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end || end < start) return null;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

function deadline(label: string, start: string | null, end: string | null, limit: number, unit: OutputDeadline["unit"], regulation: string): OutputDeadline {
  const days = unit === "hari" ? calendarDaysBetween(start, end) : workingDaysBetween(start, end);
  return {
    label,
    period: start && end ? `${formatCalendarDate(start)} – ${formatCalendarDate(end)}` : DASH,
    days,
    limit,
    unit,
    regulation,
    verdict:
      days === null
        ? { label: "Belum dapat dihitung", tone: "slate" }
        : days <= limit
          ? { label: "Dalam batas waktu", tone: "green" }
          : { label: `Melebihi ${days - limit} ${unit}`, tone: "orange" },
  };
}

const DEADLINES: Record<ComplianceScheme, { verification: [string, number, OutputDeadline["unit"], string]; issue: string; adjustment: string }> = {
  // Pasal 31 ayat (2) huruf b puts the Technical Analyst's capability-vs-needs assessment in the verification.
  vki: { verification: ["Verifikasi dokumen, lapangan dan analisis teknis", 10, "hari kerja", "Pasal 31 ayat (1)"], issue: "Pasal 32 ayat (1)", adjustment: "Pasal 31 ayat (3)" },
  konsumsi: { verification: ["Verifikasi dokumen dan lapangan", 10, "hari", "Pasal 38 ayat (1)"], issue: "Pasal 39 ayat (1)", adjustment: "Pasal 38 ayat (4)" },
};

/**
 * Verification ends on the latest of the survey visits, the document verification and (VKI) the
 * technical analysis; the output counts from there, within 5 hari kerja (Senin–Jumat).
 */
export function outputDeadlines({ detail, lokasi }: Pick<OutputReviewInput, "detail" | "lokasi">): OutputDeadline[] {
  const { row, lhviu, milestones } = detail;
  const rules = DEADLINES[row.scheme];
  const submitted = row.submittedIsSystemDate ? null : dayOf(row.submittedAt);
  const ends = [
    ...(lokasi?.locations ?? []).map((location) => dayOf(location.visit?.actualVisitDate)),
    dayOf(milestones?.verificationDate),
    dayOf(milestones?.technicalDate),
  ].filter((day): day is string => day !== null);
  const verified = ends.length ? ends.sort()[ends.length - 1] : null;
  const issued = row.lhviuIssued ? dayOf(lhviu.issuedAt) : null;
  const [label, limit, unit, regulation] = rules.verification;
  return [
    deadline(label, submitted, verified, limit, unit, regulation),
    deadline(`Penerbitan ${SCHEME_META[row.scheme].output} setelah verifikasi`, verified, issued, 5, "hari kerja", rules.issue),
  ];
}

export function deadlineNote(scheme: ComplianceScheme): string {
  return `Jangka waktu dapat disesuaikan bila data dan dokumen memerlukan proses atau persetujuan instansi lain (${DEADLINES[scheme].adjustment}); karena itu kelebihan waktu ditandai sebagai peringatan, bukan temuan.`;
}
