import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";
import { writeCrDataCheck } from "@/modules/customer-relation-workspace/cr-data-check-store";
import { crDataCheckSchema } from "@/modules/customer-relation-workspace/vki-check";

/** Saves CR's input on the Form Pemeriksaan Kelengkapan Data dan Dokumen VKI. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireCustomerRelationSession();
  if (error) return error;
  const { id } = await params;
  const parsed = crDataCheckSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid", issues: z.treeifyError(parsed.error) }, { status: 400 });
  const application = await db.application.findUnique({ where: { id }, select: { verificationType: true } });
  if (!application) return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  if (application.verificationType !== "VKI") return NextResponse.json({ error: "Form pemeriksaan ini hanya untuk VKI" }, { status: 400 });
  await writeCrDataCheck(id, parsed.data, session.user.name ?? "");
  return NextResponse.json({ data: { ok: true } });
}
