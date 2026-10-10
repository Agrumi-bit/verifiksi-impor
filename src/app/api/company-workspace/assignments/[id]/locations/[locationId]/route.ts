import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { matchVisitLocation } from "@/modules/shared/survey-visit-scope";
import { composeLocationAddress } from "@/modules/shared/schema";
import { surveyPmSignoff } from "@/modules/shared/survey-pm-signoff";

/**
 * Read-only mirror of the surveyor/verifikator location-report endpoint, scoped to
 * the requesting company instead of a surveyor/verifikator — feeds the same
 * ReportRouter/OfficeReportPreview/FieldReportPreview components so a company user
 * views the exact report their surveyor submitted, not a re-implementation of it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: { include: { application: true, surveyor: true } } },
  });
  if (!visit || visit.assignment.assignmentNumber !== id || visit.assignment.application.companyId !== companyId) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const payload = visit.assignment.application.payload as ApplicationWizardValues;
  const payloadLocation =
    matchVisitLocation(visit as never, (payload.locations ?? []) as never) ??
    (payload.locations ?? []).find((loc) => loc.locationType === visit.locationType && composeLocationAddress(loc) === visit.address);

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
      importTypes: (visit.assignment.application.payload as { importTypes?: string[] } | null)?.importTypes ?? [],
      surveyorName: visit.assignment.surveyor?.name ?? null,
      ...(await surveyPmSignoff(visit.assignment, id)),
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
