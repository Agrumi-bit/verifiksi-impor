import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

async function loadScopedLocation(assignmentNumber: string, locationId: string, surveyorId: string) {
  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: { include: { application: true } } },
  });
  if (
    !visit ||
    visit.assignment.assignmentNumber !== assignmentNumber ||
    visit.assignment.surveyorId !== surveyorId
  ) {
    return null;
  }
  return visit;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await loadScopedLocation(id, locationId, surveyorId);
  if (!visit) {
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

const patchSchema = z.object({
  action: z.enum(["start", "revise"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await loadScopedLocation(id, locationId, surveyorId);
  if (!visit) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }

  if (parsed.data.action === "start" && visit.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Verifikasi lokasi ini sudah selesai." },
      { status: 400 },
    );
  }
  if (parsed.data.action === "revise" && visit.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Hanya lokasi yang sudah selesai yang dapat direvisi." },
      { status: 400 },
    );
  }

  const updated = await db.locationVisit.update({
    where: { id: locationId },
    data: { status: "IN_PROGRESS" },
  });

  await db.assignment.update({
    where: { id: visit.assignmentId },
    data: { status: "IN_PROGRESS" },
  });

  return NextResponse.json({ data: updated });
}
