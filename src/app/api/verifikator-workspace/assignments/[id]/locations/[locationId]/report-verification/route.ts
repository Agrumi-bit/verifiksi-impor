import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { getReportVerification, patchReportVerificationItem } from "@/modules/verifikator-workspace/report-verification";

async function assertLocationOwnedByVerifikator(assignmentNumber: string, locationId: string, verifikatorId: string) {
  const openedAssignment = await db.assignment.findUnique({ where: { assignmentNumber } });
  if (!openedAssignment || openedAssignment.verifikatorId !== verifikatorId) return null;

  const visit = await db.locationVisit.findUnique({ where: { id: locationId }, include: { assignment: true } });
  if (!visit || visit.assignment.applicationId !== openedAssignment.applicationId) return null;
  return { openedAssignment, visit };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; locationId: string }> }) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const owned = await assertLocationOwnedByVerifikator(id, locationId, verifikatorId);
  if (!owned) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const data = await getReportVerification(locationId);
  return NextResponse.json({ data });
}

const patchSchema = z.object({
  itemId: z.string().min(1),
  result: z.enum(["PASS", "FAIL", "NA"]).optional(),
  note: z.string().trim().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; locationId: string }> }) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const owned = await assertLocationOwnedByVerifikator(id, locationId, verifikatorId);
  if (!owned) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const { itemId, result, note } = parsed.data;

  const patch: { result?: "PASS" | "FAIL" | "NA" | null; note?: string | null } = {};
  if (result !== undefined) patch.result = result;
  if (note !== undefined) patch.note = note;

  const data = await patchReportVerificationItem(locationId, itemId, patch);
  return NextResponse.json({ data });
}
