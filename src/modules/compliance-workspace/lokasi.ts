import { DOCUMENT_SIFAT_LABELS, formatLegalBasis, resolveDocumentRequirement } from "@/modules/schemes";
import type { VerificationStatusValue } from "@/modules/company/document-versions";
import type { Evidence } from "./case-detail";

/**
 * Tahap 3 "Lokasi" of the Compliance case view (pure), after design-reference/Lokasi.dc.html, read
 * only: what the applicant declared per location, the documents with the status the reviewer
 * recorded, and what the Surveyor found on site. Nothing is re-judged — "Hasil Lapangan" is the
 * surveyor's own answer, the status is the reviewer's own decision.
 */

const SCHEME = "VIU_KONSUMSI" as const;

export type FieldAnswer = "sesuai" | "tidak" | null;
export type LocationDocument = Evidence & { key: string; status: VerificationStatusValue };

export type LocationVisitResult = {
  status: string;
  surveyorName: string | null;
  actualVisitDate: string | null;
  addressFound: string | null;
  addressMatch: FieldAnswer;
  ownershipMatch: FieldAnswer;
  leaseStillValid: FieldAnswer;
  registrationMatch: FieldAnswer;
  conclusionStatus: string | null;
  recommendation: string | null;
  summary: string | null;
  findings: string | null;
  photos: (Evidence & { caption: string | null })[];
};

export type LocationInput = {
  id: string;
  type: string;
  address: string;
  buildingStatus: "MILIK_SENDIRI" | "SEWA" | null;
  leaseEndDate: string | null;
  leaseOriginalOwnerName: string | null;
  registration: string | null;
  documents: LocationDocument[];
  visit: LocationVisitResult | null;
};

export type LokasiInput = { submittedAt: string; locations: LocationInput[] };

const ANSWER_LABELS: Record<"sesuai" | "tidak", string> = { sesuai: "Sesuai", tidak: "Tidak Sesuai" };
const BUILDING_LABELS = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" } as const;

export function answerLabel(answer: FieldAnswer, visited: boolean): string {
  if (answer) return ANSWER_LABELS[answer];
  return visited ? "Belum diisi" : "Belum dikunjungi";
}

