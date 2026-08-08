import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id, assignmentId } = await params;
  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.applicationId !== id) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
  if (assignment.letterStatus !== "DRAFT") {
    return NextResponse.json({ error: "Surat tugas sudah diajukan" }, { status: 400 });
  }

  const letterNumber = assignment.letterNumber ?? `ST/${assignment.id.slice(-6).toUpperCase()}/${new Date().getFullYear()}`;
  const updated = await db.assignment.update({
    where: { id: assignmentId },
    data: { letterStatus: "PENDING", letterNumber },
  });

  await db.applicationMessage.create({
    data: {
      applicationId: id,
      direction: "SYSTEM",
      text: `Surat Tugas ${letterNumber} diajukan untuk persetujuan Project Manager`,
    },
  });

  return NextResponse.json({ data: updated });
}
