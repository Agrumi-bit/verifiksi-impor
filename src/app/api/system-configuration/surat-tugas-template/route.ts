import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { requireAdminSession } from "@/lib/require-admin-session";

const TEMPLATE_ID = "surat-tugas";

/**
 * GET is readable by any authenticated role — Customer Relation and Project Manager
 * Workspace both render the printed letter from this template, not just admins.
 * Upserts the singleton row on first read so the app never 404s on a missing template.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await db.suratTugasTemplate.upsert({
    where: { id: TEMPLATE_ID },
    update: {},
    create: { id: TEMPLATE_ID },
  });

  return NextResponse.json({ data: template });
}

const patchSchema = z.object({
  headerImagePath: z.string().trim().min(1).nullable(),
  orgName: z.string().trim().min(1),
  orgSubtitle: z.string().trim().min(1),
  letterTitle: z.string().trim().min(1),
  nomorLabel: z.string().trim().min(1),
  docNumberLabel: z.string().trim().min(1),
  docNumber: z.string().trim(),
  docRevisionLabel: z.string().trim().min(1),
  docRevision: z.string().trim(),
  docAmendmentLabel: z.string().trim().min(1),
  docAmendment: z.string().trim(),
  docEffectiveLabel: z.string().trim().min(1),
  docEffectiveDate: z.string().trim(),
  openingSentence: z.string().trim().min(1),
  namaLabel: z.string().trim().min(1),
  peranLabel: z.string().trim().min(1),
  assignmentPrefix: z.string().trim().min(1),
  assignmentSuffix: z.string().trim().min(1),
  perusahaanLabel: z.string().trim().min(1),
  idAplikasiLabel: z.string().trim().min(1),
  fasilitasLabel: z.string().trim().min(1),
  tanggalLabel: z.string().trim().min(1),
  closingSentence: z.string().trim().min(1),
  draftNoticeText: z.string().trim().min(1),
  signatureCity: z.string().trim().min(1),
  signerLabel: z.string().trim().min(1),
  footerImagePath: z.string().trim().min(1).nullable(),
  confidentialityNotice: z.string().trim(),
});

export async function PATCH(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const template = await db.suratTugasTemplate.upsert({
    where: { id: TEMPLATE_ID },
    update: parsed.data,
    create: { id: TEMPLATE_ID, ...parsed.data },
  });

  return NextResponse.json({ data: template });
}
