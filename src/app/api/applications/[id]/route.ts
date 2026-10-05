import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { normalizeKonsumsiPayload } from "@/modules/applications/viu-schemes/konsumsi/normalize";
import { backfillKonsumsiHsCodes } from "@/modules/applications/viu-schemes/konsumsi/server/backfill-hs-codes";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const application = await db.application.findUnique({
    where: { id },
    include: { assignments: { select: { status: true } } },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Permohonan tidak ditemukan" },
      { status: 404 },
    );
  }

  const payload = await backfillKonsumsiHsCodes(normalizeKonsumsiPayload(application.payload as ApplicationWizardValues));

  return NextResponse.json({ data: { ...application, payload } });
}
