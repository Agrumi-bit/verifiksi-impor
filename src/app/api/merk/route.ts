import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { buildMerkCreateData, buildMerkDraftData } from "@/modules/merk/build-create-data";
import { MERK_LIST_INCLUDE, toMerkListItem } from "@/modules/merk/list-projection";
import { mapPrismaWriteError } from "@/modules/merk/prisma-error-message";
import { merkDraftSchema, merkWizardSchema } from "@/modules/merk/schema";
import { resolveOwnershipReferences, validateQualityTestReferences } from "@/modules/merk/server-validation";

export async function GET() {
  const merkList = await db.merk.findMany({
    orderBy: { createdAt: "desc" },
    include: MERK_LIST_INCLUDE,
  });
  return NextResponse.json({ data: merkList.map(toMerkListItem) });
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    if (body?.draft === true) {
      const parsed = merkDraftSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
          { status: 400 },
        );
      }
      const values = parsed.data;
      const resolved = await resolveOwnershipReferences(values);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      const qualityTestError = await validateQualityTestReferences(values.qualityTests);
      if (qualityTestError) {
        return NextResponse.json({ error: qualityTestError }, { status: 400 });
      }
      const merk = await db.merk.create({
        data: await buildMerkDraftData(values, resolved.ownerCompanyName),
      });
      return NextResponse.json({ data: merk }, { status: 201 });
    }

    const parsed = merkWizardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const values = parsed.data;
    const resolved = await resolveOwnershipReferences(values);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const qualityTestError = await validateQualityTestReferences(values.qualityTests);
    if (qualityTestError) {
      return NextResponse.json({ error: qualityTestError }, { status: 400 });
    }

    const merk = await db.merk.create({
      data: await buildMerkCreateData(values, resolved.ownerCompanyName),
    });

    return NextResponse.json({ data: merk }, { status: 201 });
  } catch (error) {
    // Never let a write error escape uncaught — Next.js turns that into a
    // bare 500 with an EMPTY body, which the wizard's own fetch can't parse
    // into any message (see prisma-error-message.ts for the bug this was
    // written to stop recurring). Known Prisma errors (duplicate, bad
    // reference, not found) get a readable 400; anything else is logged
    // server-side and still answered with a real JSON body.
    const message = mapPrismaWriteError(error);
    if (message) return NextResponse.json({ error: message }, { status: 400 });
    console.error("POST /api/merk failed:", error);
    return NextResponse.json({ error: "Gagal menyimpan merek, coba lagi." }, { status: 500 });
  }
}
