import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { buildMerkUpdateData, buildMerkUpdateDraftData } from "@/modules/merk/build-create-data";
import { mapPrismaWriteError } from "@/modules/merk/prisma-error-message";
import { merkDraftSchema, merkStatusUpdateSchema, merkWizardSchema } from "@/modules/merk/schema";
import { resolveOwnershipReferences, validateQualityTestReferences } from "@/modules/merk/server-validation";

/**
 * Used for two different purposes that need two different trust boundaries:
 * 1. Resuming a saved Draft into MerkWizard (see BR-002 in the Add Brand review) — must stay
 *    company-scoped, a company can never read/resume another's in-progress Brand registration.
 * 2. VIU Konsumsi's "Merek yang Digunakan" step fetching a selected Brand's live detail (evidence
 *    validity, documents on file) to compute relationship requirements/readiness — here company
 *    ownership must NOT gate access. Brand ownership (`Merk.companyId`) is deliberately separate
 *    from which company may USE a Brand in an application (see
 *    `/api/applications/brand-options`'s own comment) — the applicant's relationship is
 *    established per-application via `applicantRole`, not by matching company ids. Blocking this
 *    fetch for a legitimately-usable ACTIVE Brand caused "Gagal memuat detail merek ini" and a
 *    false NOT_ELIGIBLE readiness for any Brand the applying company didn't itself register.
 *
 * So: found if it's this company's own Brand (any status, purpose 1) OR any ACTIVE Brand
 * platform-wide (purpose 2). `PATCH` below stays strictly company-scoped — only purpose 1 ever
 * writes data.
 */
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
    where: { id, OR: [{ companyId }, { status: "ACTIVE" }] },
    include: {
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

  try {
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
  } catch (error) {
    // Same bare-empty-500 failure mode as POST /api/merk — see
    // prisma-error-message.ts.
    const message = mapPrismaWriteError(error);
    if (message) return NextResponse.json({ error: message }, { status: 400 });
    console.error(`PATCH /api/company-workspace/brands/${id} failed:`, error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan merek, coba lagi." }, { status: 500 });
  }
}
