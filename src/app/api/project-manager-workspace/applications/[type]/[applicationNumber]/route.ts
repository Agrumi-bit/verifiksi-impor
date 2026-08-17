import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import { getDocumentMeta } from "@/modules/company/document-versions";
import {
  buildDocumentChecklist,
  buildMachineChecklist,
  buildProductChecklist,
  buildCapacityRows,
  buildProductionQtyChecklist,
  buildRawMaterialUsageChecklist,
  buildRawMaterialConversionRows,
  buildSalesChecklist,
  COMPANY_MAPPED_DOCUMENT_KEYS,
  toChecklistStatus,
} from "@/modules/verifikator-workspace/schema";
import { toChecklistCompanyContext } from "@/modules/verifikator-workspace/company-context";
import { computeApplicationStage, type SiblingForStage } from "@/modules/project-manager-workspace/stage";

type DecisionMap = Record<string, { status?: string; note?: string }>;

function statusFrom(map: unknown, key: string): string {
  const decisions = (map ?? {}) as DecisionMap;
  return decisions[key]?.status ?? "PENDING";
}

type MachineDecisionMap = Record<string, { status?: string; note?: string; photoPath?: string; verifiedAt?: string }>;

const LOCATION_STATUS_RANK: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 };
const ASSIGNMENT_STATUS_RANK: Record<string, number> = { ASSIGNED: 0, SCHEDULED: 1, IN_PROGRESS: 2, SUBMITTED: 3, RETURNED: 3, COMPLETED: 4 };

/**
 * A reschedule can leave MULTIPLE Assignment rows with the same scheduleType for one
 * application (old + new) — same issue already fixed for verifikator/technical-analyst's
 * sibling lookups. Naively `.find()`-ing the first row risks picking an empty/stale one over
 * the real, in-progress one. Pick the most-progressed row per scheduleType, and for "survey"
 * specifically, merge locationVisits across every survey sibling (deduped by locationType,
 * keeping the most-progressed visit) so a location completed on a later reschedule isn't lost.
 */
