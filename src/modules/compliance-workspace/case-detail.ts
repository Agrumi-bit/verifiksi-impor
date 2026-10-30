import type { CaseRow } from "./case-list";
import { formatCalendarDate, formatDate, formatDateTime } from "./components/case-list/format";
import type { FindingKind } from "./consolidation";
import { CASE_STEPS, requirementsOfStep } from "./requirements";
import { WORKSPACE_LABELS, type WorkspaceKey, type WorkspaceStatuses } from "./workspace-status";

/**
 * Case Detail (read-only, 11 stages): turns the facts the source workspaces recorded into one panel
 * per stage — key data, evidence and the findings on its requirements. Pure; the server loader
 * (server/load-case-detail.ts) does the database work. Nothing here re-evaluates a rule — values are
 * shown as recorded by their workspace.
 */

export type Evidence = { label: string; path: string };
export type DetailFinding = { id: string; issueNumber: string; kind: FindingKind; title: string; requirementKey: string; sourceWorkspace: string };

export type CaseDetailInput = {
  row: CaseRow;
  applicationCategory: string;
  contact: { name: string; email: string } | null;
  legal: {
    npwp: string | null;
    nib: string | null;
    kbli: { code: string; description: string }[];
    notarialDeedNumber: string | null;
    documents: Evidence[];
  };
  locations: { type: string; address: string; buildingStatus: string | null; surveyStatus: string | null; documents: Evidence[] }[];
  surveyorNames: string[];
  brands: { name: string; role: string | null; documents: Evidence[] }[];
  products: { brandId: string; commodityGroupId: string; hsCode: string; quantity: number; averageUnitPrice: number; currency: string; stockQuantity: number }[];
  certificates: { brandName: string; commodityName: string; certificateNumber: string; laboratoryName: string; issueDate: string; file: Evidence | null; brandId: string; commodityGroupId: string }[];
  label: { statement: Evidence | null; documentation: Evidence | null };
  workingCapital: { amount: string | null; statement: Evidence | null; supporting: Evidence[] };
  pmReviews: { report: string; status: string | null; by: string | null; at: string | null }[];
  lhviu: { number: string | null; issuedAt: string | null; validUntil: string | null; file: Evidence | null };
  findings: DetailFinding[];
};

export type StepStatus = "Menunggu Handover" | "Conflict" | "Open Issue" | "Perlu Klarifikasi" | "Sesuai" | "Completed";

export type CaseStep = {
  num: number;
  label: string;
  source: WorkspaceKey;
  sourceLabel: string;
  status: StepStatus;
  keyData: [string, string][];
  evidence: Evidence[];
  findings: DetailFinding[];
  note?: string;
};

const FINDING_STATUS: Record<Exclude<FindingKind, "RESOLVED">, StepStatus> = {
  CONFLICT: "Conflict",
  OPEN: "Open Issue",
  KLARIFIKASI: "Perlu Klarifikasi",
};
const STATUS_RANK: Record<StepStatus, number> = { Conflict: 3, "Open Issue": 2, "Perlu Klarifikasi": 1, "Menunggu Handover": 0, Sesuai: 0, Completed: 0 };

/** A stage waits for its workspace; once handed over, its worst active finding decides, else it is fine. */
export function stepStatus(source: WorkspaceKey, statuses: WorkspaceStatuses, stepFindings: { kind: FindingKind }[]): StepStatus {
  if (statuses[source] !== "COMPLETED") return "Menunggu Handover";
  const worst = stepFindings
    .filter((finding): finding is { kind: Exclude<FindingKind, "RESOLVED"> } => finding.kind !== "RESOLVED")
    .map((finding) => FINDING_STATUS[finding.kind])
    .sort((a, b) => STATUS_RANK[b] - STATUS_RANK[a])[0];
  return worst ?? (source === "PM" || source === "CR" ? "Completed" : "Sesuai");
}

const DASH = "—";

function sumByCurrency(items: { currency: string; value: number }[]): string {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.value);
  if (totals.size === 0) return DASH;
  return [...totals].map(([currency, value]) => `${currency} ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`).join(" · ");
}

function combinationKey(item: { brandId: string; commodityGroupId: string }): string {
  return `${item.brandId}::${item.commodityGroupId}`;
}

