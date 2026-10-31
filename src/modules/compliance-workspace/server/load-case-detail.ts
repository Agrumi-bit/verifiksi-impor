import "server-only";

import { db } from "@/lib/db";
import { MODAL_STATEMENT_LETTER_DOC_DEF, NON_INDUSTRI_SUPPORT_DOC_DEFS } from "@/modules/applications/financial-capability-defs";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { APPLICANT_BRAND_ROLE_LABELS, type ApplicantBrandRole } from "@/modules/applications/viu-schemes/konsumsi/business-rules";
import { lhviuIsIssued } from "@/modules/project-manager-workspace/lhviu-completion";
import { applicationMatchesViuScheme } from "@/modules/project-manager-workspace/viu-schemes";
import { composeLocationAddress, REQUIRED_LOCATION_TYPE_LABELS, type LocationType } from "@/modules/shared/schema";
import { collectApplicationVisits, groupVisitsByLocation, type SurveyPayloadLocation } from "@/modules/shared/survey-visit-scope";
import type { Evidence } from "../case-detail";
import type { DossierInput, WorkspaceOutput } from "../dossier";
import { buildCaseRow } from "../case-list";
import { KONSUMSI_SCHEME, NOT_TECHNICAL } from "./load-cases";

/* The application payload is JSON — every field is read defensively (older payloads miss some). */
type Doc = { filePath?: string; fileName?: string } | null | undefined;
type Payload = {
  importTypes?: string[];
  companyName?: string;
  contactFullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactDesignation?: string;
  npwpNumber?: string;
  nibNumber?: string;
  notarialDeedNumber?: string;
  kbliEntries?: { code?: string; description?: string }[];
  nibDocumentPath?: string;
  npwpDocumentPath?: string;
  kbliDocumentPath?: string;
  notarialDocumentPath?: string;
  notarialAmendmentDocPath?: string;
  skDocumentPath?: string;
  locations?: (SurveyPayloadLocation & {
    buildingStatus?: string;
    city?: string;
    ownershipDocuments?: { documentPath?: string }[];
    leaseDocuments?: { documentPath?: string }[];
    warehouseRegistrationDocumentPath?: string;
    warehouseLayoutDocumentPath?: string;
  })[];
  applicationBrands?: {
    brandId: string;
    applicantRole?: string;
    relationshipDocuments?: Record<string, Doc>;
    submissionSnapshot?: { brandName?: string };
  }[];
  konsumsiProducts?: {
    brandId: string;
    commodityGroupId: string;
    hsCode?: string;
    quantity?: string;
    averageUnitPrice?: string;
    currency?: string;
    stockQuantity?: string;
  }[];
  productGroupCertificates?: {
    brandId: string;
    commodityGroupId: string;
    commodityName?: string;
    certificateNumber?: string;
    laboratoryName?: string;
    issueDate?: string;
    fileName?: string;
    filePath?: string;
  }[];
  labelStatementDocument?: Doc;
  labelDocumentationDocument?: Doc;
  konsumsiFinancialDocuments?: { key: string; enabled?: boolean; documentPath?: string; amount?: string }[];
};

const BUILDING_STATUS_LABELS: Record<string, string> = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" };
const VISIT_STATUS_LABELS: Record<string, string> = { NOT_STARTED: "Belum dimulai", IN_PROGRESS: "Sedang berjalan", COMPLETED: "Selesai" };
const PM_REVIEW_LABELS: Record<string, string> = { PENDING: "Menunggu review PM", APPROVED: "Disetujui", REJECTED: "Ditolak" };
const REPORT_LABELS: Record<string, string> = { survey: "Laporan Survey", dokumen: "Laporan Verifikasi Dokumen" };
const FINANCIAL_LABELS = new Map([MODAL_STATEMENT_LETTER_DOC_DEF, ...NON_INDUSTRI_SUPPORT_DOC_DEFS].map((def) => [def.key, def.title]));

