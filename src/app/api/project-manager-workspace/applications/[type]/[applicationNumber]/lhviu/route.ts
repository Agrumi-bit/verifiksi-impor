import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { readLhviuDocument, writeLhviuDocument } from "@/modules/project-manager-workspace/lhviu-store";

async function findApplication(applicationNumber: string) {
  return db.application.findUnique({ where: { applicationNumber }, select: { id: true, verificationType: true } });
}

/** LHVIU tab — the uploaded Laporan Hasil VIU PDF (null until the PM uploads one). */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string; applicationNumber: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;
  const { applicationNumber } = await params;
  const application = await findApplication(applicationNumber);
  if (!application) return NextResponse.json({ error: "Aplikasi tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: { document: await readLhviuDocument(application.id) } });
}

const putSchema = z.object({
  // A path returned by /api/uploads (namespace "documents") — never a URL or another namespace.
  documentPath: z.string().trim().regex(/^documents\/[^/]+\.pdf$/i, "Dokumen harus berupa file PDF"),
  fileName: z.string().trim().min(1).max(200),
});

/** Sets (or replaces) the Laporan Hasil VIU PDF — VIU applications only. */
export async function PUT(request: Request, { params }: { params: Promise<{ type: string; applicationNumber: string }> }) {
  const { session, error } = await requireProjectManagerSession();
  if (error) return error;
  const { applicationNumber } = await params;
  const application = await findApplication(applicationNumber);
  if (!application) return NextResponse.json({ error: "Aplikasi tidak ditemukan" }, { status: 404 });
  if (application.verificationType !== "VIU") {
    return NextResponse.json({ error: "Laporan Hasil VIU hanya untuk permohonan VIU." }, { status: 400 });
  }

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  if (!(await storage.exists(parsed.data.documentPath).catch(() => false))) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const document = {
    path: parsed.data.documentPath,
    fileName: parsed.data.fileName,
    uploadedAt: new Date().toISOString(),
    uploadedByName: session.user.name ?? null,
  };
  await writeLhviuDocument(application.id, document);
  return NextResponse.json({ data: { document } });
}
