import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";

const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Pesan tidak boleh kosong").max(2000, "Pesan maksimal 2000 karakter"),
});

/**
 * PM-facing mirror of `verifikator-workspace/assignments/[id]/messages/route.ts` — same real
 * `ApplicationMessage` thread (company-facing, shared with verifikator/company), no ownership
 * scoping since PM oversees every application.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const messages = await db.applicationMessage.findMany({
    where: { applicationId: assignment.applicationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const parsed = sendMessageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid", issues: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const message = await db.applicationMessage.create({
    data: { applicationId: assignment.applicationId, direction: "OUT", text: parsed.data.text },
  });

  return NextResponse.json({ data: message }, { status: 201 });
}
