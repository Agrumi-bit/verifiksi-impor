import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";
import { sendMessageSchema } from "@/modules/customer-relation-workspace/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id } = await params;
  const messages = await db.applicationMessage.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id } = await params;
  const parsed = sendMessageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const application = await db.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const message = await db.applicationMessage.create({
    data: { applicationId: id, direction: "OUT", text: parsed.data.text },
  });

  return NextResponse.json({ data: message }, { status: 201 });
}
