import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

const LIST_LIMIT = 30;

/** The signed-in user's latest notifications and their unread count — the bell in each workspace. */
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, kind: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);
  return NextResponse.json({ data: { items, unread } });
}

const patchSchema = z.union([z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }), z.object({ all: z.literal(true) })]);

/** Marks the user's own notifications read — some by id, or all of them. */
export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const result = await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null, ...("ids" in parsed.data ? { id: { in: parsed.data.ids } } : {}) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ data: { updated: result.count } });
}
