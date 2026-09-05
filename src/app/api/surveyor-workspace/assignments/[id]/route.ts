import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

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

  return NextResponse.json({
    data: {
      ...assignment,
      team: {
        surveyor: teamMemberSummary(assignment.surveyor?.name, assignment),
        verifikator: teamMemberSummary(dokumenAssignment?.verifikator?.name, dokumenAssignment),
        technicalReviewer: teamMemberSummary(technicalAssignment?.technicalReviewer?.name, technicalAssignment),
        teamMembers: (assignment.teamMembers as { name: string; role?: string }[] | null) ?? [],
      },
    },
  });
}
