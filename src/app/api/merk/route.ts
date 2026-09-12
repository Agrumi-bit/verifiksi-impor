import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { buildMerkCreateData, buildMerkDraftData } from "@/modules/merk/build-create-data";
import { MERK_LIST_INCLUDE, toMerkListItem } from "@/modules/merk/list-projection";
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
}
