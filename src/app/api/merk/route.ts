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

/**
 * Optional owning company for an admin-created brand (e.g. "+ Tambah Merek Baru" inside an
 * admin-filed VIU application, on behalf of the applying company). Not part of the wizard
 * schemas — read straight off the body, and only kept when it names a real Company.
 */
async function resolveOwningCompanyId(body: unknown): Promise<string | undefined | { error: string }> {
  const raw = (body as { companyId?: unknown } | null)?.companyId;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const company = await db.company.findUnique({ where: { id: raw.trim() }, select: { id: true } });
  return company ? company.id : { error: "Perusahaan pemilik merek tidak ditemukan." };
}

export async function POST(request: Request) {
  const body = await request.json();

  const owningCompanyId = await resolveOwningCompanyId(body);
  if (typeof owningCompanyId === "object") {
    return NextResponse.json({ error: owningCompanyId.error }, { status: 400 });
  }
  const companyData = owningCompanyId ? { companyId: owningCompanyId } : {};

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
        data: { ...(await buildMerkDraftData(values, resolved.ownerCompanyName)), ...companyData },
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
      data: { ...(await buildMerkCreateData(values, resolved.ownerCompanyName)), ...companyData },
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
