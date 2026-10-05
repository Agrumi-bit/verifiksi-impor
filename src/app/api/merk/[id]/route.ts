import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { buildMerkUpdateData, buildMerkUpdateDraftData } from "@/modules/merk/build-create-data";
import { mapPrismaWriteError } from "@/modules/merk/prisma-error-message";
import { merkDraftSchema, merkStatusUpdateSchema, merkWizardSchema } from "@/modules/merk/schema";
import { resolveOwnershipReferences, validateQualityTestReferences } from "@/modules/merk/server-validation";
import type { ApplicationBrandEntryValues } from "@/modules/applications/viu-schemes/konsumsi/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const merk = await db.merk.findUnique({
    where: { id },
    include: {
      brandOwner: true,
      importers: {
        orderBy: { createdAt: "desc" },
        include: { sourceApplication: { select: { applicationNumber: true, status: true } } },
      },
      ownership: { include: { ownerCompany: true, officialRepresentative: true } },
      documents: true,
      qualityTests: {
        include: {
          commodityGroup: true,
          commoditySubGroup: true,
          coverages: { select: { commodityGroup: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        },
      },
      trademarkClassEntries: true,
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

  try {
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
          data: await buildMerkUpdateDraftData(parsed.data, resolved.ownerCompanyName),
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
        data: await buildMerkUpdateData(parsed.data, resolved.ownerCompanyName),
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
  } catch (error) {
    // Same bare-empty-500 failure mode as POST /api/merk — see
    // prisma-error-message.ts.
    const message = mapPrismaWriteError(error);
    if (message) return NextResponse.json({ error: message }, { status: 400 });
    console.error(`PATCH /api/merk/${id} failed:`, error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan merek, coba lagi." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const existing = await db.merk.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  // `MerkImporter.sourceType = "APPLICATION"` rows are only ever written by
  // syncMerkRelationshipsForApplication — which explicitly skips DRAFT
  // applications (see that module's own comment). So the mere existence of
  // one here already proves this Brand is tied to a non-DRAFT Application;
  // no need to re-check that Application's current status. Deleting the
  // Brand would cascade-delete that relationship history silently (see
  // MerkImporter's `onDelete: Cascade`) — block it instead and point at
  // Nonaktifkan, which is reversible.
  const nonDraftUsage = await db.merkImporter.findMany({
    where: { merkId: id, sourceType: "APPLICATION" },
    include: { sourceApplication: { select: { applicationNumber: true } } },
  });
  if (nonDraftUsage.length > 0) {
    const applicationNumbers = Array.from(
      new Set(nonDraftUsage.map((row) => row.sourceApplication?.applicationNumber).filter((n): n is string => Boolean(n))),
    );
    return NextResponse.json(
      {
        error: `Merek "${existing.brandName}" masih digunakan pada permohonan ${applicationNumbers.join(", ")} dan tidak dapat dihapus. Nonaktifkan merek ini jika sudah tidak digunakan.`,
      },
      { status: 409 },
    );
  }

  // A DRAFT application's `applicationBrands` never reaches MerkImporter (the sync skips
  // drafts), so this is the only way to see "referenced by a draft" — scan payload directly.
  // Not a block: a draft isn't final and can still change which brand it uses.
  const draftApplications = await db.application.findMany({
    where: { status: "DRAFT" },
    select: { applicationNumber: true, payload: true },
  });
  const draftUsage = draftApplications.filter((app) => {
    const payload = app.payload as { applicationBrands?: ApplicationBrandEntryValues[] } | null;
    return (payload?.applicationBrands ?? []).some((entry) => entry.brandId === id);
  });

  try {
    await db.merk.delete({ where: { id } });
    return NextResponse.json({
      data: { id },
      warning:
        draftUsage.length > 0
          ? `Merek ini masih dirujuk oleh draft permohonan ${draftUsage.map((d) => d.applicationNumber).join(", ")} — draft tersebut akan gagal disubmit sampai mereknya diganti.`
          : null,
    });
  } catch (error) {
    const message = mapPrismaWriteError(error);
    if (message) return NextResponse.json({ error: message }, { status: 400 });
    console.error(`DELETE /api/merk/${id} failed:`, error);
    return NextResponse.json({ error: "Gagal menghapus merek, coba lagi." }, { status: 500 });
  }
}
