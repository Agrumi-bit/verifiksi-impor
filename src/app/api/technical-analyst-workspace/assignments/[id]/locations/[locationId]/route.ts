import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { composeLocationAddress } from "@/modules/shared/schema";

/**
 * Technical Analyst mirror of the surveyor/verifikator/company location-report endpoint.
 * `id` is the SURVEY assignment's own assignmentNumber (not the technical assignment's) —
 * same convention company-workspace's mirror uses, since the visit itself belongs to the
 * survey assignment. Ownership is verified via a sibling "technical" Assignment row on the
 * same applicationId, owned by the requesting technical analyst — and the visit must be
 * COMPLETED, the same readiness gate as company's mirror.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const { id, locationId } = await params;
  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: { include: { application: true, surveyor: true } } },
  });
  if (!visit || visit.assignment.assignmentNumber !== id || visit.status !== "COMPLETED") {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const ownsApplication = await db.assignment.findFirst({
    where: { applicationId: visit.assignment.applicationId, technicalReviewerId: technicalAnalystId },
    select: { id: true },
  });
  if (!ownsApplication) {
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
