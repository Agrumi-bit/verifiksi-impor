import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: { include: { application: true } } },
  });
  if (
    !visit ||
    visit.assignment.assignmentNumber !== id ||
    visit.assignment.verifikatorId !== verifikatorId
  ) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const payload = visit.assignment.application.payload as ApplicationWizardValues;
  const payloadLocation = (payload.locations ?? []).find(
    (loc) => loc.locationType === visit.locationType && loc.address === visit.address,
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
