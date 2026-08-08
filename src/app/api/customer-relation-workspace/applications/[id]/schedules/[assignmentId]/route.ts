import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";

export async function DELETE(
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

  await db.assignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ data: null });
}
