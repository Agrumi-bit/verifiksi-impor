import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { buildMerkUpdateData, buildMerkUpdateDraftData } from "@/modules/merk/build-create-data";
import { merkDraftSchema, merkStatusUpdateSchema, merkWizardSchema } from "@/modules/merk/schema";
import { resolveOwnershipReferences, validateQualityTestReferences } from "@/modules/merk/server-validation";

/** Used to resume a saved Draft into MerkWizard (see BR-002 in the Add Brand
 * review) — company-scoped so one company can never read another's brand. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const { id } = await params;
  const brand = await db.merk.findFirst({
    where: { id, companyId },
    include: {
      ownership: { include: { ownerCompany: true, officialRepresentative: true } },
      documents: true,
      qualityTests: { include: { commodityGroup: true, commoditySubGroup: true } },
    },
  });

  if (!brand) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: brand });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const { id } = await params;
  const existing = await db.merk.findFirst({ where: { id, companyId } });
  if (!existing) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();

  // See src/app/api/merk/[id]/route.ts — same full wizard/draft payload
  // branch, mirrored here so the company-workspace surface can resume and
  // finalize a Draft too, not just toggle Aktifkan/Nonaktifkan.
  if (typeof body?.brandName === "string") {
    if (body.draft === true) {
      const parsed = merkDraftSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
          { status: 400 },
        );
      }
      const resolved = await resolveOwnershipReferences(parsed.data);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      const qualityTestError = await validateQualityTestReferences(parsed.data.qualityTests);
      if (qualityTestError) {
        return NextResponse.json({ error: qualityTestError }, { status: 400 });
      }
      const brand = await db.merk.update({
        where: { id },
        data: await buildMerkUpdateDraftData(parsed.data, resolved.ownerCompanyName),
      });
      return NextResponse.json({ data: brand });
    }

    const parsed = merkWizardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    const resolved = await resolveOwnershipReferences(parsed.data);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const qualityTestError = await validateQualityTestReferences(parsed.data.qualityTests);
    if (qualityTestError) {
      return NextResponse.json({ error: qualityTestError }, { status: 400 });
    }
    const brand = await db.merk.update({
      where: { id },
      data: await buildMerkUpdateData(parsed.data, resolved.ownerCompanyName),
    });
    return NextResponse.json({ data: brand });
  }

  const parsed = merkStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  if (existing.status === "DRAFT") {
    return NextResponse.json(
      { error: "Lengkapi wizard merek ini untuk mengaktifkannya, bukan lewat tombol status." },
      { status: 409 },
    );
  }

  const brand = await db.merk.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ data: brand });
}
