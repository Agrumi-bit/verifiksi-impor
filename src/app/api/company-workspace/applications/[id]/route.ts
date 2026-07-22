import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { TERMINAL_STATUSES } from "@/modules/company-workspace/status";

async function loadScopedApplication(id: string, companyId: string) {
  const application = await db.application.findUnique({ where: { id } });
  if (!application || application.companyId !== companyId) {
    return null;
  }
  return application;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const application = await loadScopedApplication(id, companyId);
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: application });
}

const patchSchema = z.object({
  action: z.literal("withdraw"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const application = await loadScopedApplication(id, companyId);
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }

  if (TERMINAL_STATUSES.includes(application.status)) {
    return NextResponse.json(
      { error: "Permohonan ini sudah berada pada status akhir dan tidak dapat ditarik." },
      { status: 400 },
    );
  }

  const updated = await db.application.update({
    where: { id },
    data: { status: "WITHDRAWN" },
  });

  return NextResponse.json({ data: updated });
}
