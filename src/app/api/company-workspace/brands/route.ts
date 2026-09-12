import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { buildMerkCreateData, buildMerkDraftData } from "@/modules/merk/build-create-data";
import { MERK_LIST_INCLUDE, toMerkListItem } from "@/modules/merk/list-projection";
import { merkDraftSchema, merkWizardSchema } from "@/modules/merk/schema";
import { resolveOwnershipReferences, validateQualityTestReferences } from "@/modules/merk/server-validation";

export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  const brands = await db.merk.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: MERK_LIST_INCLUDE,
  });
  return NextResponse.json({ data: brands.map(toMerkListItem) });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

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
    const brand = await db.merk.create({
      data: { ...(await buildMerkDraftData(values, resolved.ownerCompanyName)), companyId },
    });
    return NextResponse.json({ data: brand }, { status: 201 });
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

  const brand = await db.merk.create({
    data: { ...(await buildMerkCreateData(values, resolved.ownerCompanyName)), companyId },
  });

  return NextResponse.json({ data: brand }, { status: 201 });
}
