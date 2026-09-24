import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { computeFindings as computeOfficeFindings, type OfficeVerificationValues } from "@/modules/surveyor-workspace/components/office-verification/schema";
import { computeFindings as computeFieldFindings, type FieldKind, type FieldVerificationValues } from "@/modules/surveyor-workspace/components/field-verification/schema";

export async function GET() {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visits = await db.locationVisit.findMany({
    where: { status: "COMPLETED", assignment: { surveyorId } },
    include: { assignment: { include: { application: true } } },
    orderBy: { submittedAt: "desc" },
  });

  const data = visits.map((visit) => {
    const payload = visit.assignment.application.payload as { companyName?: string } | null;
    const fieldKind: FieldKind | null =
      visit.locationType === "GUDANG" ? "GUDANG" : visit.locationType === "PABRIK" ? "PABRIK" : null;
    const officeVerification = visit.officeVerification as OfficeVerificationValues | null;
    const fieldVerification = (
      fieldKind === "GUDANG" ? visit.warehouseVerification : fieldKind === "PABRIK" ? visit.factoryVerification : null
    ) as FieldVerificationValues | null;

    const findings =
      visit.locationType === "KANTOR" && officeVerification
        ? computeOfficeFindings(officeVerification)
        : fieldKind && fieldVerification
          ? computeFieldFindings(fieldKind, fieldVerification)
          : [];

    return {
      id: visit.id,
      assignmentNumber: visit.assignment.assignmentNumber,
      applicationNumber: visit.assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: visit.assignment.application.verificationType,
      locationType: visit.locationType,
      address: visit.address,
      city: visit.city,
      submittedAt: visit.submittedAt,
      needsRevision: findings.length > 0,
    };
  });

  return NextResponse.json({ data });
}
