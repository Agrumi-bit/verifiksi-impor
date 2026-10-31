import { buildSummary } from "./case-detail";
import { formatCalendarDate, formatDate } from "./components/case-list/format";
import { CASE_CATEGORY_LABELS, COMPLIANCE_STATUS_LABELS } from "./consolidation";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_TONES, documentSummary, type DocumentRow } from "./document-matrix";
import { buildDossier, lhviuValidity, type DossierInput } from "./dossier";
import { FINDING_KIND_LABELS } from "./finding-rules";
import {
  buildLabelStage,
  buildMerekStage,
  buildRencanaImporStage,
  buildStokStage,
  buildUjiMutuStage,
  documentAgeMonths,
  type KonsumsiStageInput,
  type Tone,
} from "./konsumsi-stages";
import { answerLabel, buildLokasiStage, type LocationInput, type LokasiInput } from "./lokasi";
import { buildMatrix } from "./matrix";
import { REQUIREMENTS, requirementsOfStep } from "./requirements";
import type { LegalitasStage } from "./server/load-legalitas";
import { workingDaysBetween } from "./working-days";
import { WORKSPACE_KEYS, WORKSPACE_LABELS, WORKSPACE_STATE_LABELS } from "./workspace-status";

/**
 * Laporan Hasil Compliance (pure): one case's compliance result as a printable report model —
 * every value is what the source workspaces recorded and what the Compliance views already show
 * (Case Detail, Compliance Matrix, Dossier). Nothing is judged again here; the conclusion only
 * summarises handover, active findings and the verdicts already on screen.
 */

export type ReportTone = Tone;
export type ReportChip = { label: string; count: number; tone: ReportTone };
/** A small card: a title with an optional status pill, then labelled values and/or a paragraph. */
export type ReportCard = { title: string; badge?: { text: string; tone: ReportTone }; fields?: [string, string][]; text?: string };
/** A plain value, or a status pill (with an optional line under it, e.g. "oleh Gibran (Verifikator)"). */
export type ReportCell = string | { text: string; tone: ReportTone; sub?: string };
export type Infographic = {
  score: number;
  /** The requirements as one whole (sums to `total`), in display order. */
  segments: { label: string; value: number; tone: ReportTone }[];
  total: number;
  conclusion: { tone: ReportTone; label: string; text: string };
  kpis: { label: string; value: string; sub: string }[];
  workspaces: { key: string; label: string; state: string; tone: ReportTone }[];
  stages: { num: number; label: string; verdict: string; tone: ReportTone; metric: string }[];
};

/** Section 8 as a figure: the LHVIU cover page next to its number, validity and timeline. */
export type LhviuFigure = {
  issued: boolean;
  number: string;
  /** Stored path of the signed LHVIU PDF — its first page is shown as the cover. */
  coverPath: string | null;
  status: { text: string; tone: ReportTone };
  issuedBy: string;
  /** Terbit → Berlaku sampai, as calendar labels. */
  timeline: { label: string; date: string }[];
  /** Share of the one-year validity elapsed at the report date (0–1), null before issue. */
  elapsed: number | null;
  remaining: string;
  /** Timeline Verifikasi, shown on the same page as the cover. */
  process: ProcessTimeline;
};

/** The verification process on a time axis, and how many working days it took. */
export type ProcessTimeline = {
  steps: { label: string; date: string; note?: string; reached: boolean }[];
  workingDays: number | null;
  /** How the count was taken ("Tanggal Permohonan → Terbit LHVIU", or the fallback start used). */
  basis: string;
};

export type ReportBlock =
  | { kind: "infographic"; data: Infographic }
  | { kind: "lhviu"; data: LhviuFigure }
  | { kind: "fields"; items: [string, string][]; layout?: "grid" }
  | { kind: "cards"; title?: string; columns: number; items: ReportCard[] }
  | { kind: "findings"; items: { issueNumber: string; status: string; tone: ReportTone; requirement: string; title: string }[] }
  | {
      kind: "table";
      title?: string;
      /** A line under the title (first piece only). */
      lede?: string;
      chips?: ReportChip[];
      /** Rows per sheet piece — lower for tables with long text cells. */
      rowsPerPiece?: number;
      /** Column widths (CSS, one per header) — give long text the room so rows stay short. */
      widths?: string[];
      headers: string[];
      rows: ReportCell[][];
      empty: string;
    }
  | { kind: "text"; text: string }
  | { kind: "notes"; title: string; items: { text: string; tone: ReportTone }[] };
export type ReportSection = { key: string; eyebrow: string; title: string; lede?: string; blocks: ReportBlock[] };

export type ComplianceReport = {
  documentNumber: string;
  isFinal: boolean;
  generatedAt: string;
  /** Tanggal Laporan: the LHVIU issue date once issued, else the day the report is generated. */
  reportDate: string;
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  submittedAt: string;
  complianceStatus: string;
  category: string;
  score: number;
  conclusion: { tone: ReportTone; text: string };
  sections: ReportSection[];
};

export type ReportInput = {
  detail: DossierInput;
  legalitas: LegalitasStage | null;
  lokasi: LokasiInput | null;
  konsumsi: KonsumsiStageInput | null;
  generatedAt: string;
};

const DASH = "—";
const REQUIREMENT_LABELS = Object.fromEntries(REQUIREMENTS.map((requirement) => [requirement.key, requirement.label])) as Record<string, string>;
const STEP_STATUS_TONES: Record<string, ReportTone> = {
  Sesuai: "green",
  Completed: "green",
  "Menunggu Handover": "slate",
  "Perlu Klarifikasi": "orange",
  "Open Issue": "red",
  Conflict: "red",
};

