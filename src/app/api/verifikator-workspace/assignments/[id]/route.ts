import { NextResponse } from "next/server";
import { z } from "zod";
import type { LocationVisit } from "@/generated/prisma/client";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { computeFindings, type OfficeVerificationValues } from "@/modules/surveyor-workspace/components/office-verification/schema";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import { getDocumentMeta } from "@/modules/company/document-versions";
import {
  buildDocumentChecklist,
  buildProductChecklist,
  COMPANY_MAPPED_DOCUMENT_KEYS,
  productVerificationsSchema,
} from "@/modules/verifikator-workspace/schema";
import { toChecklistCompanyContext } from "@/modules/verifikator-workspace/company-context";

async function loadAssignment(assignmentNumber: string, verifikatorId: string) {
  const found = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true, surveyor: true, verifikator: true, technicalReviewer: true, locationVisits: true },
  });
  if (!found) return null;

  // Claim-on-view: the Approval Center is a shared queue. Opening an
  // unclaimed, submitted assignment assigns it to the viewing verifikator,
  // matching the "Setiap item pada Approval Center terhubung langsung ke
  // Assignment Detail" workflow — there is no separate "Claim" step.
  if (found.verifikatorId === null && found.status === "SUBMITTED") {
    const claimed = await db.assignment.update({
      where: { id: found.id },
      data: { verifikatorId },
      include: { application: true, surveyor: true, verifikator: true, technicalReviewer: true, locationVisits: true },
    });
    return claimed;
  }

  if (found.verifikatorId !== verifikatorId) return null;
  return found;
}

/**
 * Survey Lapangan spans the whole application, not just this one assignment
 * — a "dokumen"/"technical" assignment has none of its own location visits;
 * they live on the sibling "survey" assignment for the same application. See
 * the mirrored fix in `assignments/[id]/locations/route.ts`.
 *
 * The same sibling-row split applies to team membership: each Assignment row
 * only ever carries ONE of surveyorId/verifikatorId/technicalReviewerId (set
 * by Customer Relation Workspace based on scheduleType), so the surveyor and
 * technical reviewer for this application live on separate sibling rows, not
 * on the "dokumen" row the verifikator is viewing.
 */
/** Builds a Team tab row (name + Surat Tugas info) from a person's name and the assignment row that carries their letter. */
function teamMemberSummary(
  name: string | undefined,
  source: { id: string; scheduledDate: Date | null; letterNumber: string | null; letterStatus: string } | null | undefined,
) {
  if (!name || !source) return null;
  return {
    name,
    date: source.scheduledDate ? source.scheduledDate.toISOString() : null,
    assignmentId: source.id,
    letterNumber: source.letterNumber,
    letterStatus: source.letterStatus,
  };
}