function evidence(label: string, path: string | null | undefined): Evidence | null {
  return path ? { label, path } : null;
}

function present<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function number(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rupiah(amount: string | undefined): string | null {
  const value = Number((amount ?? "").replace(/[^\d]/g, ""));
  return value > 0 ? `Rp ${value.toLocaleString("id-ID")}` : null;
}

function addOneYear(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${year + 1}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

function lhviuDocument(value: unknown): { path: string | null; number: string | null; issuedAt: string | null; issuedBy: string | null } {
  if (!value || typeof value !== "object") return { path: null, number: null, issuedAt: null, issuedBy: null };
  const raw = value as { path?: unknown; number?: unknown; issuedAt?: unknown; uploadedByName?: unknown };
  return {
    path: typeof raw.path === "string" && raw.path ? raw.path : null,
    number: typeof raw.number === "string" && raw.number.trim() ? raw.number.trim() : null,
    issuedAt: typeof raw.issuedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.issuedAt) ? raw.issuedAt : null,
    // The Project Manager who uploaded the signed LHVIU.
    issuedBy: typeof raw.uploadedByName === "string" && raw.uploadedByName.trim() ? raw.uploadedByName.trim() : null,
  };
}

/** One VIU Konsumsi case, read only, ready for buildCaseSteps / buildMatrix / buildDossier. Null when not found or out of scope. */
export async function loadCaseDetail(applicationId: string): Promise<DossierInput | null> {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicationNumber: true,
      applicationCategory: true,
      verificationType: true,
      status: true,
      payload: true,
      submissionDate: true,
      createdAt: true,
      updatedAt: true,
      lhviuDocument: true,
      returnedByRole: true,
      company: { select: { companyName: true, nibNumber: true } },
      // VIU Konsumsi has no Technical Analyst step — a "technical" assignment is never shown.
      assignments: {
        where: NOT_TECHNICAL,
        select: {
          assignmentNumber: true,
          scheduleType: true,
          status: true,
          letterStatus: true,
          scheduledDate: true,
          locationId: true,
          pmReviewStatus: true,
          pmReviewedAt: true,
          pmReviewedByName: true,
          validatedAt: true,
          signatureDate: true,
          updatedAt: true,
          surveyor: { select: { name: true } },
          verifikator: { select: { name: true } },
          locationVisits: { select: { id: true, status: true, locationType: true, address: true, companyLocationId: true, submittedAt: true, updatedAt: true, createdAt: true } },
        },
      },
      complianceCase: { include: { picUser: { select: { name: true } } } },
      complianceIssues: { select: { id: true, issueNumber: true, kind: true, title: true, requirementKey: true, sourceWorkspace: true, updatedAt: true } },
    },
  });
  if (!app || app.status === "DRAFT") return null;
  const payload = (app.payload ?? {}) as Payload;
  if (!applicationMatchesViuScheme(app.verificationType, payload.importTypes, KONSUMSI_SCHEME)) return null;

  const submitted = effectiveSubmissionDate(app);
  const lhviu = lhviuDocument(app.lhviuDocument);
  const complianceCase = app.complianceCase;
  const row = buildCaseRow({
    applicationId: app.id,
    applicationNumber: app.applicationNumber,
    companyName: app.company?.companyName ?? payload.companyName ?? "—",
    nib: app.company?.nibNumber ?? payload.nibNumber ?? "—",
    submittedAt: submitted.value,
    submittedIsSystemDate: submitted.isFallback,
    updatedAt: new Date(Math.max(app.updatedAt.getTime(), ...app.assignments.map((a) => a.updatedAt.getTime()))).toISOString(),
    applicationStatus: app.status,
    returnedByRole: app.returnedByRole,
    assignments: app.assignments,
    lhviuIssued: lhviuIsIssued(lhviu),
    lhviuNumber: lhviu.number,
    lhviuIssuedAt: lhviu.issuedAt,
    complianceStatus: complianceCase?.complianceStatus ?? "BELUM_DIREVIEW",
    picUserId: complianceCase?.picUserId ?? null,
    picName: complianceCase?.picUser?.name ?? null,
    reviewFlag: complianceCase?.reviewFlag ?? false,
    finalReviewDone: complianceCase?.finalReviewDone ?? false,
    dossierComplete: complianceCase?.dossierComplete ?? false,
    findings: app.complianceIssues,
  });

  // Brand names: the server-built submission snapshot, else the Merk master record.
  const brandIds = [...new Set([...(payload.applicationBrands ?? []).map((b) => b.brandId), ...(payload.konsumsiProducts ?? []).map((p) => p.brandId)])];
  const merks = brandIds.length ? await db.merk.findMany({ where: { id: { in: brandIds } }, select: { id: true, brandName: true } }) : [];
  const brandName = new Map(merks.map((merk) => [merk.id, merk.brandName]));
  for (const entry of payload.applicationBrands ?? []) {
    if (entry.submissionSnapshot?.brandName) brandName.set(entry.brandId, entry.submissionSnapshot.brandName);
  }
  const nameOf = (brandId: string) => brandName.get(brandId) ?? brandId;

  const locations = payload.locations ?? [];
  const surveyAssignments = app.assignments.filter((a) => a.scheduleType === "survey");
  const { groups } = groupVisitsByLocation(collectApplicationVisits(surveyAssignments), locations);
  const visitStatusByKey = new Map(groups.map((group) => [group.location, group.active?.status ?? null]));

  type LoadedAssignment = (typeof app.assignments)[number];
  const outputOf = (scheduleType: string, nameOf: (a: LoadedAssignment) => string | null | undefined): WorkspaceOutput => {
    const assignments = app.assignments.filter((a) => a.scheduleType === scheduleType);
    const times = assignments.map((a) => (a.validatedAt ?? a.pmReviewedAt ?? a.updatedAt).getTime());
    const reviews = assignments.map((a) => (a.pmReviewStatus ? (PM_REVIEW_LABELS[a.pmReviewStatus] ?? a.pmReviewStatus) : null)).filter(present);
    return {
      doneAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
      names: [...new Set(assignments.map(nameOf).filter(present))],
      pmReview: reviews.length ? [...new Set(reviews)].join(", ") : null,
    };
  };
  const pmTimes = app.assignments.map((a) => a.pmReviewedAt?.getTime()).filter(present);
  // CR's part is done with the last Surat Tugas it scheduled. An assignment does not record which CR
  // scheduled it, so the CR account(s) of the system stand in for the name.
  const scheduledDates = app.assignments.map((a) => a.scheduledDate?.getTime()).filter(present);
  // "Laporan Survey Lokasi Kantor": the location(s) a survey assignment covers — its visits, else the
  // payload location it was scheduled for.
  const reportTitle = (a: LoadedAssignment): string => {
    if (a.scheduleType !== "survey") return REPORT_LABELS[a.scheduleType ?? ""] ?? "Laporan";
    const types = new Set<string>(a.locationVisits.map((visit) => visit.locationType));
    const scheduled = locations.find((location) => location.id && location.id === a.locationId);
    if (types.size === 0 && scheduled) types.add(scheduled.locationType);
    const labels = [...types].map((type) => REQUIRED_LOCATION_TYPE_LABELS[type as LocationType] ?? type);
    return labels.length ? `Laporan Survey Lokasi ${labels.join(" & ")}` : "Laporan Survey";
  };
  const crNames = (await db.user.findMany({ where: { role: "CUSTOMER_RELATIONSHIP", banned: { not: true } }, select: { name: true }, orderBy: { name: "asc" } })).map((user) => user.name);

  return {
    row,
    applicationCategory: app.applicationCategory,
    applicationStatus: app.status,
    milestones: {
      // The Verifikator's report date: the date printed under "Disusun Oleh", else when it was decided.
      verificationDate: (() => {
        const dokumen = app.assignments.filter((a) => a.scheduleType === "dokumen");
        const dates = dokumen.map((a) => (a.signatureDate ?? a.validatedAt)?.getTime()).filter(present);
        return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
      })(),
      firstScheduledDate: scheduledDates.length ? new Date(Math.min(...scheduledDates)).toISOString() : null,
    },
    contact: payload.contactFullName
      ? { name: payload.contactFullName, designation: payload.contactDesignation || null, phone: payload.contactPhone || null, email: payload.contactEmail || null }
      : null,
    legal: {
      npwp: payload.npwpNumber || null,
      nib: payload.nibNumber || null,
      kbli: (payload.kbliEntries ?? []).filter((k) => k.code).map((k) => ({ code: k.code!, description: k.description ?? "" })),
      notarialDeedNumber: payload.notarialDeedNumber || null,
      documents: [
        evidence("NIB", payload.nibDocumentPath),
        evidence("NPWP", payload.npwpDocumentPath),
        evidence("Dokumen KBLI", payload.kbliDocumentPath),
        evidence("Akta Pendirian", payload.notarialDocumentPath),
        evidence("Akta Perubahan", payload.notarialAmendmentDocPath),
        evidence("SK Kemenkumham", payload.skDocumentPath),
      ].filter(present),
    },
    locations: locations.map((location) => {
      const type = REQUIRED_LOCATION_TYPE_LABELS[location.locationType as LocationType] ?? location.locationType;
      const visitStatus = visitStatusByKey.get(location);
      return {
        type,
        address: [composeLocationAddress(location), location.city].filter(Boolean).join(", "),
        buildingStatus: location.buildingStatus ? (BUILDING_STATUS_LABELS[location.buildingStatus] ?? location.buildingStatus) : null,
        surveyStatus: visitStatus ? (VISIT_STATUS_LABELS[visitStatus] ?? visitStatus) : null,
        documents: [
          ...(location.ownershipDocuments ?? []).map((doc) => evidence(`Bukti kepemilikan ${type}`, doc.documentPath)),
          ...(location.leaseDocuments ?? []).map((doc) => evidence(`Dokumen sewa ${type}`, doc.documentPath)),
          evidence(`Tanda Daftar Gudang (${type})`, location.warehouseRegistrationDocumentPath),
          evidence(`Layout Gudang (${type})`, location.warehouseLayoutDocumentPath),
        ].filter(present),
      };
    }),
    surveyorNames: [...new Set(surveyAssignments.map((a) => a.surveyor?.name).filter(present))],
    brands: (payload.applicationBrands ?? []).map((entry) => ({
      name: nameOf(entry.brandId),
      role: entry.applicantRole ? (APPLICANT_BRAND_ROLE_LABELS[entry.applicantRole as ApplicantBrandRole] ?? entry.applicantRole) : null,
      documents: Object.values(entry.relationshipDocuments ?? {})
        .map((doc) => evidence(`${nameOf(entry.brandId)} – ${doc?.fileName ?? "dokumen hubungan merek"}`, doc?.filePath))
        .filter(present),
    })),
    products: (payload.konsumsiProducts ?? []).map((product) => ({
      brandId: product.brandId,
      commodityGroupId: product.commodityGroupId,
      hsCode: product.hsCode ?? "",
      quantity: number(product.quantity),
      averageUnitPrice: number(product.averageUnitPrice),
      currency: product.currency ?? "USD",
      stockQuantity: number(product.stockQuantity),
    })),
    certificates: (payload.productGroupCertificates ?? []).map((certificate) => ({
      brandId: certificate.brandId,
      commodityGroupId: certificate.commodityGroupId,
      brandName: nameOf(certificate.brandId),
      commodityName: certificate.commodityName ?? "—",
      certificateNumber: certificate.certificateNumber ?? "—",
      laboratoryName: certificate.laboratoryName ?? "—",
      issueDate: certificate.issueDate ?? "",
      file: evidence(`Sertifikat ${certificate.certificateNumber ?? ""}`.trim(), certificate.filePath),
    })),
    label: {
      statement: evidence("Surat Pernyataan Label", payload.labelStatementDocument?.filePath),
      documentation: evidence("Dokumentasi Label", payload.labelDocumentationDocument?.filePath),
    },
    workingCapital: (() => {
      const documents = (payload.konsumsiFinancialDocuments ?? []).filter((doc) => doc.enabled !== false);
      const statement = documents.find((doc) => doc.key === MODAL_STATEMENT_LETTER_DOC_DEF.key);
      return {
        amount: rupiah(statement?.amount),
        statement: evidence(MODAL_STATEMENT_LETTER_DOC_DEF.title, statement?.documentPath),
        supporting: documents
          .filter((doc) => doc.key !== MODAL_STATEMENT_LETTER_DOC_DEF.key && doc.enabled)
          .map((doc) => evidence(FINANCIAL_LABELS.get(doc.key) ?? doc.key, doc.documentPath))
          .filter(present),
      };
    })(),
    pmReviews: app.assignments
      .filter((a) => a.scheduleType && REPORT_LABELS[a.scheduleType])
      .map((a) => ({
        source: a.scheduleType === "survey" ? ("SV" as const) : ("VF" as const),
        title: reportTitle(a),
        report: `${REPORT_LABELS[a.scheduleType!]} (${a.assignmentNumber})`,
        status: a.pmReviewStatus ? (PM_REVIEW_LABELS[a.pmReviewStatus] ?? a.pmReviewStatus) : null,
        by: a.pmReviewedByName,
        at: a.pmReviewedAt?.toISOString() ?? null,
      })),
    lhviu: {
      number: lhviu.number,
      issuedAt: lhviu.issuedAt,
      validUntil: lhviu.issuedAt ? addOneYear(lhviu.issuedAt) : null,
      issuedBy: lhviu.issuedBy,
      file: evidence(lhviu.number ? `LHVIU ${lhviu.number}` : "LHVIU", lhviu.path),
    },
    findings: app.complianceIssues,
    administrative: {
      finalReview: { done: complianceCase?.finalReviewDone ?? false, at: complianceCase?.finalReviewAt?.toISOString() ?? null, byName: complianceCase?.finalReviewByName ?? null },
      dossier: { done: complianceCase?.dossierComplete ?? false, at: complianceCase?.dossierCompleteAt?.toISOString() ?? null, byName: complianceCase?.dossierCompleteByName ?? null },
    },
    outputs: {
      CR: {
        // An issued LHVIU closes CR's part (workspace-status.ts), so every Surat Tugas counts as approved.
        approvedLetters: row.lhviuIssued ? app.assignments.length : app.assignments.filter((a) => a.letterStatus === "APPROVED").length,
        letters: app.assignments.length,
        doneAt: scheduledDates.length ? new Date(Math.max(...scheduledDates)).toISOString() : null,
        names: crNames,
      },
      SV: outputOf("survey", (a) => a.surveyor?.name),
      VF: outputOf("dokumen", (a) => a.verifikator?.name),
      PM: { at: pmTimes.length ? new Date(Math.max(...pmTimes)).toISOString() : null, names: [...new Set(app.assignments.map((a) => a.pmReviewedByName).filter(present))] },
    },
    assignees: {
      SV: [...new Set(surveyAssignments.map((a) => a.surveyor?.name).filter(present))],
      VF: [...new Set(app.assignments.filter((a) => a.scheduleType === "dokumen").map((a) => a.verifikator?.name).filter(present))],
      PM: [...new Set(app.assignments.map((a) => a.pmReviewedByName).filter(present))],
    },
  };
}