/** Whole months from `fromIso` to the calendar day `to` (YYYY-MM-DD), floored; negative when expired. */
export function monthsUntil(fromIso: string, to: string): number | null {
  const from = new Date(fromIso);
  const end = new Date(`${to.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(end.getTime())) return null;
  let months = (end.getUTCFullYear() - from.getUTCFullYear()) * 12 + (end.getUTCMonth() - from.getUTCMonth());
  if (end.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

function regulationOf(document: LocationDocument | undefined): { requirement: string; regulation: string } {
  if (!document) return { requirement: "—", regulation: "—" };
  const requirement = resolveDocumentRequirement([SCHEME], document.key);
  const def = requirement.bySchemes[0]?.def;
  return {
    requirement: requirement.sifat ? DOCUMENT_SIFAT_LABELS[requirement.sifat] : "—",
    regulation: def ? formatLegalBasis(def.legalBasis) : "—",
  };
}

export type LokasiRow = {
  id: string;
  parameter: string;
  value: string;
  detail: string;
  document: LocationDocument | null;
  field: string;
  fieldTone: "ok" | "bad" | "none";
  requirement: string;
  regulation: string;
};

export type LokasiGroup = { location: LocationInput; rows: LokasiRow[] };

function fieldTone(answer: FieldAnswer): LokasiRow["fieldTone"] {
  return answer === "sesuai" ? "ok" : answer === "tidak" ? "bad" : "none";
}

function rowsOf(location: LocationInput, submittedAt: string): LokasiRow[] {
  const visited = location.visit !== null;
  const tenure = location.documents.find((document) => /:(ownership|lease):/.test(document.key));
  const registration = location.documents.find((document) => document.key.endsWith(":warehouseRegistration"));
  const rows: LokasiRow[] = [
    {
      id: `${location.id}-address`,
      parameter: `Alamat ${location.type}`,
      value: location.address || "—",
      detail: location.visit?.addressFound ? `Ditemukan di lapangan: ${location.visit.addressFound}` : "—",
      document: tenure ?? null,
      field: answerLabel(location.visit?.addressMatch ?? null, visited),
      fieldTone: fieldTone(location.visit?.addressMatch ?? null),
      ...regulationOf(tenure),
    },
    {
      id: `${location.id}-tenure`,
      parameter: "Status Penguasaan",
      value: location.buildingStatus ? BUILDING_LABELS[location.buildingStatus] : "—",
      detail: location.buildingStatus === "SEWA" && location.leaseOriginalOwnerName ? `Pemilik: ${location.leaseOriginalOwnerName}` : tenure ? tenure.label : "—",
      document: tenure ?? null,
      field: answerLabel(location.visit?.ownershipMatch ?? null, visited),
      fieldTone: fieldTone(location.visit?.ownershipMatch ?? null),
      ...regulationOf(tenure),
    },
  ];
  if (location.buildingStatus === "SEWA") {
    const months = location.leaseEndDate ? monthsUntil(submittedAt, location.leaseEndDate) : null;
    rows.push({
      id: `${location.id}-lease`,
      parameter: "Masa Berlaku Sewa",
      value: location.leaseEndDate ? location.leaseEndDate.slice(0, 10) : "—",
      detail: months === null ? "—" : months < 0 ? "Sudah berakhir saat pengajuan" : `Sisa ±${months} bulan sejak pengajuan`,
      document: tenure ?? null,
      field: answerLabel(location.visit?.leaseStillValid ?? null, visited),
      fieldTone: fieldTone(location.visit?.leaseStillValid ?? null),
      ...regulationOf(tenure),
    });
  }
  if (location.type === "Gudang") {
    rows.push({
      id: `${location.id}-registration`,
      parameter: "Tanda Daftar Gudang",
      value: location.registration ?? "—",
      detail: registration ? registration.label : "—",
      document: registration ?? null,
      field: answerLabel(location.visit?.registrationMatch ?? null, visited),
      fieldTone: fieldTone(location.visit?.registrationMatch ?? null),
      ...regulationOf(registration),
    });
  }
  return rows;
}

export type LokasiStageView = {
  flow: { label: string; value: string; tone: "ok" | "warn" | "none" }[];
  groups: LokasiGroup[];
  photos: (Evidence & { caption: string | null; location: string })[];
  documentCount: number;
  fieldSummary: { matches: number; total: number };
};

export function buildLokasiStage(input: LokasiInput): LokasiStageView {
  const groups = input.locations.map((location) => ({ location, rows: rowsOf(location, input.submittedAt) }));
  const rows = groups.flatMap((group) => group.rows);
  const answered = rows.filter((row) => row.fieldTone !== "none");
  const matches = answered.filter((row) => row.fieldTone === "ok").length;
  const photos = input.locations.flatMap((location) => (location.visit?.photos ?? []).map((photo) => ({ ...photo, location: location.type })));
  const documentCount = new Set(input.locations.flatMap((location) => location.documents.map((document) => document.path))).size;
  const visited = input.locations.filter((location) => location.visit?.actualVisitDate).length;
  const concluded = input.locations.filter((location) => location.visit?.conclusionStatus);
  const conclusions = [...new Set(concluded.map((location) => location.visit!.conclusionStatus!))];

  return {
    flow: [
      { label: "Alamat Dilaporkan", value: `${input.locations.length} lokasi`, tone: input.locations.length ? "ok" : "none" },
      { label: "Dokumen Legal", value: `${documentCount} dokumen tersedia`, tone: documentCount ? "ok" : "none" },
      { label: "Lokasi Aktual", value: `${visited} dari ${input.locations.length} dikunjungi`, tone: visited === input.locations.length && visited > 0 ? "ok" : visited ? "warn" : "none" },
      { label: "Evidence", value: `${photos.length} foto`, tone: photos.length ? "ok" : "none" },
      { label: "Hasil Verifikasi", value: answered.length ? `${matches}/${answered.length} parameter sesuai` : "Belum ada hasil", tone: !answered.length ? "none" : matches === answered.length ? "ok" : "warn" },
      {
        label: "Kesimpulan",
        value: concluded.length === input.locations.length && concluded.length ? conclusions.join(", ") : "Belum disimpulkan",
        tone: concluded.length === input.locations.length && conclusions.every((status) => status === "Sesuai") && concluded.length ? "ok" : concluded.length ? "warn" : "none",
      },
    ],
    groups,
    photos,
    documentCount,
    fieldSummary: { matches, total: answered.length },
  };
}
