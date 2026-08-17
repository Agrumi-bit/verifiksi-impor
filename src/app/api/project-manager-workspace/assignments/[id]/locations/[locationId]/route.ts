import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { composeLocationAddress } from "@/modules/shared/schema";

/**
 * PM-facing mirror of `verifikator-workspace/assignments/[id]/locations/[locationId]/route.ts`
 * — no ownership scoping (PM oversees every survey), `id` is the survey assignment's own
 * assignmentNumber directly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id, locationId } = await params;
  const openedAssignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!openedAssignment) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: { include: { application: true, surveyor: true } } },
  });
  if (!visit || visit.assignment.applicationId !== openedAssignment.applicationId) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const payload = visit.assignment.application.payload as ApplicationWizardValues;
  const payloadLocation = (payload.locations ?? []).find(
    (loc) => loc.locationType === visit.locationType && composeLocationAddress(loc) === visit.address,
  );

  return NextResponse.json({
    data: {
      ...visit,
      checklist: visit.checklist ?? [],
      photos: visit.photos ?? [],
      interviews: visit.interviews ?? [],
      findings: visit.findings ?? [],
      officeVerification: visit.officeVerification ?? null,
      warehouseVerification: visit.warehouseVerification ?? null,
      factoryVerification: visit.factoryVerification ?? null,
      assignmentNumber: visit.assignment.assignmentNumber,
      applicationNumber: visit.assignment.application.applicationNumber,
      verificationType: visit.assignment.application.verificationType,
      surveyorName: visit.assignment.surveyor?.name ?? null,
      company: {
        companyName: payload.companyName ?? "—",
        nibNumber: payload.nibNumber ?? null,
        nibDocumentPath: payload.nibDocumentPath ?? null,
        notarialDeedNumber: payload.notarialDeedNumber ?? null,
        notarialDocumentPath: payload.notarialDocumentPath ?? null,
        kbliEntries: payload.kbliEntries ?? [],
        kbliDocumentPath: payload.kbliDocumentPath ?? null,
      },
      payloadLocation: payloadLocation ?? null,
    },
  });
}