function pickMostProgressed<T extends { status: string }>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => (ASSIGNMENT_STATUS_RANK[b.status] ?? 0) - (ASSIGNMENT_STATUS_RANK[a.status] ?? 0))[0];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; applicationNumber: string }> },
) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { applicationNumber } = await params;
  const application = await db.application.findUnique({
    where: { applicationNumber },
    include: {
      company: true,
      assignments: {
        include: {
          surveyor: { select: { name: true } },
          verifikator: { select: { name: true } },
          technicalReviewer: { select: { name: true } },
          locationVisits: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!application) {
    return NextResponse.json({ error: "Aplikasi tidak ditemukan" }, { status: 404 });
  }

  const payload = application.payload as ApplicationWizardValues;
  const dokumen = pickMostProgressed(application.assignments.filter((a) => a.scheduleType === "dokumen"));
  const technical = pickMostProgressed(application.assignments.filter((a) => a.scheduleType === "technical"));
  const surveySiblings = application.assignments.filter((a) => a.scheduleType === "survey");
  const survey = pickMostProgressed(surveySiblings);

  // Merge locationVisits from every survey sibling (not just the most-progressed row's own
  // visits) — a reschedule's older sibling may hold a visit the newer one never got, and vice
  // versa. Dedup by locationType, keep whichever copy is furthest along.
  const mergedLocationVisitsByType = new Map<string, (typeof surveySiblings)[number]["locationVisits"][number] & { assignmentNumber: string }>();
  for (const sibling of surveySiblings) {
    for (const visit of sibling.locationVisits) {
      const existing = mergedLocationVisitsByType.get(visit.locationType);
      if (!existing || (LOCATION_STATUS_RANK[visit.status] ?? 0) > (LOCATION_STATUS_RANK[existing.status] ?? 0)) {
        mergedLocationVisitsByType.set(visit.locationType, { ...visit, assignmentNumber: sibling.assignmentNumber });
      }
    }
  }
  const mergedLocationVisits = [...mergedLocationVisitsByType.values()];

  const siblingsForStage: SiblingForStage[] = [
    ...(dokumen ? [{ scheduleType: "dokumen", status: dokumen.status, dueDate: dokumen.dueDate?.toISOString() ?? null, locationVisits: [] }] : []),
    ...(technical ? [{ scheduleType: "technical", status: technical.status, dueDate: technical.dueDate?.toISOString() ?? null, locationVisits: [] }] : []),
    ...(survey
      ? [{ scheduleType: "survey", status: survey.status, dueDate: survey.dueDate?.toISOString() ?? null, locationVisits: mergedLocationVisits.map((v) => ({ status: v.status })) }]
      : []),
  ];
  const stageResult = computeApplicationStage(siblingsForStage);

  const documentChecklistBase = buildDocumentChecklist(payload, toChecklistCompanyContext(application.company));
  const companyKeys = documentChecklistBase.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const appOnlyKeys = documentChecklistBase.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);
  const companyMeta = application.company
    ? await getDocumentMeta(application.company.id, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), application.company.createdAt)
    : {};
  const appMeta = await getApplicationDocumentMeta(application.id, appOnlyKeys, application.createdAt);
  const documentChecklist = documentChecklistBase.map((item) => {
    const meta = item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : appMeta[item.key];
    return {
      ...item,
      hasDocument: Boolean(item.documentPath),
      status: meta ? toChecklistStatus(meta.verificationStatus) : statusFrom(dokumen?.documentVerifications, item.key),
      uploadedAt: meta?.uploadedAt ?? null,
      verifiedByName: meta?.verifiedByName ?? null,
      verifiedByRole: meta?.verifiedByRole ?? null,
      verifiedAt: meta?.verifiedAt ?? null,
    };
  });
  const machineDecisions = (dokumen?.machineVerifications ?? {}) as MachineDecisionMap;
  const machines = buildMachineChecklist(payload).map((item) => ({
    ...item,
    photoMesinPath: machineDecisions[item.id]?.photoPath || item.photoMesinPath,
    status: machineDecisions[item.id]?.status ?? "PENDING",
    note: machineDecisions[item.id]?.note ?? "",
    verifiedAt: machineDecisions[item.id]?.verifiedAt ?? null,
  }));
  const productDecisions = (dokumen?.productVerifications ?? {}) as MachineDecisionMap;
  const products = buildProductChecklist(payload).map((item) => ({
    ...item,
    status: productDecisions[item.id]?.status ?? "PENDING",
    note: productDecisions[item.id]?.note ?? "",
    verifiedAt: productDecisions[item.id]?.verifiedAt ?? null,
  }));
  const capacity = buildCapacityRows(payload);
  const productionQty = buildProductionQtyChecklist(payload).map((item) => ({
    ...item,
    status: statusFrom(dokumen?.productionQtyVerifications, item.key),
  }));
  const rawMaterialUsage = buildRawMaterialUsageChecklist(payload);
  const rawMaterialConversion = buildRawMaterialConversionRows(payload);
  const sales = buildSalesChecklist(payload);

  const kantorLocation = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];
  const businessAddress = kantorLocation ? `${kantorLocation.address}, ${kantorLocation.city}, ${kantorLocation.province}` : null;

  return NextResponse.json({
    data: {
      applicationNumber: application.applicationNumber,
      verificationType: application.verificationType,
      applicationCategory: application.applicationCategory,
      createdAt: application.createdAt,
      payload,
      businessAddress,
      company: application.company
        ? {
            companyName: application.company.companyName,
            nibNumber: application.company.nibNumber,
            kbliEntries: application.company.kbliEntries,
            sktNumber: application.company.sktNumber,
          }
        : { companyName: payload.companyName, nibNumber: payload.nibNumber, kbliEntries: [], sktNumber: null },
      stage: stageResult.stage,
      status: stageResult.status,
      slaLabel: stageResult.slaLabel,
      slaDetail: stageResult.slaDetail,
      slaColor: stageResult.slaColor,
      assignments: {
        survey: survey
          ? {
              id: survey.id,
              assignmentNumber: survey.assignmentNumber,
              status: survey.status,
              surveyorName: survey.surveyor?.name ?? null,
              scheduledDate: survey.scheduledDate,
              location: survey.location,
              letterStatus: survey.letterStatus,
              letterNumber: survey.letterNumber,
              letterReviewNote: survey.letterReviewNote,
              pmReviewStatus: survey.pmReviewStatus,
              pmReviewNote: survey.pmReviewNote,
              pmReviewedAt: survey.pmReviewedAt,
              allLocationsCompleted: mergedLocationVisits.length > 0 && mergedLocationVisits.every((v) => v.status === "COMPLETED"),
              locationVisits: mergedLocationVisits.map((v) => {
                const findingsCount = Array.isArray(v.findings) ? v.findings.length : 0;
                const reportVerification = v.reportVerification as
                  | { decision: "VERIFIED" | "REJECTED" | "REVISION" | null; decisionNote: string | null; verifiedByName: string | null; verifiedAt: string | null }
                  | null;
                return {
                  id: v.id,
                  locationType: v.locationType,
                  address: v.address,
                  city: v.city,
                  status: v.status,
                  assignmentNumber: v.assignmentNumber,
                  scheduledDate: v.scheduledDate,
                  submittedAt: v.submittedAt,
                  findingsCount,
                  surveyorConclusion: v.reportSummary || v.fieldObservationNotes || null,
                  decision: reportVerification?.decision ?? null,
                  decisionNote: reportVerification?.decisionNote ?? null,
                  verifiedByName: reportVerification?.verifiedByName ?? null,
                  verifiedAt: reportVerification?.verifiedAt ?? null,
                };
              }),
            }
          : null,
        dokumen: dokumen
          ? {
              id: dokumen.id,
              assignmentNumber: dokumen.assignmentNumber,
              status: dokumen.status,
              verifikatorName: dokumen.verifikator?.name ?? null,
              scheduledDate: dokumen.scheduledDate,
              location: dokumen.location,
              letterStatus: dokumen.letterStatus,
              letterNumber: dokumen.letterNumber,
              letterReviewNote: dokumen.letterReviewNote,
              pmReviewStatus: dokumen.pmReviewStatus,
              pmReviewNote: dokumen.pmReviewNote,
              pmReviewedAt: dokumen.pmReviewedAt,
              validatedAt: dokumen.validatedAt,
            }
          : null,
        technical: technical
          ? {
              id: technical.id,
              assignmentNumber: technical.assignmentNumber,
              status: technical.status,
              technicalReviewerName: technical.technicalReviewer?.name ?? null,
              scheduledDate: technical.scheduledDate,
              location: technical.location,
              letterStatus: technical.letterStatus,
              letterNumber: technical.letterNumber,
              letterReviewNote: technical.letterReviewNote,
              pmReviewStatus: technical.pmReviewStatus,
              pmReviewNote: technical.pmReviewNote,
              pmReviewedAt: technical.pmReviewedAt,
              validatedAt: technical.validatedAt,
              technicalAnalysisData: technical.technicalAnalysisData ?? {},
            }
          : null,
      },
      documentChecklist,
      machines,
      products,
      capacity,
      capacityDocumentPath: payload.capacityDocumentPath ?? null,
      productionQty,
      rawMaterialUsage,
      rawMaterialConversion,
      sales,
      timeline: buildTimeline(application, survey, dokumen, technical),
    },
  });
}

