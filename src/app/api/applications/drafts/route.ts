import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const draft = await db.applicationDraft.findUnique({ where: { createdById: userId } });
  return NextResponse.json({ data: draft });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const payload = body?.payload;
  const currentStep = Number(body?.currentStep) || 1;
  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Data draft tidak valid" }, { status: 400 });
  }

  const draft = await db.applicationDraft.upsert({
    where: { createdById: userId },
    create: { createdById: userId, payload, currentStep },
    update: { payload, currentStep },
  });

  return NextResponse.json({ data: draft });
}

export async function DELETE() {
  const session = await getServerSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.applicationDraft.deleteMany({ where: { createdById: userId } });
  return NextResponse.json({ data: null });
}
