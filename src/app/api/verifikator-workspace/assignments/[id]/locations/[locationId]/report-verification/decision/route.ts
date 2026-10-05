import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { setReportVerificationDecision } from "@/modules/verifikator-workspace/report-verification";

const LOCATION_TYPE_LABEL: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };

const patchSchema = z.object({
  decision: z.enum(["VERIFIED", "REJECTED", "REVISION"]),
  note: z.string().trim().optional(),
  // "Tanggal Diperiksa" — printed on the report's own "DIPERIKSA OLEH" line, chosen explicitly
  // by the verifikator (date picker in ReportVerificationModal) rather than silently stamped to
  // the server clock. `confirmed` mirrors the modal's own confirmation checkbox — re-checked here
  // so a request built outside that UI can't skip the same acknowledgment.
  verifiedAt: z.string().trim().min(1, "Tanggal diperiksa wajib dipilih"),
  confirmed: z.literal(true, { message: "Konfirmasi wajib dicentang" }),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; locationId: string }> }) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const openedAssignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!openedAssignment || openedAssignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }
  const visit = await db.locationVisit.findUnique({ where: { id: locationId }, include: { assignment: true } });
  if (!visit || visit.assignment.applicationId !== openedAssignment.applicationId) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const verifikator = await db.user.findUnique({ where: { id: verifikatorId }, select: { name: true } });
  const data = await setReportVerificationDecision(
    locationId,
    parsed.data.decision,
    parsed.data.note?.trim() || null,
    verifikator?.name ?? "Verifikator",
    parsed.data.verifiedAt,
  );

  if (parsed.data.decision === "REVISION") {
    const locationLabel = LOCATION_TYPE_LABEL[visit.locationType] ?? visit.locationType;
    const note = parsed.data.note?.trim();
    await db.applicationMessage.create({
      data: {
        applicationId: visit.assignment.applicationId,
        direction: "SYSTEM",
        text: `Laporan survei lokasi ${locationLabel} diminta revisi oleh ${verifikator?.name ?? "Verifikator"}${note ? ` — alasan: ${note}` : ""}.`,
      },
    });
  }

  return NextResponse.json({ data });
}