function present<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function stepContent(num: number, input: CaseDetailInput): Pick<CaseStep, "keyData" | "evidence" | "note"> {
  const { row } = input;
  switch (num) {
    case 1:
      return {
        keyData: [
          ["No. Permohonan", row.applicationNumber],
          ["Tanggal Pengajuan", `${formatDate(row.submittedAt)}${row.submittedIsSystemDate ? " (tanggal input sistem)" : ""}`],
          ["Pemohon", row.companyName],
          ["NIB", row.nib],
          ["Modul", "VIU – Produk Tekstil sebagai Barang Konsumsi"],
          ["Kategori", input.applicationCategory || DASH],
          ["Kontak Pemohon", input.contact ? `${input.contact.name} · ${input.contact.email}` : DASH],
        ],
        evidence: [],
      };
    case 2:
      return {
        keyData: [
          ["Nama Perusahaan", row.companyName],
          ["NPWP", input.legal.npwp ?? DASH],
          ["NIB", input.legal.nib ?? row.nib],
          ["KBLI", input.legal.kbli.length ? input.legal.kbli.map((k) => `${k.code} – ${k.description}`).join("; ") : DASH],
          ["Akta Notaris", input.legal.notarialDeedNumber ?? DASH],
        ],
        evidence: input.legal.documents,
      };
    case 3:
      return {
        keyData: [
          ...input.locations.map((location): [string, string] => [
            location.type,
            [location.address, location.buildingStatus, location.surveyStatus ? `Survey: ${location.surveyStatus}` : null].filter(Boolean).join(" · "),
          ]),
          ["Surveyor", input.surveyorNames.length ? input.surveyorNames.join(", ") : DASH],
        ],
        evidence: input.locations.flatMap((location) => location.documents),
      };
    case 4:
      return {
        keyData: [
          ["Jumlah merek", `${input.brands.length} merek`],
          ...input.brands.map((brand): [string, string] => [brand.name, brand.role ?? DASH]),
        ],
        evidence: input.brands.flatMap((brand) => brand.documents),
      };
    case 5: {
      const combinations = new Set(input.products.map(combinationKey));
      const hsCodes = new Set(input.products.map((product) => product.hsCode));
      return {
        keyData: [
          ["Jumlah produk", `${input.products.length} produk`],
          ["Kombinasi", `${combinations.size} kombinasi merek × komoditas`],
          ["Jumlah HS", `${hsCodes.size} HS`],
          ["Nilai rencana impor", sumByCurrency(input.products.map((p) => ({ currency: p.currency, value: p.quantity * p.averageUnitPrice })))],
        ],
        evidence: [],
        note: "Nilai rencana impor adalah Data Pendukung dan tidak menentukan compliance.",
      };
    }
    case 6: {
      const withStock = input.products.filter((product) => product.stockQuantity > 0).length;
      return {
        keyData: [
          ["Cakupan", `${input.products.length} produk dengan data stok`],
          ["Stok > 0", `${withStock} produk`],
          ["Stok 0", `${input.products.length - withStock} produk`],
        ],
        evidence: [],
        note: "Stok 0 merupakan nilai yang valid.",
      };
    }
    case 7: {
      const required = new Set(input.products.map(combinationKey));
      const covered = new Set(input.certificates.map(combinationKey).filter((key) => required.has(key)));
      return {
        keyData: [
          ["Sertifikat", `${input.certificates.length} sertifikat (per merek × komoditas)`],
          ["Coverage", `${covered.size} dari ${required.size} kombinasi merek × komoditas`],
          ["Acuan usia sertifikat", `Tanggal pengajuan ${formatDate(row.submittedAt)}`],
          ...input.certificates.map((certificate): [string, string] => [
            `${certificate.brandName} – ${certificate.commodityName}`,
            `${certificate.certificateNumber} · ${certificate.laboratoryName} · terbit ${formatCalendarDate(certificate.issueDate)}`,
          ]),
        ],
        evidence: input.certificates.map((certificate) => certificate.file).filter(present),
        note: "Coverage HS dicatat sebagai Regulatory Traceability, bukan syarat per HS.",
      };
    }
    case 8:
      return {
        keyData: [
          ["Surat Pernyataan Label", input.label.statement ? "Tersedia (1 surat per permohonan)" : "Belum tersedia"],
          ["Dokumentasi Label", input.label.documentation ? "Tersedia" : "Belum tersedia"],
        ],
        evidence: [input.label.statement, input.label.documentation].filter(present),
      };
    case 9:
      return {
        keyData: [
          ["Nominal modal kerja", input.workingCapital.amount ?? "Belum tercantum"],
          ["Surat pernyataan", input.workingCapital.statement ? "Tersedia" : "Belum tersedia"],
          ["Bukti pendukung", input.workingCapital.supporting.length ? input.workingCapital.supporting.map((s) => s.label).join(", ") : DASH],
        ],
        evidence: [input.workingCapital.statement, ...input.workingCapital.supporting].filter(present),
        note: "Besaran nominal tidak menentukan compliance.",
      };
    case 10:
      return {
        keyData: input.pmReviews.map((review): [string, string] => [
          review.report,
          [review.status ?? "Belum direview", review.by, review.at ? formatDateTime(review.at) : null].filter(Boolean).join(" · "),
        ]),
        evidence: [],
      };
    case 11:
      return {
        keyData: [
          ["Nomor LHVIU", input.lhviu.number ?? DASH],
          ["Tanggal terbit", input.lhviu.issuedAt ? formatCalendarDate(input.lhviu.issuedAt) : DASH],
          ["Berlaku sampai", input.lhviu.validUntil ? formatCalendarDate(input.lhviu.validUntil) : DASH],
          ["Diterbitkan oleh", "Project Manager Workspace"],
        ],
        evidence: input.lhviu.file ? [input.lhviu.file] : [],
      };
    default:
      return { keyData: [], evidence: [] };
  }
}

export function buildCaseSteps(input: CaseDetailInput): CaseStep[] {
  return CASE_STEPS.map((step) => {
    const keys = new Set<string>(requirementsOfStep(step.num));
    const findings = input.findings.filter((finding) => keys.has(finding.requirementKey));
    return {
      num: step.num,
      label: step.label,
      source: step.source,
      sourceLabel: WORKSPACE_LABELS[step.source],
      status: stepStatus(step.source, input.row.workspaces, findings),
      findings,
      ...stepContent(step.num, input),
    };
  });
}
