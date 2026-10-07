import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { findApplicationEditAfter } from "@/modules/applications/server/edited-after";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { activeVisitsForApplication, collectApplicationVisits, type SurveyPayloadLocation } from "@/modules/shared/survey-visit-scope";
import { allModulesDecided, overallTechnicalStatus, technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";

const ASSIGNMENT_STATUS_RANK: Record<string, number> = { ASSIGNED: 0, SCHEDULED: 1, IN_PROGRESS: 2, SUBMITTED: 3, RETURNED: 3, COMPLETED: 4 };

/**
 * A "technical" scheduleType Assignment carries no location visits or document
 * data of its own — that lives on the sibling "survey"/"dokumen" Assignment rows
 * for the same applicationId, same split established for verifikator's Team tab
 * (see `src/app/api/verifikator-workspace/assignments/[id]/route.ts`).
 *
 * A reschedule can leave MULTIPLE "survey" sibling rows for the same application
 * (old + new), each with its own subset of location visits — picking only the
 * first one via `.find()` silently hid completed reports left on a later row.
 * Same fix as verifikator's `loadApplicationSurveyData`: merge visits from every
 * survey sibling, keeping the most-progressed visit per physical location (a survey assignment
 * only owns its own scheduled location — see survey-visit-scope). "dokumen"
 * duplicates are rarer but handled the same way — pick the most-progressed row.
 */
async function loadSiblingSummaries(applicationId: string, payloadLocations: SurveyPayloadLocation[]) {
  const siblings = await db.assignment.findMany({
    where: { applicationId },
    include: { locationVisits: true },
  });

  const surveyAssignments = siblings.filter((a) => a.surveyorId);
  const mergedVisits = activeVisitsForApplication(collectApplicationVisits(surveyAssignments), payloadLocations).map((visit) => ({
    id: visit.id,
    locationType: visit.locationType,
    address: visit.address,
    city: visit.city,
    status: visit.status,
    assignmentNumber: visit.assignmentNumber,
  }));

  const dokumenAssignment =
    siblings
      .filter((a) => a.verifikatorId)
      .sort((a, b) => (ASSIGNMENT_STATUS_RANK[b.status] ?? 0) - (ASSIGNMENT_STATUS_RANK[a.status] ?? 0))[0] ?? null;

  return {
    survey: surveyAssignments.length > 0 ? { locationVisits: mergedVisits } : null,
    dokumen: dokumenAssignment
      ? { assignmentNumber: dokumenAssignment.assignmentNumber, status: dokumenAssignment.status }
      : null,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    include: { application: true },
  });
  if (!assignment || assignment.technicalReviewerId !== technicalAnalystId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;
  const siblings = await loadSiblingSummaries(assignment.applicationId, payload.locations ?? []);
  const technicalAnalysisData = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});

  const kantorLocation = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];

  const applicationEditedAfterAssignment = await findApplicationEditAfter(assignment.applicationId, assignment.createdAt);

  return NextResponse.json({
    data: {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      status: assignment.status,
      applicationEditedAfterAssignment,
      revisionCount: assignment.revisionCount,
      revisionReceivedAt: assignment.revisionReceivedAt,
      lastReturnNotes: assignment.lastReturnNotes,
      priority: assignment.priority,
      createdAt: assignment.createdAt,
      // Tanggal Penugasan (entered by Customer Relationship) — see src/lib/assignment-date.ts.
      scheduledDate: assignment.scheduledDate,
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
        nibNumber: payload.nibNumber,
        businessAddress: kantorLocation
          ? `${kantorLocation.address}, ${kantorLocation.city}, ${kantorLocation.province}`
          : null,
        sktNumber: company?.sktNumber ?? null,
      },
      siblings,
      overallStatus: overallTechnicalStatus(assignment.application.verificationType, technicalAnalysisData, payload.importTypes),
      readyForDecision: allModulesDecided(assignment.application.verificationType, technicalAnalysisData, payload.importTypes),
    },
  });
}
