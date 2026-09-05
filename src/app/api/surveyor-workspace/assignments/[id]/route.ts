import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist, COMPANY_MAPPED_DOCUMENT_KEYS, toChecklistStatus } from "@/modules/verifikator-workspace/schema";
import { toChecklistCompanyContext } from "@/modules/verifikator-workspace/company-context";
import { resolvePartnerContexts } from "@/modules/verifikator-workspace/partner-context";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import { getDocumentMeta } from "@/modules/company/document-versions";

/** Builds a Team tab row (name + Surat Tugas info) from a person's name and the assignment row that carries their letter. */
function teamMemberSummary(
  name: string | undefined | null,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    include: { application: true, surveyor: true },
  });
  if (!assignment || assignment.surveyorId !== surveyorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  // Customer Relation writes surveyor/verifikator/technical assignments as separate sibling
  // rows for the same application (each Assignment only ever carries one of
  // surveyorId/verifikatorId/technicalReviewerId) — the surveyor's Team tab needs those
  // siblings to show who CR actually assigned as Verifikator/Technical Reviewer, instead of
  // this row's own `teamMembers` JSON field, which CR never populates.
  const siblings = await db.assignment.findMany({
    where: { applicationId: assignment.applicationId },
    include: { verifikator: true, technicalReviewer: true },
  });
  const dokumenAssignment = siblings.find((a) => a.verifikatorId) ?? null;
  const technicalAssignment = siblings.find((a) => a.technicalReviewerId) ?? null;

  // Same shared checklist builder CR and verifikator use (see buildDocumentChecklist), instead
  // of a hand-rolled list read straight off the frozen application payload — otherwise the
  // surveyor's Application Documents tab drifts out of sync whenever a company edits/re-uploads
  // a legal document via Company Workspace after submission.
  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;
  const checklist = buildDocumentChecklist(
    payload,
    toChecklistCompanyContext(company),
    await resolvePartnerContexts(payload),
  );

  // Same verification-status lookup CR/verifikator/company-workspace already show — without
  // this the surveyor sees a document exists but not that verifikator already rejected it.
  const companyKeys = checklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const appOnlyKeys = checklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);
  const companyMeta = company
    ? await getDocumentMeta(company.id, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), company.createdAt)
    : {};
  const appMeta = await getApplicationDocumentMeta(assignment.application.id, appOnlyKeys, assignment.application.createdAt);
  const documentChecklist = checklist.map((item) => {
    const meta = item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : appMeta[item.key];
    return { ...item, status: meta ? toChecklistStatus(meta.verificationStatus) : "PENDING" };
  });

  return NextResponse.json({
    data: {
      ...assignment,
      documentChecklist,
      team: {
        surveyor: teamMemberSummary(assignment.surveyor?.name, assignment),
        verifikator: teamMemberSummary(dokumenAssignment?.verifikator?.name, dokumenAssignment),
        technicalReviewer: teamMemberSummary(technicalAssignment?.technicalReviewer?.name, technicalAssignment),
        teamMembers: (assignment.teamMembers as { name: string; role?: string }[] | null) ?? [],
      },
    },
  });
}
