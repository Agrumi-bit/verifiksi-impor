import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { beritaAcaraSchema, schemeOf } from "@/modules/project-manager-workspace/berita-acara";
import { readBeritaAcara, writeBeritaAcara } from "@/modules/project-manager-workspace/berita-acara-store";

async function findApplication(applicationNumber: string) {
  return db.application.findUnique({
    where: { applicationNumber },
    select: { id: true, verificationType: true, company: { select: { companyName: true } } },
  });
}

/** Berita Acara Pelaksanaan of an application — null until the Project Manager saves one. */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string; applicationNumber: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;
  const { applicationNumber } = await params;
  const application = await findApplication(applicationNumber);
  if (!application) return NextResponse.json({ error: "Aplikasi tidak ditemukan" }, { status: 404 });
  const beritaAcara = await readBeritaAcara(application.id);
  return NextResponse.json({
    data: {
      beritaAcara,
      scheme: schemeOf(application.verificationType),
      applicationNumber,
      companyName: application.company?.companyName ?? null,
    },
  });
}

/** PUT — saves the whole Berita Acara (every field is entered by the Project Manager). */
export async function PUT(request: Request, { params }: { params: Promise<{ type: string; applicationNumber: string }> }) {
  const { session, error } = await requireProjectManagerSession();
  if (error) return error;
  const { applicationNumber } = await params;
  const application = await findApplication(applicationNumber);
  if (!application) return NextResponse.json({ error: "Aplikasi tidak ditemukan" }, { status: 404 });

  const parsed = beritaAcaraSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  const beritaAcara = { ...parsed.data, updatedAt: new Date().toISOString(), updatedByName: session.user.name ?? null };
  await writeBeritaAcara(application.id, beritaAcara);
  return NextResponse.json({ data: { beritaAcara } });
}
