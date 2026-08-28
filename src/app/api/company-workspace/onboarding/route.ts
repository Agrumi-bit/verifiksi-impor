import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/**
 * Links the current session's User to an existing Company row (`Company.id`) — the step every
 * self-registered ("Sign Up") account needs before Company Workspace has anything to show, since
 * `companyId` is `input: false` on the Better Auth user schema and can never be set by the client
 * during sign-up (src/lib/auth.ts). Only links to a Company that already exists in the shared
 * Directory (found via /api/partners/lookup's NIB+NPWP+SK match) — this app's established
 * convention is that Company records are registered/vetted by admin or Customer Relation, not
 * freely self-created, the same reasoning Company Workspace's own Partner sync already follows.
 */
const linkSchema = z.object({
  companyId: z.string().trim().min(1),
});

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.companyId) {
    return NextResponse.json(
      { error: "Akun ini sudah terhubung ke sebuah perusahaan. Hubungi admin untuk mengubahnya." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const company = await db.company.findUnique({
    where: { id: parsed.data.companyId },
    select: { id: true, companyName: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { companyId: company.id },
  });

  return NextResponse.json({ data: { companyId: company.id, companyName: company.companyName } });
}
