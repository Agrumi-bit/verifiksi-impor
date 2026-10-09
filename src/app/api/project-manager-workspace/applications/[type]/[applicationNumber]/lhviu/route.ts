import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { assignmentDateKey } from "@/lib/assignment-date";
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

/** Nomor & tanggal terbit as printed on the LHVIU — optional; the report falls back to "belum dicatat". */
const lhviuMetaSchema = {
  number: z.string().trim().max(120).nullish(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal terbit tidak valid").nullish(),
};

const putSchema = z.object({
  // A path returned by /api/uploads (namespace "documents") — never a URL or another namespace.
  documentPath: z.string().trim().regex(/^documents\/[^/]+\.pdf$/i, "Dokumen harus berupa file PDF"),
  fileName: z.string().trim().min(1).max(200),
  ...lhviuMetaSchema,
});

const futureDate = (issuedAt: string | null | undefined) => Boolean(issuedAt && issuedAt > assignmentDateKey(new Date()));

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

  if (futureDate(parsed.data.issuedAt)) {
    return NextResponse.json({ error: "Tanggal terbit LHVIU tidak boleh melebihi hari ini." }, { status: 400 });
  }

  // Replacing the PDF keeps the nomor/tanggal already recorded unless new ones are sent.
  const previous = await readLhviuDocument(application.id);
  const document = {
    path: parsed.data.documentPath,
    fileName: parsed.data.fileName,
    uploadedAt: new Date().toISOString(),
    uploadedByName: session.user.name ?? null,
    number: parsed.data.number?.trim() || previous?.number || null,
    issuedAt: parsed.data.issuedAt || previous?.issuedAt || null,
  };
  await writeLhviuDocument(application.id, document);
  return NextResponse.json({ data: { document } });
}

const patchSchema = z.object(lhviuMetaSchema);

/** Records the Nomor and Tanggal Terbit of the uploaded LHVIU without replacing the PDF. */
export async function PATCH(request: Request, { params }: { params: Promise<{ type: string; applicationNumber: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;
  const { applicationNumber } = await params;
  const application = await findApplication(applicationNumber);
  if (!application) return NextResponse.json({ error: "Aplikasi tidak ditemukan" }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  if (futureDate(parsed.data.issuedAt)) {
    return NextResponse.json({ error: "Tanggal terbit LHVIU tidak boleh melebihi hari ini." }, { status: 400 });
  }
  const current = await readLhviuDocument(application.id);
  if (!current) return NextResponse.json({ error: "Unggah dokumen LHVIU terlebih dahulu." }, { status: 400 });

  const document = { ...current, number: parsed.data.number?.trim() || null, issuedAt: parsed.data.issuedAt || null };
  await writeLhviuDocument(application.id, document);
  return NextResponse.json({ data: { document } });
}
