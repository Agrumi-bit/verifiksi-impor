import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

const LOCATION_TYPE_LABEL: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: true },
  });
  if (!visit || visit.assignment.assignmentNumber !== id || visit.assignment.surveyorId !== surveyorId) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }
  if (visit.status === "COMPLETED") {
    return NextResponse.json({ error: "Verifikasi lokasi ini sudah selesai." }, { status: 400 });
  }

  const updated = await db.locationVisit.update({
    where: { id: locationId },
    data: { status: "COMPLETED", submittedAt: new Date() },
  });

  const locationLabel = LOCATION_TYPE_LABEL[visit.locationType] ?? visit.locationType;
  await db.applicationMessage.create({
    data: {
      applicationId: visit.assignment.applicationId,
      direction: "SYSTEM",
      text: `Laporan survei lokasi ${locationLabel} telah diselesaikan oleh ${session.user.name}.`,
    },
  });

  const remaining = await db.locationVisit.count({
    where: { assignmentId: visit.assignmentId, status: { not: "COMPLETED" } },
  });
  if (remaining === 0) {
    await db.assignment.update({ where: { id: visit.assignmentId }, data: { status: "SUBMITTED" } });
    await db.applicationMessage.create({
      data: {
        applicationId: visit.assignment.applicationId,
        direction: "SYSTEM",
        text: `Seluruh lokasi telah selesai disurvei oleh ${session.user.name}. Permohonan memasuki tahap berikutnya.`,
      },
    });
  }

  return NextResponse.json({ data: updated });
}
