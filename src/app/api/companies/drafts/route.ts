import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/** List every in-progress "Tambah Perusahaan" draft for the current admin — there can be more than one at once. */
export async function GET() {
  const session = await getServerSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drafts = await db.companyDraft.findMany({
    where: { createdById: userId },
    orderBy: { updatedAt: "desc" },
  });

  const data = drafts.map((draft) => {
    const payload = draft.payload as { companyName?: string } | null;
    return {
      id: draft.id,
      companyName: payload?.companyName?.trim() || null,
      currentStep: draft.currentStep,
      updatedAt: draft.updatedAt,
    };
  });

  return NextResponse.json({ data });
}

/** Always creates a new draft row — each "Tambah Perusahaan" session gets its own, tracked by id from then on. */
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

  const draft = await db.companyDraft.create({
    data: { createdById: userId, payload, currentStep },
  });

  return NextResponse.json({ data: draft }, { status: 201 });
}
