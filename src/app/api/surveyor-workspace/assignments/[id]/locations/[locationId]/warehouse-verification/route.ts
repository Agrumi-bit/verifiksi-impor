import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { fieldVerificationSchema } from "@/modules/surveyor-workspace/components/field-verification/schema";

async function loadScopedLocation(assignmentNumber: string, locationId: string, surveyorId: string) {
  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: true },
  });
  if (!visit || visit.assignment.assignmentNumber !== assignmentNumber || visit.assignment.surveyorId !== surveyorId) {
    return null;
  }
  return visit;
}

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
  if (visit.locationType !== "GUDANG") {
    return NextResponse.json({ error: "Verifikasi gudang hanya berlaku untuk lokasi Gudang." }, { status: 400 });
  }
  if (visit.status === "COMPLETED") {
    return NextResponse.json({ error: "Verifikasi lokasi ini sudah selesai dan tidak dapat diubah." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = fieldVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid", issues: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const updated = await db.locationVisit.update({
    where: { id: locationId },
    data: { warehouseVerification: parsed.data },
  });

  return NextResponse.json({ data: updated.warehouseVerification });
}
