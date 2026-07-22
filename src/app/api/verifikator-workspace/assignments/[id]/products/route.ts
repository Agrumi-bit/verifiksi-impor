import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { PRODUCT_VERIFICATION_STATUSES } from "@/modules/verifikator-workspace/status";
import { buildProductChecklist, productVerificationsSchema } from "@/modules/verifikator-workspace/schema";

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const checklist = buildProductChecklist(payload);
  const decisions = productVerificationsSchema.parse(assignment.productVerifications ?? {});

  return NextResponse.json({
    data: checklist.map((item) => ({
      ...item,
      status: decisions[item.id]?.status ?? "PENDING",
      note: decisions[item.id]?.note ?? "",
      verifiedAt: decisions[item.id]?.verifiedAt ?? null,
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(PRODUCT_VERIFICATION_STATUSES),
  note: z.string().trim().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Produk hanya dapat diverifikasi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const validIds = new Set(buildProductChecklist(payload).map((item) => item.id));
  if (!validIds.has(parsed.data.id)) {
    return NextResponse.json({ error: "Produk tidak dikenali" }, { status: 400 });
  }

  const decisions = productVerificationsSchema.parse(assignment.productVerifications ?? {});
  decisions[parsed.data.id] = {
    status: parsed.data.status,
    note: parsed.data.note,
    verifiedAt: new Date().toISOString(),
  };

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: { productVerifications: decisions },
  });

  return NextResponse.json({ data: updated.productVerifications });
}