function money(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

/** Product rows wrap their merek/kelompok over a few lines — seven rows per sheet piece fit one page. */
const PRODUCT_ROWS_PER_PIECE = 7;

/**
 * Daftar Uraian HS Code — each HS Code of the products once, with its description, so the product
 * tables (Rencana Impor, Stok) need not repeat the long Uraian on every row.
 */
function hsTable(products: KonsumsiStageInput["products"]): ReportBlock {
  const byCode = new Map<string, { description: string | null; kelompok: string | null; subKelompok: string | null; count: number }>();
  for (const product of products) {
    const entry = byCode.get(product.hsCode);
    if (entry) entry.count += 1;
    else byCode.set(product.hsCode, { description: product.hsDescription, kelompok: product.kelompok, subKelompok: product.subKelompok, count: 1 });
  }
  return {
    kind: "table",
    title: "Daftar Uraian HS Code",
    lede: "Uraian setiap HS Code yang diajukan; tabel produk di bawah ini dan di Stok Terkini merujuk ke HS Code ini.",
    widths: ["4%", "9%", "45%", "14%", "18%", "10%"],
    headers: ["No.", "HS Code", "Uraian HS", "Kelompok Komoditas", "Sub Kelompok", "Jumlah Produk"],
    rows: [...byCode].map(([code, entry], index) => [String(index + 1), code, entry.description ?? DASH, entry.kelompok ?? DASH, entry.subKelompok ?? DASH, `${entry.count} produk`]),
    empty: "Permohonan ini belum memuat produk.",
  };
}

/** A document's status cell: the pill, with who verified it underneath. */
function documentCell(row: DocumentRow | null): ReportCell {
  if (!row) return { text: "Tidak ada dokumen", tone: "slate" };
  return { text: VERIFICATION_STATUS_LABELS[row.status], tone: VERIFICATION_STATUS_TONES[row.status], sub: row.verifiedBy ? `oleh ${row.verifiedBy}` : undefined };
}

/** The six-column document matrix of Tahap 7 and 8 (No., Parameter, Dokumen, Status, Tipe, Regulasi). */
function documentMatrix(title: string, rows: DocumentRow[]): ReportBlock {
  return {
    kind: "table",
    title,
    chips: chipsOf(rows),
    headers: ["No.", "Parameter", "Dokumen", "Status Verifikasi", "Tipe Regulasi", "Note Regulasi"],
    rows: rows.map((row, index) => [String(index + 1), row.label, row.document ? `PDF · ${row.document.label}` : "Tidak ada dokumen", documentCell(row), row.requirement, row.regulation]),
    empty: "Belum ada dokumen pada tahap ini.",
  };
}

/** The per-product check matrix of Tahap 5 and 6. */
function checkTable(title: string, checks: { parameter: string; object: string; result: string; verdict: { label: string; tone: ReportTone }; type: string; regulation: string }[]): ReportBlock {
  return {
    kind: "table",
    title,
    lede: "Status yang dicatat Verifikator per produk. Compliance hanya menampilkan.",
    headers: ["Parameter Pemeriksaan", "Objek", "Hasil / Keterangan", "Status Compliance", "Tipe", "Note Regulasi"],
    rows: checks.map((check) => [check.parameter, check.object, check.result, { text: check.verdict.label, tone: check.verdict.tone }, check.type, check.regulation]),
    empty: DASH,
  };
}

function chipsOf(rows: DocumentRow[]): ReportChip[] {
  return documentSummary(rows).map((item) => ({ label: VERIFICATION_STATUS_LABELS[item.status], count: item.count, tone: VERIFICATION_STATUS_TONES[item.status] }));
}

/** A stage's document matrix as on Case Detail: summary chips over the rows (No., parameter, isian, dokumen, status + oleh, tipe, regulasi). */
function matrixBlocks(title: string, rows: DocumentRow[]): ReportBlock[] {
  return [
    {
      kind: "table",
      title,
      chips: chipsOf(rows),
      headers: ["No.", "Data / Parameter", "Isian", "Dokumen Tersedia", "Status Verifikasi", "Tipe Wajib dalam Regulasi", "Note Regulasi"],
      rows: rows.map((row, index) => [
        String(index + 1),
        row.label,
        row.value,
        row.document ? `PDF · ${row.document.label}` : "Tidak ada dokumen",
        { text: VERIFICATION_STATUS_LABELS[row.status], tone: VERIFICATION_STATUS_TONES[row.status], sub: row.verifiedBy ? `oleh ${row.verifiedBy}` : undefined },
        row.requirement,
        row.regulation,
      ]),
      empty: "Tidak ada dokumen pada tahap ini.",
    },
  ];
}

const BUILDING_LABELS = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" } as const;
const FIELD_TONES = { ok: "green", bad: "red", none: "slate", warn: "orange" } as const;

function visitBadge(location: LocationInput): { text: string; tone: ReportTone } {
  if (!location.visit) return { text: "Belum dikunjungi", tone: "slate" };
  const text = location.visit.conclusionStatus ?? (location.visit.status === "COMPLETED" ? "Survey selesai" : "Survey berjalan");
  return { text, tone: location.visit.conclusionStatus === "Sesuai" ? "green" : location.visit.conclusionStatus ? "orange" : "slate" };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayOf(iso: string | null | undefined): string | null {
  const match = iso?.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

/**
 * Tanggal Permohonan → Survey Lokasi → Verifikasi Dokumen → Terbit LHVIU, and the working days from
 * the application to the LHVIU. When the application date was never entered (only the system's
 * input date stands in) or falls after the LHVIU, the count starts at the first Surat Tugas instead —
 * and says so.
 */
function processTimeline(detail: DossierInput, lokasi: LokasiInput | null): ProcessTimeline {
  const { row } = detail;
  const submitted = row.submittedIsSystemDate ? null : dayOf(row.submittedAt);
  const surveyDays = (lokasi?.locations ?? []).map((location) => dayOf(location.visit?.actualVisitDate)).filter((day): day is string => day !== null).sort();
  const verified = dayOf(detail.milestones?.verificationDate);
  const issued = row.lhviuIssued ? dayOf(detail.lhviu.issuedAt) : null;
  const scheduled = dayOf(detail.milestones?.firstScheduledDate);

  const surveyLabel = surveyDays.length === 0 ? DASH : surveyDays[0] === surveyDays[surveyDays.length - 1] ? formatCalendarDate(surveyDays[0]) : `${formatCalendarDate(surveyDays[0])} – ${formatCalendarDate(surveyDays[surveyDays.length - 1])}`;
  const steps: ProcessTimeline["steps"] = [
    {
      label: "Tanggal Permohonan",
      date: submitted ? formatCalendarDate(submitted) : "Tidak tercatat",
      note: submitted ? undefined : `Tanggal input sistem: ${formatDate(row.submittedAt)}`,
      reached: submitted !== null,
    },
    { label: "Survey Lokasi", date: surveyLabel, reached: surveyDays.length > 0 },
    { label: "Verifikasi Dokumen", date: verified ? formatCalendarDate(verified) : DASH, reached: verified !== null },
    { label: "Terbit LHVIU", date: issued ? formatCalendarDate(issued) : "Belum terbit", reached: issued !== null },
  ];

  const useSubmitted = submitted !== null && issued !== null && submitted <= issued;
  const start = useSubmitted ? submitted : scheduled;
  return {
    steps,
    workingDays: workingDaysBetween(start, issued),
    basis: !issued
      ? "Belum dapat dihitung — LHVIU belum terbit."
      : useSubmitted
        ? `Dari Tanggal Permohonan (${formatCalendarDate(submitted)}) sampai Terbit LHVIU (${formatCalendarDate(issued)}), Senin–Jumat.`
        : scheduled
          ? `Tanggal Permohonan tidak tercatat, dihitung dari Surat Tugas pertama (${formatCalendarDate(scheduled)}) sampai Terbit LHVIU (${formatCalendarDate(issued)}), Senin–Jumat.`
          : "Tanggal awal tidak tercatat — tidak dapat dihitung.",
  };
}

function lhviuFigure(detail: DossierInput, generatedAt: string, process: ProcessTimeline): LhviuFigure {
  const { lhviu, row } = detail;
  const today = generatedAt.slice(0, 10);
  const base = { process, coverPath: lhviu.file?.path ?? null, issuedBy: lhviu.issuedBy ? `${lhviu.issuedBy} (Project Manager)` : DASH };
  if (!row.lhviuIssued || !lhviu.issuedAt) {
    return {
      ...base,
      issued: false,
      number: lhviu.number ?? "Belum terbit",
      status: { text: "Belum terbit", tone: "slate" },
      timeline: [],
      elapsed: null,
      remaining: "LHVIU belum diterbitkan Project Manager.",
    };
  }
  const { validUntil, status } = lhviuValidity(lhviu.issuedAt, today);
  const start = new Date(`${lhviu.issuedAt}T00:00:00Z`).getTime();
  const end = new Date(`${validUntil}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  const days = Math.round((end - now) / DAY_MS);
  return {
    ...base,
    issued: true,
    number: lhviu.number ?? DASH,
    status: { text: status, tone: status === "Berlaku" ? "green" : "red" },
    timeline: [
      { label: "Terbit", date: formatCalendarDate(lhviu.issuedAt) },
      { label: "Berlaku sampai", date: formatCalendarDate(validUntil) },
    ],
    elapsed: Math.min(1, Math.max(0, (now - start) / (end - start))),
    remaining: days >= 0 ? `Sisa ${days} hari masa berlaku per ${formatCalendarDate(today)}` : `Kedaluwarsa ${-days} hari per ${formatCalendarDate(today)}`,
  };
}

/** Tahap 3 as on Case Detail (without the survey photos): flow, per-location summary, matrix per location, field results, data vs field, conclusion. */
function lokasiBlocks(input: LokasiInput): ReportBlock[] {
  // Kantor before Gudang throughout, as in Status Workspace Sumber.
  const rank = (type: string) => (type === "Kantor" ? 0 : type === "Gudang" ? 1 : 2);
  const lokasi = { ...input, locations: [...input.locations].sort((a, b) => rank(a.type) - rank(b.type)) };
  const view = buildLokasiStage(lokasi);
  const flow = view.flow.filter((step) => step.label !== "Evidence");
  const { locations } = lokasi;
  return [
    {
      kind: "cards",
      title: "Alur Pemeriksaan Lokasi",
      // The report carries no survey photos, so the flow leaves out its Evidence step.
      columns: Math.min(flow.length, 6),
      items: flow.map((step, index) => ({ title: `${index + 1}. ${step.label}`, badge: { text: step.value, tone: FIELD_TONES[step.tone] } })),
    },
    {
      kind: "cards",
      title: "Ringkasan Lokasi",
      columns: 2,
      items: locations.map((location) => ({
        title: location.type,
        badge: visitBadge(location),
        fields: [
          ["Alamat", location.address || DASH],
          ["Status penguasaan", location.buildingStatus ? BUILDING_LABELS[location.buildingStatus] : DASH],
          ...(location.buildingStatus === "SEWA" ? ([["Masa sewa sampai", formatCalendarDate(location.leaseEndDate?.slice(0, 10))]] as [string, string][]) : []),
          ["Dokumen", location.documents.length ? location.documents.map((document) => `PDF · ${document.label}`).join("\n") : DASH],
        ],
      })),
    },
    ...view.groups.map(({ location, rows }, groupIndex) => ({
      kind: "table" as const,
      title: groupIndex === 0 ? `Matriks Pemeriksaan Lokasi — ${location.type}` : `${location.type}`,
      headers: ["No", "Data / Parameter", "Isian", "Keterangan", "Dokumen Tersedia", "Hasil Lapangan", "Status Verifikasi", "Tipe Regulasi", "Note Regulasi"],
      rows: rows.map((row, index) => [
        String(index + 1),
        row.parameter,
        row.value,
        row.detail,
        row.document ? `PDF · ${row.document.label}` : "Tidak diunggah",
        { text: row.field, tone: FIELD_TONES[row.fieldTone] },
        row.document ? { text: VERIFICATION_STATUS_LABELS[row.document.status], tone: VERIFICATION_STATUS_TONES[row.document.status] } : DASH,
        row.requirement,
        row.regulation,
      ]),
      empty: "Tidak ada parameter.",
    })),
    {
      kind: "cards",
      title: "Hasil Verifikasi Lapangan",
      columns: 2,
      items: locations.map((location) =>
        location.visit
          ? {
              title: location.type,
              fields: [
                ["Tanggal kunjungan", formatCalendarDate(location.visit.actualVisitDate?.slice(0, 10))],
                ["Surveyor", location.visit.surveyorName ?? DASH],
                ["Alamat ditemukan", location.visit.addressFound ?? DASH],
                ["Alamat sesuai", answerLabel(location.visit.addressMatch, true)],
                ["Penguasaan sesuai", answerLabel(location.visit.ownershipMatch, true)],
                ["Temuan", location.visit.findings ?? DASH],
              ],
            }
          : { title: location.type, text: "Belum ada kunjungan surveyor untuk lokasi ini." },
      ),
    },
    {
      kind: "table",
      title: "Data vs Kondisi Lapangan",
      headers: ["Parameter", "Data Pemohon", "Hasil Lapangan", "Hasil"],
      rows: locations.flatMap((location) => {
        const answer = (value: "sesuai" | "tidak" | null): ReportCell => (value ? { text: answerLabel(value, true), tone: value === "sesuai" ? "green" : "red" } : DASH);
        return [
          [`Alamat ${location.type}`, location.address || DASH, location.visit?.addressFound ?? DASH, answer(location.visit?.addressMatch ?? null)],
          [`Status penguasaan ${location.type}`, location.buildingStatus ? BUILDING_LABELS[location.buildingStatus] : DASH, location.visit ? "Diperiksa surveyor" : DASH, answer(location.visit?.ownershipMatch ?? null)],
        ];
      }),
      empty: "Permohonan ini belum mencantumkan lokasi.",
    },
    {
      kind: "cards",
      title: "Kesimpulan Verifikasi Lokasi",
      columns: 2,
      items: locations.map((location) => ({
        title: location.type,
        badge: { text: location.visit?.conclusionStatus ?? "Belum disimpulkan", tone: visitBadge(location).tone },
        text: [location.visit?.recommendation ? `Rekomendasi: ${location.visit.recommendation}` : null, location.visit?.summary ?? null].filter(Boolean).join("\n\n") || undefined,
      })),
    },
  ];
}

/** "Temuan Compliance" of one stage — the findings on its requirements, as on Case Detail. */
function stageFindings(detail: DossierInput, step: number): ReportBlock {
  const keys = new Set<string>(requirementsOfStep(step));
  return {
    kind: "findings",
    items: detail.findings
      .filter((finding) => keys.has(finding.requirementKey))
      .map((finding) => ({
        issueNumber: finding.issueNumber,
        status: FINDING_KIND_LABELS[finding.kind],
        tone: finding.kind === "RESOLVED" ? "green" : finding.kind === "KLARIFIKASI" ? "orange" : "red",
        requirement: REQUIREMENT_LABELS[finding.requirementKey] ?? finding.requirementKey,
        title: finding.title,
      })),
  };
}

/** Points the reader should look at: every non-green verdict the stages already show. */
function inspectionNotes(input: ReportInput): { text: string; tone: ReportTone }[] {
  const notes: { text: string; tone: ReportTone }[] = [];
  const documents = [...(input.legalitas?.rows ?? []), ...(input.konsumsi?.documents ?? [])];
  for (const row of documents) {
    if (row.status === "VERIFIED") continue;
    notes.push({ text: `${row.label}: ${VERIFICATION_STATUS_LABELS[row.status]}${row.note ? ` — ${row.note}` : ""}`, tone: VERIFICATION_STATUS_TONES[row.status] });
  }
  if (input.lokasi) {
    for (const group of buildLokasiStage(input.lokasi).groups) {
      for (const row of group.rows) if (row.fieldTone === "bad") notes.push({ text: `${group.location.type} — ${row.parameter}: ${row.field} di lapangan`, tone: "red" });
    }
  }
  if (input.konsumsi) {
    for (const { brand, validity } of buildMerekStage(input.konsumsi).brands) {
      if (validity.tone === "red") notes.push({ text: `Merek ${brand.brandName}: ${validity.label}${validity.detail ? ` (${validity.detail})` : ""}`, tone: "red" });
    }
    const products = buildRencanaImporStage(input.konsumsi).rows;
    const unverified = products.filter((row) => row.verdict.tone !== "green").length;
    if (unverified > 0) notes.push({ text: `${unverified} dari ${products.length} produk belum berstatus Verified oleh Verifikator`, tone: "orange" });
    for (const row of buildUjiMutuStage(input.konsumsi)) {
      if (row.window.tone === "red") notes.push({ text: `Uji Mutu ${row.brandName} · ${row.subKelompok ?? DASH}: ${row.window.detail}`, tone: "red" });
    }
  }
  return notes;
}

function conclusion(input: ReportInput, notes: { tone: ReportTone }[]): { tone: ReportTone; text: string } {
  const { row } = input.detail;
  const pending = WORKSPACE_KEYS.filter((key) => row.workspaces[key] !== "COMPLETED").map((key) => WORKSPACE_LABELS[key]);
  if (pending.length > 0) {
    return { tone: "slate", text: `Belum dapat disimpulkan: hasil dari ${pending.join(", ")} belum diserahkan secara lengkap. Laporan ini mencerminkan data yang tercatat sampai tanggal penyusunan.` };
  }
  const active = row.activeFindings.length;
  if (active > 0) {
    return { tone: "red", text: `Seluruh workspace sumber telah menyerahkan hasilnya, namun terdapat ${active} temuan compliance aktif yang harus ditindaklanjuti sebelum permohonan dinyatakan lengkap.` };
  }
  const flagged = notes.filter((note) => note.tone === "red").length;
  if (flagged > 0) {
    return { tone: "orange", text: `Seluruh workspace sumber telah menyerahkan hasilnya dan tidak terdapat temuan compliance aktif. Terdapat ${flagged} catatan pemeriksaan yang perlu diperhatikan (lihat Catatan Pemeriksaan).` };
  }
  return { tone: "green", text: "Seluruh workspace sumber telah menyerahkan hasilnya, tidak terdapat temuan compliance aktif, dan tidak terdapat ketidaksesuaian pada data yang tercatat." };
}

const CONCLUSION_LABELS: Record<ReportTone, string> = {
  green: "Tidak ada ketidaksesuaian",
  orange: "Ada catatan pemeriksaan",
  red: "Ada temuan aktif",
  slate: "Belum dapat disimpulkan",
};
const VERDICT_LABELS: Record<ReportTone, string> = { green: "Sesuai", orange: "Perlu perhatian", red: "Tidak sesuai", slate: "Belum ada data" };

/** Worst tone of a set: red > orange > slate > green; slate alone when empty. */
function worst(tones: ReportTone[]): ReportTone {
  if (tones.length === 0) return "slate";
  for (const tone of ["red", "orange", "slate"] as const) if (tones.includes(tone)) return tone;
  return "green";
}

function documentsTile(rows: DocumentRow[]): { tone: ReportTone; metric: string } {
  const verified = rows.filter((row) => row.status === "VERIFIED").length;
  return { tone: worst(rows.map((row) => VERIFICATION_STATUS_TONES[row.status])), metric: rows.length ? `${verified}/${rows.length} dokumen terverifikasi` : "Tidak ada dokumen" };
}

/** One tile per Tahap 2–9: the worst verdict the stage already shows, and its headline count. */
function stageTiles(input: ReportInput): Infographic["stages"] {
  const tiles: Infographic["stages"] = [];
  const tile = (num: number, label: string, result: { tone: ReportTone; metric: string }) =>
    tiles.push({ num, label, verdict: VERDICT_LABELS[result.tone], tone: result.tone, metric: result.metric });
  const { legalitas, lokasi, konsumsi, detail } = input;

  tile(2, "Perusahaan & Legalitas", legalitas ? documentsTile(legalitas.rows) : { tone: "slate", metric: "—" });
  if (lokasi) {
    const rows = buildLokasiStage(lokasi).groups.flatMap((group) => group.rows);
    const answered = rows.filter((row) => row.fieldTone !== "none");
    const matches = answered.filter((row) => row.fieldTone === "ok").length;
    tile(3, "Lokasi", {
      tone: answered.length === 0 ? "slate" : rows.some((row) => row.fieldTone === "bad") ? "red" : answered.length < rows.length ? "orange" : "green",
      metric: `${matches}/${rows.length} parameter lapangan sesuai`,
    });
  } else tile(3, "Lokasi", { tone: "slate", metric: "—" });

  if (konsumsi) {
    const merek = buildMerekStage(konsumsi);
    tile(4, "Merek & Hubungan Importir", {
      tone: worst(merek.brands.flatMap((brand) => [brand.validity.tone, brand.status.tone])),
      metric: `${merek.brands.filter((brand) => brand.validity.tone === "green" && brand.status.tone === "green").length}/${merek.brands.length} merek berlaku & terverifikasi`,
    });
    const plan = buildRencanaImporStage(konsumsi);
    const verified = plan.rows.filter((row) => row.verdict.tone === "green").length;
    const productTone: ReportTone = plan.rows.length === 0 ? "slate" : verified === plan.rows.length ? "green" : worst(plan.rows.map((row) => row.verdict.tone)) === "red" ? "red" : "orange";
    tile(5, "Rencana Impor", { tone: productTone, metric: `${verified}/${plan.rows.length} produk verified` });
    const stok = buildStokStage(konsumsi);
    tile(6, "Stok Terkini", { tone: productTone, metric: `${verified}/${stok.rows.length} produk verified · ${stok.stocked} memiliki stok` });
    const uji = buildUjiMutuStage(konsumsi);
    tile(7, "Uji Mutu", {
      tone: worst(uji.flatMap((row) => [row.window.tone, row.document ? VERIFICATION_STATUS_TONES[row.document.status] : ("red" as const)])),
      metric: `${uji.filter((row) => row.window.tone === "green").length}/${uji.length} sertifikat ≤ 6 bulan`,
    });
    tile(8, "Pernyataan Label", documentsTile(buildLabelStage(konsumsi).matrix));
  } else {
    for (const [num, label] of [[4, "Merek & Hubungan Importir"], [5, "Rencana Impor"], [6, "Stok Terkini"], [7, "Uji Mutu"], [8, "Pernyataan Label"]] as const) tile(num, label, { tone: "slate", metric: "—" });
  }
  tile(9, "Modal Kerja", {
    tone: detail.workingCapital.amount ? "green" : detail.workingCapital.statement ? "orange" : "slate",
    metric: detail.workingCapital.amount ?? (detail.workingCapital.statement ? "Nominal belum tercantum" : "Belum ada surat pernyataan"),
  });
  return tiles;
}

function infographic(input: ReportInput, notes: { tone: ReportTone }[]): Infographic {
  const { row } = input.detail;
  const summary = row.summary;
  const concluded = conclusion(input, notes);
  const flagged = Math.min(summary.activeFindings, summary.available);
  // The administrative checks only appear for a case they apply to (consolidation.administrativeApplies).
  const admin = summary.administrativeTotal > 0;
  return {
    score: summary.score,
    total: summary.total,
    segments: [
      { label: "Terpenuhi", value: summary.sesuai + summary.administrative, tone: "green" as const },
      { label: "Terkena temuan aktif", value: flagged, tone: "red" as const },
      ...(admin ? [{ label: "Cek administratif belum", value: summary.administrativeTotal - summary.administrative, tone: "orange" as const }] : []),
      { label: "Menunggu handover", value: summary.pending, tone: "slate" as const },
    ],
    conclusion: { tone: concluded.tone, label: CONCLUSION_LABELS[concluded.tone], text: concluded.text },
    kpis: [
      { label: "Kategori case", value: CASE_CATEGORY_LABELS[row.category], sub: COMPLIANCE_STATUS_LABELS[row.complianceStatus] },
      { label: "Temuan aktif", value: String(summary.activeFindings), sub: `${input.detail.findings.length} temuan tercatat` },
      ...(admin ? [{ label: "Cek administratif", value: `${summary.administrative}/${summary.administrativeTotal}`, sub: "Final Review · Dossier" }] : []),
      { label: "LHVIU", value: row.lhviuIssued ? "Terbit" : "Belum terbit", sub: row.lhviuNumber ?? "—" },
    ],
    workspaces: WORKSPACE_KEYS.map((key) => {
      const state = row.workspaces[key];
      return { key, label: WORKSPACE_LABELS[key], state: WORKSPACE_STATE_LABELS[state], tone: state === "COMPLETED" ? "green" : state === "ISSUE" ? "red" : state === "IN_PROGRESS" ? "orange" : "slate" };
    }),
    stages: stageTiles(input),
  };
}

/**
 * "Hasil" of one workspace in Status Workspace Sumber, one line per output: CR's Surat Tugas and the
 * application documents, and every Surveyor / Verifikator report with the PM's decision on it.
 */
function workspaceResult(key: string, detail: DossierInput, fallback: string): string {
  if (key === "CR") {
    return detail.row.workspaces.CR === "COMPLETED" ? `${fallback}\nDokumen permohonan lengkap` : fallback;
  }
  if (key === "SV" || key === "VF") {
    // Kantor before Gudang, as the stages list them.
    const rank = (title: string) => (/Kantor/.test(title) ? 0 : /Gudang/.test(title) ? 1 : 2);
    const reports = detail.pmReviews.filter((review) => review.source === key).sort((a, b) => rank(a.title) - rank(b.title));
    if (reports.length === 0) return fallback;
    return reports.map((review) => `${review.title} — ${review.status ?? "Belum direview PM"}`).join("\n");
  }
  return fallback;
}

function stageSections(input: ReportInput): ReportSection[] {
  const sections: ReportSection[] = [];
  const { detail, legalitas, lokasi, konsumsi } = input;

  if (legalitas) {
    sections.push({
      key: "legalitas",
      eyebrow: "5.1 · TAHAP 2",
      title: "Perusahaan & Legalitas",
      blocks: [
        { kind: "text", text: "Data Perusahaan (API-U) — identitas dan legalitas Angka Pengenal Importir Umum, seperti yang diajukan." },
        {
          kind: "fields",
          layout: "grid",
          items: [
            ["Nama Perusahaan", legalitas.company.name],
            ["NIB", legalitas.company.nib],
            ["NPWP", legalitas.company.npwp],
            ["Status Perusahaan", legalitas.company.active === null ? DASH : legalitas.company.active ? "Aktif" : "Nonaktif"],
            ["KBLI Utama", legalitas.company.kbliUtama],
            ["Alamat Kantor", legalitas.company.officeAddress],
            ["Jenis API", legalitas.company.apiType],
            ["PIC Perusahaan", legalitas.company.pic],
          ],
        },
        {
          kind: "text",
          text: legalitas.kbli.ok
            ? `KBLI Utama perusahaan (${legalitas.kbli.matched.join(", ")}) termasuk dalam daftar KBLI yang diperbolehkan (${legalitas.kbli.allowed.join(", ")}).${legalitas.kbli.regulation ? ` Sesuai ${legalitas.kbli.regulation}.` : ""}`
            : `KBLI Utama perusahaan tidak termasuk dalam daftar KBLI yang diperbolehkan (${legalitas.kbli.allowed.join(", ")}).`,
        },
        ...matrixBlocks("Matriks Pemeriksaan Perusahaan & Legalitas", legalitas.rows),
        stageFindings(detail, 2),
      ],
    });
  }

  if (lokasi) {
    sections.push({
      key: "lokasi",
      eyebrow: "5.2 · TAHAP 3",
      title: "Lokasi Kantor & Gudang",
      blocks: [...lokasiBlocks(lokasi), stageFindings(detail, 3)],
    });
  }

  if (konsumsi) {
    const merek = buildMerekStage(konsumsi);
    sections.push({
      key: "merek",
      eyebrow: "5.3 · TAHAP 4",
      title: "Merek & Hubungan Importir",
      blocks: [
        {
          kind: "table",
          title: "Status Hubungan Importir dengan Pemilik Merek",
          headers: ["Merek", "Pemilik Merek", "Negara Pemilik", "Hubungan API-U", "Ditunjuk Oleh", "Kelengkapan", "Status"],
          rows: merek.relations.map((item) => [
            item.brand.brandName,
            item.brand.ownerName ?? DASH,
            item.brand.ownerCountry ?? DASH,
            item.relation,
            item.appointedBy,
            item.completeness.required === 0
              ? "Tidak ada dokumen hubungan wajib"
              : `${item.completeness.uploaded}/${item.completeness.required} dokumen
${item.brand.requiredDocuments.join(", ")}`,
            { text: item.status.label, tone: item.status.tone },
          ]),
          empty: "Permohonan ini tidak mencantumkan merek.",
        },
        {
          kind: "table",
          title: "Data Merek",
          headers: ["Nama Merek", "Pemilik", "Negara", "Jenis Dokumen Merek", "Nomor", "Tgl Registrasi / Terbit", "Masa Berlaku", "Status Dokumen", "Status Verifikasi"],
          rows: merek.brands.map(({ brand, validity, status }) => [
            brand.brandName,
            brand.ownerName ?? DASH,
            brand.ownerCountry ?? DASH,
            brand.evidenceTypeLabel,
            brand.registrationNumber ?? DASH,
            formatDate(brand.registrationDate),
            formatDate(brand.registrationExpiryDate),
            { text: validity.label, tone: validity.tone, sub: validity.detail ?? undefined },
            { text: status.label, tone: status.tone },
          ]),
          empty: "Belum ada merek.",
        },
        {
          kind: "table",
          title: "Matriks Pemeriksaan Merek & Hubungan Importir",
          chips: chipsOf(merek.matrix.map((item) => item.row)),
          headers: ["No.", "Parameter", "Merek", "Hubungan API-U", "Dokumen", "Status Verifikasi", "Tipe Regulasi", "Note Regulasi"],
          rows: merek.matrix.map(({ brandName, relation, row }, index) => [
            String(index + 1),
            row.label,
            brandName,
            relation,
            row.document ? `PDF · ${row.document.label}` : "Tidak ada dokumen",
            { text: VERIFICATION_STATUS_LABELS[row.status], tone: VERIFICATION_STATUS_TONES[row.status], sub: row.verifiedBy ? `oleh ${row.verifiedBy}` : undefined },
            row.requirement,
            row.regulation,
          ]),
          empty: "Belum ada dokumen merek pada permohonan ini.",
        },
        stageFindings(detail, 4),
      ],
    });

    const plan = buildRencanaImporStage(konsumsi);
    sections.push({
      key: "rencana-impor",
      eyebrow: "5.4 · TAHAP 5",
      title: "Rencana Impor",
      blocks: [
        hsTable(konsumsi.products),
        {
          kind: "table",
          title: "Daftar Rencana Impor",
          lede: `${plan.rows.length} produk · ${plan.hsCount} HS Code · total ${plan.totals.map((item) => money(item.total, item.currency)).join(" · ") || DASH}. Nilai impor adalah data pendukung, bukan syarat.`,
          rowsPerPiece: PRODUCT_ROWS_PER_PIECE,
          widths: ["4%", "22%", "12%", "13%", "8%", "8%", "5%", "8%", "10%", "10%"],
          headers: ["No.", "Merek", "Kelompok Komoditas", "Sub Kelompok", "HS Code", "Jumlah", "Satuan", "Harga Satuan", "Total Nilai", "Status Compliance"],
          rows: plan.rows.map(({ product, total, verdict }, index) => [
            String(index + 1),
            `${product.brandName}\n${product.productName}`,
            product.kelompok ?? DASH,
            product.subKelompok ?? DASH,
            product.hsCode,
            product.quantity.toLocaleString("id-ID"),
            product.unit ?? DASH,
            money(product.unitPrice, product.currency),
            money(total, product.currency),
            { text: verdict.label, tone: verdict.tone, sub: verdict.note ?? undefined },
          ]),
          empty: "Permohonan ini belum memuat produk.",
        },
        checkTable("Matriks Pemeriksaan Rencana Impor", plan.checks),
        stageFindings(detail, 5),
      ],
    });

    const stok = buildStokStage(konsumsi);
    sections.push({
      key: "stok",
      eyebrow: "5.5 · TAHAP 6",
      title: "Stok Terkini",
      blocks: [
        {
          kind: "table",
          title: "Daftar Stok Terkini",
          lede: `${stok.stocked} dari ${stok.rows.length} produk memiliki stok saat permohonan diajukan. Lokasi gudang (dari Tahap 3): ${stok.warehouses.join(" · ") || "tidak ada gudang terdaftar"}. Stok tidak dicatat per gudang.`,
          rowsPerPiece: PRODUCT_ROWS_PER_PIECE,
          widths: ["28%", "16%", "18%", "9%", "9%", "7%", "13%"],
          headers: ["Merek", "Kelompok", "Sub Kelompok", "HS Code", "Jumlah Stok", "Satuan", "Status"],
          rows: stok.rows.map(({ product, verdict }) => [
            `${product.brandName}\n${product.productName}`,
            product.kelompok ?? DASH,
            product.subKelompok ?? DASH,
            product.hsCode,
            product.stock.toLocaleString("id-ID"),
            product.unit ?? DASH,
            { text: verdict.label, tone: verdict.tone },
          ]),
          empty: "Permohonan ini belum memuat produk.",
        },
        checkTable("Matriks Pemeriksaan Stok", [stok.check]),
        stageFindings(detail, 6),
      ],
    });

    const uji = buildUjiMutuStage(konsumsi);
    sections.push({
      key: "uji-mutu",
      eyebrow: "5.6 · TAHAP 7",
      title: "Uji Mutu",
      blocks: [
        {
          kind: "table",
          title: "Daftar Hasil Uji Mutu",
          lede: "Sertifikat diajukan paling lama 6 bulan sejak diterbitkan (Pasal 37), dinilai pada Tanggal Pengajuan.",
          headers: ["Merek", "Kelompok", "Sub Kelompok", "HS Tercover", "No. Sertifikat", "Laboratorium", "Tanggal Terbit", "Umur Dokumen", "Status", "Verifikasi"],
          rows: uji.map((row) => {
            const age = documentAgeMonths(row.certificate?.issueDate ?? null, konsumsi.submittedAt);
            return [
              row.brandName,
              row.kelompok ?? DASH,
              row.subKelompok ?? DASH,
              row.hsCodes.join(", "),
              row.certificate?.certificateNumber ?? DASH,
              row.certificate?.laboratory ?? DASH,
              formatCalendarDate(row.certificate?.issueDate?.slice(0, 10) ?? null),
              age === null ? DASH : `${age} bulan`,
              { text: row.window.label, tone: row.window.tone, sub: row.window.detail },
              documentCell(row.document),
            ];
          }),
          empty: "Permohonan ini belum memuat produk.",
        },
        documentMatrix("Matriks Pemeriksaan Uji Mutu", uji.flatMap((row) => (row.document ? [row.document] : []))),
        stageFindings(detail, 7),
      ],
    });

    const label = buildLabelStage(konsumsi);
    sections.push({
      key: "label",
      eyebrow: "5.7 · TAHAP 8",
      title: "Pernyataan Label",
      blocks: [
        {
          kind: "cards",
          title: "Surat Pernyataan Label Berbahasa Indonesia",
          columns: 2,
          items: [
            {
              title: "Pernyataan pemohon bahwa produk yang diimpor berlabel Bahasa Indonesia",
              badge: label.statement ? { text: VERIFICATION_STATUS_LABELS[label.statement.status], tone: VERIFICATION_STATUS_TONES[label.statement.status] } : { text: "Tidak ada dokumen", tone: "slate" },
              fields: [
                ["Dokumen", label.statement?.document ? `PDF · ${label.statement.document.label}` : "Tidak ada dokumen"],
                ["Diverifikasi oleh", label.statement?.verifiedBy ?? DASH],
              ],
            },
          ],
        },
        {
          kind: "table",
          title: "Daftar Dokumentasi Label Produk",
          lede: "Pemohon mengunggah satu dokumentasi label yang mencakup seluruh Merek × Sub Kelompok di bawah; statusnya sama untuk setiap baris.",
          headers: ["Merek", "Kelompok", "Sub Kelompok", "HS Tercover", "Dokumentasi Label", "Status"],
          rows: label.groups.map((group) => [
            group.brandName,
            group.kelompok ?? DASH,
            group.subKelompok ?? DASH,
            group.hsCodes.join(", "),
            label.documentation?.document ? `PDF · ${label.documentation.document.label}` : "Tidak ada dokumen",
            documentCell(label.documentation),
          ]),
          empty: "Permohonan ini belum memuat produk.",
        },
        documentMatrix("Matriks Pemeriksaan Label", label.matrix),
        stageFindings(detail, 8),
      ],
    });
  }

  sections.push({
    key: "modal",
    eyebrow: "5.8 · TAHAP 9",
    title: "Modal Kerja",
    blocks: [
      {
        kind: "fields",
        layout: "grid",
        items: [
          ["Nominal Modal Kerja", detail.workingCapital.amount ?? "Belum tercantum"],
          ["Surat Pernyataan Modal Kerja", detail.workingCapital.statement ? `PDF · ${detail.workingCapital.statement.label}` : "Belum tersedia"],
          ["Bukti Pendukung", detail.workingCapital.supporting.length ? detail.workingCapital.supporting.map((doc) => `PDF · ${doc.label}`).join("\n") : DASH],
        ],
      },
      { kind: "text", text: "Besaran nominal tidak menentukan compliance." },
      stageFindings(detail, 9),
    ],
  });
  return sections;
}

export function buildComplianceReport(input: ReportInput): ComplianceReport {
  const { detail } = input;
  const { row } = detail;
  const summary = buildSummary(detail);
  const notes = inspectionNotes(input);
  const dossier = buildDossier(detail);
  const matrix = buildMatrix(detail, detail.assignees ?? {});
  const admin = detail.administrative;
  const score = row.summary;

  const sections: ReportSection[] = [
    {
      key: "ringkasan",
      eyebrow: "1",
      title: "Ringkasan Eksekutif",
      blocks: [
        { kind: "infographic", data: infographic(input, notes) },
        ...(notes.length ? [{ kind: "notes" as const, title: "Catatan Pemeriksaan", items: notes }] : []),
      ],
    },
    {
      key: "informasi",
      eyebrow: "2",
      title: "Informasi Permohonan",
      blocks: [
        {
          kind: "fields",
          items: [
            ["Nomor Permohonan", summary.applicationNumber],
            ["Tanggal Permohonan", summary.submittedAt],
            ["Jenis VIU", summary.jenis],
            ["Jenis Permohonan", summary.category],
            ["Status Permohonan", summary.status],
            ["Nama Pemohon", summary.companyName],
            ["NIB", summary.nib],
            ["PIC Pemohon", summary.pic],
            ["Kontak", [summary.phone, summary.email].filter((value) => value !== DASH).join(" · ") || DASH],
          ],
        },
      ],
    },
    {
      key: "workspace",
      eyebrow: "3",
      title: "Status Workspace Sumber",
      lede: "Hasil yang diserahkan setiap workspace ke Compliance.",
      blocks: [
        {
          kind: "table",
          headers: ["Workspace", "Status", "Hasil", "Selesai", "Oleh"],
          rows: WORKSPACE_KEYS.map((key) => {
            const section = dossier.find((item) => item.key === key);
            const state = row.workspaces[key];
            return [
              WORKSPACE_LABELS[key],
              { text: WORKSPACE_STATE_LABELS[state], tone: state === "COMPLETED" ? ("green" as const) : state === "ISSUE" ? ("red" as const) : ("slate" as const) },
              workspaceResult(key, detail, section?.result ?? DASH),
              formatDate(section?.completedAt),
              section?.completedBy ?? DASH,
            ];
          }),
          empty: DASH,
        },
      ],
    },
    {
      key: "matrix",
      eyebrow: "4",
      title: "Compliance Matrix",
      lede: "Requirement → workspace sumber → hasil → status, sebagaimana tercatat.",
      blocks: [
        {
          kind: "table",
          headers: ["No.", "Requirement", "Sumber", "Hasil", "Status", "Temuan", "Diverifikasi oleh"],
          rows: matrix.map((item, index) => [
            String(index + 1),
            item.label,
            item.sourceLabel,
            item.result,
            { text: item.status, tone: STEP_STATUS_TONES[item.status] ?? "slate" },
            item.finding ? `${item.finding.issueNumber} · ${FINDING_KIND_LABELS[item.finding.kind]}` : DASH,
            item.verifiedBy,
          ]),
          empty: DASH,
        },
      ],
    },
    ...stageSections(input),
    {
      key: "temuan",
      eyebrow: "6",
      title: "Temuan & Tindak Lanjut",
      blocks: [
        {
          kind: "table",
          headers: ["No. Issue", "Status", "Requirement", "Uraian", "Workspace Sumber"],
          rows: detail.findings.map((finding) => [
            finding.issueNumber,
            { text: FINDING_KIND_LABELS[finding.kind], tone: finding.kind === "RESOLVED" ? ("green" as const) : finding.kind === "KLARIFIKASI" ? ("orange" as const) : ("red" as const) },
            REQUIREMENT_LABELS[finding.requirementKey] ?? finding.requirementKey,
            finding.title,
            finding.sourceWorkspace,
          ]),
          empty: "Tidak ada temuan compliance pada permohonan ini.",
        },
      ],
    },
    {
      key: "dossier",
      eyebrow: "7",
      title: score.administrativeTotal ? "Kelengkapan Dossier & Cek Administratif" : "Kelengkapan Dossier",
      blocks: [
        {
          kind: "table",
          headers: ["Bagian Dossier", "Sumber", "Status", "Selesai", "Oleh"],
          rows: dossier.map((section) => [
            section.title,
            section.sourceLabel,
            { text: section.status, tone: section.ready ? ("green" as const) : ("slate" as const) },
            formatDate(section.completedAt),
            section.completedBy,
          ]),
          empty: DASH,
        },
        ...(score.administrativeTotal
          ? [
              {
                kind: "fields" as const,
                items: [
                  ["Final Review", admin?.finalReview.done ? `Selesai — ${formatDate(admin.finalReview.at)}${admin.finalReview.byName ? `, ${admin.finalReview.byName}` : ""}` : "Belum"],
                  ["Dossier Lengkap", admin?.dossier.done ? `Selesai — ${formatDate(admin.dossier.at)}${admin.dossier.byName ? `, ${admin.dossier.byName}` : ""}` : "Belum"],
                ] as [string, string][],
              },
            ]
          : []),
      ],
    },
    {
      key: "lhviu",
      eyebrow: "8",
      title: "LHVIU",
      blocks: [{ kind: "lhviu", data: lhviuFigure(detail, input.generatedAt, processTimeline(detail, input.lokasi)) }],
    },
  ];

  return {
    documentNumber: `LHC/${row.applicationNumber}`,
    isFinal: row.complianceStatus === "SELESAI",
    generatedAt: input.generatedAt,
    applicationId: row.applicationId,
    applicationNumber: row.applicationNumber,
    companyName: row.companyName,
    submittedAt: summary.submittedAt,
    reportDate: detail.lhviu.issuedAt ? formatCalendarDate(detail.lhviu.issuedAt) : formatDate(input.generatedAt),
    complianceStatus: COMPLIANCE_STATUS_LABELS[row.complianceStatus],
    category: CASE_CATEGORY_LABELS[row.category],
    score: score.score,
    conclusion: conclusion(input, notes),
    sections,
  };
}
