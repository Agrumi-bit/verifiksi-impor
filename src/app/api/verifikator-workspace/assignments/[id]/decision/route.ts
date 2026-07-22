import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

const decisionSchema = z.object({
  decision: z.enum(["COMPLETED", "RETURNED"]),
  notes: z.string().trim().min(1, "Catatan keputusan wajib diisi"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!assignment || assignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Keputusan hanya dapat diambil saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = decisionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: {
      status: parsed.data.decision,
      validationNotes: parsed.data.notes,
      validatedAt: new Date(),
    },
  });

  return NextResponse.json({ data: updated });
}
