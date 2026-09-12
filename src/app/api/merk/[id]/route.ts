import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { buildMerkUpdateData, buildMerkUpdateDraftData } from "@/modules/merk/build-create-data";
import { merkDraftSchema, merkStatusUpdateSchema, merkWizardSchema } from "@/modules/merk/schema";
import { resolveOwnershipReferences, validateQualityTestReferences } from "@/modules/merk/server-validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const merk = await db.merk.findUnique({
    where: { id },
    include: {
      brandOwner: true,
      importers: true,
      ownership: { include: { ownerCompany: true, officialRepresentative: true } },
      documents: true,
      qualityTests: { include: { commodityGroup: true, commoditySubGroup: true } },
    },
  });

  if (!merk) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: merk });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.merk.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();

  // A full wizard/draft payload — used to resume a saved Draft into
  // MerkWizard and either re-save it as a Draft or finalize it into ACTIVE.
  // Distinguished from the plain `{status}` toggle the Brands table's
  // Aktifkan/Nonaktifkan button sends (see BR-001/BR-002 in the Add Brand
  // review: a Draft may no longer be finalized by that toggle alone).
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
      const merk = await db.merk.update({
        where: { id },
        data: buildMerkUpdateDraftData(parsed.data, resolved.ownerCompanyName),
      });
      return NextResponse.json({ data: merk });
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
    const merk = await db.merk.update({
      where: { id },
      data: buildMerkUpdateData(parsed.data, resolved.ownerCompanyName),
    });
    return NextResponse.json({ data: merk });
  }

  const parsed = merkStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  // The Aktifkan/Nonaktifkan toggle may never be used to move a Draft
  // forward — that must go through the full wizard payload above so
  // ownership/documents/declaration are actually validated first.
  if (existing.status === "DRAFT") {
    return NextResponse.json(
      { error: "Lengkapi wizard merek ini untuk mengaktifkannya, bukan lewat tombol status." },
      { status: 409 },
    );
  }

  const merk = await db.merk.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ data: merk });
}
