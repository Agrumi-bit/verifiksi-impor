import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";

// Server-defined text only — the client picks which preset to fire, but can
// never supply arbitrary text for a SYSTEM-style audit entry (see security
// review: SYSTEM messages must not be spoofable via free-text input).
const QUICK_ACTION_TEXT: Record<string, string> = {
  "request-document": "Dokumen diminta oleh Customer Relation",
  "log-call": "Telepon dengan PIC dicatat",
};

const quickActionSchema = z.object({
  action: z.enum(["request-document", "log-call"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id } = await params;
  const parsed = quickActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const application = await db.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const message = await db.applicationMessage.create({
    data: { applicationId: id, direction: "SYSTEM", text: QUICK_ACTION_TEXT[parsed.data.action] },
  });

  return NextResponse.json({ data: message }, { status: 201 });
}
