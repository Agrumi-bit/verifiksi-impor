import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

function generateApplicationNumber(verificationType: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `APP-${verificationType}-${datePart}-${suffix}`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const original = await db.application.findUnique({ where: { id } });
  if (!original || original.companyId !== companyId) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const applicationNumber = generateApplicationNumber(original.verificationType);
  const duplicate = await db.application.create({
    data: {
      applicationNumber,
      verificationType: original.verificationType,
      applicationCategory: original.applicationCategory,
      payload: original.payload as object,
      companyId,
      status: "DRAFT",
    },
  });

  return NextResponse.json({
    id: duplicate.id,
    applicationNumber: duplicate.applicationNumber,
  });
}
