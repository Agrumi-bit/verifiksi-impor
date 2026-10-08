import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { getReportVerification } from "@/modules/verifikator-workspace/report-verification";

/**
 * PM read-only view of the verifikator's desk review ("Uraian Verifikasi Laporan Hasil Survei
 * Verifikasi Lapangan") for one location — shown in the PM's Review & Approve Laporan Survey modal.
 * `id` is the survey assignment's assignmentNumber.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; locationId: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id, locationId } = await params;
  const openedAssignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!openedAssignment) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }
  const visit = await db.locationVisit.findUnique({ where: { id: locationId }, include: { assignment: true } });
  if (!visit || visit.assignment.applicationId !== openedAssignment.applicationId) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const data = await getReportVerification(locationId);
  return NextResponse.json({ data });
}