async function loadApplicationSurveyData(applicationId: string, ownVisits: LocationVisit[]) {
  const siblingAssignments = await db.assignment.findMany({
    where: { applicationId },
    include: { locationVisits: true, surveyor: true, technicalReviewer: true },
  });
  const allVisits = siblingAssignments.flatMap((a) => a.locationVisits);
  const STATUS_RANK: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 };
  const byLocationType = new Map<string, LocationVisit>();
  for (const visit of [...ownVisits, ...allVisits]) {
    const existing = byLocationType.get(visit.locationType);
    if (!existing || STATUS_RANK[visit.status] > STATUS_RANK[existing.status]) {
      byLocationType.set(visit.locationType, visit);
    }
  }
  const surveyAssignment = siblingAssignments.find((a) => a.surveyorId) ?? null;
  const technicalAssignment = siblingAssignments.find((a) => a.technicalReviewerId) ?? null;
  return {
    locationVisits: [...byLocationType.values()],
    surveyorName: surveyAssignment?.surveyor?.name ?? null,
    surveyAssignment,
    technicalAssignment,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await loadAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;
  const documentChecklist = buildDocumentChecklist(payload, toChecklistCompanyContext(company));
  const productChecklist = buildProductChecklist(payload);
  const productVerifications = productVerificationsSchema.parse(assignment.productVerifications ?? {});

  const companyKeys = documentChecklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const appOnlyKeys = documentChecklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);
  const companyDocMeta = company
    ? await getDocumentMeta(company.id, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), company.createdAt)
    : {};
  const appDocMeta = await getApplicationDocumentMeta(assignment.application.id, appOnlyKeys, assignment.application.createdAt);
  const { locationVisits, surveyorName, surveyAssignment, technicalAssignment } = await loadApplicationSurveyData(
    assignment.applicationId,
    assignment.locationVisits,
  );

  const documentsVerified = documentChecklist.filter((item) => {
    const meta = item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyDocMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : appDocMeta[item.key];
    return meta && meta.verificationStatus !== "NOT_YET_VERIFIED" && meta.verificationStatus !== "EXPIRED";
  }).length;
  const productsVerified = productChecklist.filter(
    (item) => productVerifications[item.id]?.status && productVerifications[item.id]?.status !== "PENDING",
  ).length;

  let totalFindings = 0;
  for (const visit of locationVisits) {
    if (visit.officeVerification) {
      totalFindings += computeFindings(visit.officeVerification as OfficeVerificationValues).length;
    } else if (Array.isArray(visit.findings)) {
      totalFindings += visit.findings.length;
    }
  }

  const completedVisits = locationVisits.filter((v) => v.status === "COMPLETED");
  const surveyCompletionDate = completedVisits.length
    ? completedVisits.reduce<Date | null>((latest, v) => {
        if (!v.submittedAt) return latest;
        return !latest || v.submittedAt > latest ? v.submittedAt : latest;
      }, null)
    : null;

  const surveyProgress = locationVisits.length
    ? completedVisits.length / locationVisits.length
    : 0;

  let overallProgress: number;
  let currentStage: string;
  if (assignment.status === "COMPLETED") {
    overallProgress = 100;
    currentStage = "Selesai — Disetujui";
  } else if (assignment.status === "RETURNED") {
    overallProgress = 100;
    currentStage = "Dikembalikan untuk Revisi";
  } else if (assignment.status === "SUBMITTED") {
    const reviewTotal = documentChecklist.length + productChecklist.length;
    const reviewDone = documentsVerified + productsVerified;
    const reviewFraction = reviewTotal > 0 ? reviewDone / reviewTotal : 0;
    overallProgress = Math.round(70 + reviewFraction * 30);
    currentStage = "Menunggu Validasi Verifikator";
  } else {
    overallProgress = Math.round(surveyProgress * 70);
    currentStage = "Survey Lapangan Berlangsung";
  }

  const timeline: { label: string; date: string; description?: string }[] = [
    { label: "Assignment Dibuat", date: assignment.createdAt.toISOString() },
  ];
  if (assignment.scheduledDate) {
    timeline.push({ label: "Survey Dijadwalkan", date: assignment.scheduledDate.toISOString() });
  }
  for (const visit of completedVisits) {
    if (visit.submittedAt) {
      timeline.push({
        label: `Survey Lokasi Selesai — ${visit.locationType}`,
        date: visit.submittedAt.toISOString(),
        description: visit.address,
      });
    }
  }
  if (assignment.validatedAt) {
    timeline.push({
      label: assignment.status === "COMPLETED" ? "Disetujui Verifikator" : "Dikembalikan Verifikator",
      date: assignment.validatedAt.toISOString(),
      description: assignment.validationNotes ?? undefined,
    });
  }
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const kantorLocation = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];

  return NextResponse.json({
    data: {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      status: assignment.status,
      priority: assignment.priority,
      createdAt: assignment.createdAt,
      dueDate: assignment.dueDate,
      validationNotes: assignment.validationNotes,
      validatedAt: assignment.validatedAt,
      application: {
        applicationNumber: assignment.application.applicationNumber,
        verificationType: assignment.application.verificationType,
        applicationCategory: assignment.application.applicationCategory,
        createdAt: assignment.application.createdAt,
        payload,
      },
      company: {
        companyName: payload.companyName,
        // Company Workspace's profile editor can change these after submission (Legal/Tax
        // sections) — prefer the live Company row over the frozen application payload so the
        // "Uraian yang Diperiksa" comparison values don't stay stuck on stale data.
        nibNumber: company?.nibNumber || payload.nibNumber,
        nibIssueDate: company?.nibIssueDate ? company.nibIssueDate.toISOString() : null,
        businessAddress: kantorLocation
          ? `${kantorLocation.address}, ${kantorLocation.city}, ${kantorLocation.province}`
          : null,
        kbliEntries: payload.kbliEntries ?? [],
        locations: payload.locations ?? [],
        notarialDeedNumber: company?.notarialDeedNumber ?? null,
        notarialAmendmentNumber: company?.notarialAmendmentNumber ?? null,
        notarialAmendmentDate: company?.notarialAmendmentDate ? company.notarialAmendmentDate.toISOString() : null,
        skNumber: company?.skNumber ?? null,
        npwpNumber: company?.npwpNumber ?? null,
        sktNumber: company?.sktNumber ?? null,
        sktIssuer: company?.sktIssuer ?? null,
        sktDate: company?.sktDate ? company.sktDate.toISOString() : null,
      },
      verificationProgram: {
        type: assignment.application.verificationType,
        importTypes: payload.importTypes ?? [],
        products: productChecklist,
      },
      team: {
        surveyor: teamMemberSummary(surveyAssignment?.surveyor?.name, surveyAssignment),
        verifikator: teamMemberSummary(assignment.verifikator?.name, assignment),
        technicalReviewer: teamMemberSummary(technicalAssignment?.technicalReviewer?.name, technicalAssignment),
        teamMembers: (assignment.teamMembers as { name: string; role?: string }[] | null) ?? [],
      },
      surveyInformation: {
        surveyorName: assignment.surveyor?.name ?? surveyorName ?? "—",
        scheduledDate: assignment.scheduledDate,
        completionDate: surveyCompletionDate,
        locationVisits: locationVisits.map((v) => ({
          id: v.id,
          locationType: v.locationType,
          address: v.address,
          city: v.city,
          status: v.status,
          submittedAt: v.submittedAt,
        })),
      },
      progress: {
        overallProgress,
        currentStage,
        timeline,
      },
      quickStats: {
        totalDocuments: documentChecklist.length,
        documentsVerified,
        totalProducts: productChecklist.length,
        productsVerified,
        totalFindings,
        pendingReview: documentChecklist.length + productChecklist.length - documentsVerified - productsVerified,
      },
    },
  });
}

const draftNotesSchema = z.object({ validationNotes: z.string().trim() });

/** Draft Report tab's "Save Draft" — writes the Kesimpulan Verifikator text without touching status/validatedAt (that only happens via the /decision endpoint). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!assignment || assignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const parsed = draftNotesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: { validationNotes: parsed.data.validationNotes },
  });

  return NextResponse.json({ data: { validationNotes: updated.validationNotes } });
}
