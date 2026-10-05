import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { ADMIN_ROLES } from "@/lib/require-admin-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { appendCompanyLocation } from "@/modules/company/company-locations";
import { composeLocationAddress, REQUIRED_LOCATION_TYPE_LABELS, type LocationType } from "@/modules/shared/schema";

const bodySchema = z.object({ location: z.unknown() });

/**
 * "Tambah Lokasi Temuan Lapangan" — a facility the surveyor found on site that the application
 * didn't list. It is saved to the company profile (source FIELD_DISCOVERY, "Belum diverifikasi",
 * with who/when/which assignment), added to this application's locations so every workspace
 * sees it, and gets its own LocationVisit on this assignment so the surveyor can verify it and
 * it lands in the report. The assigned Surveyor or an Admin only; documents are required, same
 * as any company location.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, include: { application: true } });
  const isAdmin = ADMIN_ROLES.includes(user.role ?? "");
  const isAssignedSurveyor = user.role === "SURVEYOR" && assignment?.surveyorId === user.id;
  if (!assignment || (!isAdmin && !isAssignedSurveyor)) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  // Survey assignments only — by scheduleType when set, else (legacy rows) by having a surveyor.
  const isSurveyAssignment = assignment.scheduleType ? assignment.scheduleType === "survey" : Boolean(assignment.surveyorId);
  if (!isSurveyAssignment) {
    return NextResponse.json({ error: "Lokasi temuan lapangan hanya dapat ditambahkan pada penugasan survey." }, { status: 400 });
  }
  if (assignment.status === "COMPLETED") {
    return NextResponse.json({ error: "Penugasan sudah selesai." }, { status: 400 });
  }
  const { application } = assignment;
  if (!application.companyId) {
    return NextResponse.json({ error: "Permohonan tidak terhubung dengan perusahaan." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const result = await appendCompanyLocation(application.companyId, parsed.data.location, {
    source: "FIELD_DISCOVERY",
    discoveredByUserId: user.id,
    discoveredByName: user.name,
    discoveredAssignmentId: assignment.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.error, issues: result.issues }, { status: result.status });
  const location = result.location;

  const now = new Date();
  const payload = application.payload as ApplicationWizardValues;
  const fullAddress = composeLocationAddress(location);
  const typeLabel = REQUIRED_LOCATION_TYPE_LABELS[location.locationType as LocationType] ?? location.locationType;
  const notice = `Lokasi tambahan ditemukan saat survey — ${typeLabel}, ${fullAddress}`;

  await db.$transaction([
    db.application.update({
      where: { id: application.id },
      data: {
        payload: {
          ...payload,
          locations: [...(payload.locations ?? []), { ...location, companyLocationId: location.id, capturedAt: now.toISOString() }],
        },
      },
    }),
    db.locationVisit.create({
      data: {
        assignmentId: assignment.id,
        locationType: location.locationType,
        address: fullAddress,
        city: location.city ?? null,
        companyLocationId: location.id,
      },
    }),
    db.applicationMessage.create({
      data: { applicationId: application.id, direction: "SYSTEM", text: notice },
    }),
    db.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "FIELD_LOCATION",
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role ?? null,
        reason: location.fieldNotes ? `${notice}. Catatan: ${location.fieldNotes}` : notice,
        createdAt: now,
      },
    }),
  ]);

  return NextResponse.json({ data: location }, { status: 201 });
}