function buildTimeline(
  application: { createdAt: Date },
  survey: { createdAt: Date; scheduledDate: Date | null; letterStatus: string; updatedAt: Date; status: string } | null,
  dokumen: { createdAt: Date; validatedAt: Date | null; letterStatus: string; status: string } | null,
  technical: { createdAt: Date; validatedAt: Date | null; letterStatus: string; status: string } | null,
) {
  const events: { title: string; time: string }[] = [{ title: "Application Submitted", time: application.createdAt.toISOString() }];
  if (dokumen) {
    events.push({ title: "Dokumen Assignment Created", time: dokumen.createdAt.toISOString() });
    if (dokumen.validatedAt) events.push({ title: `Document Verification ${dokumen.status}`, time: dokumen.validatedAt.toISOString() });
  }
  if (survey) {
    events.push({ title: "Survey Assignment Created", time: survey.createdAt.toISOString() });
    if (survey.scheduledDate) events.push({ title: "Survey Scheduled", time: survey.scheduledDate.toISOString() });
  }
  if (technical) {
    events.push({ title: "Technical Analysis Assignment Created", time: technical.createdAt.toISOString() });
    if (technical.validatedAt) events.push({ title: `Technical Analysis ${technical.status}`, time: technical.validatedAt.toISOString() });
  }
  return events.sort((a, b) => a.time.localeCompare(b.time));
}
