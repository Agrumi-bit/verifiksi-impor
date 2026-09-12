import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { computeBrandCompleteness } from "@/modules/merk/compute-brand-completeness";

/** Company-scoped counterpart to /api/merk/drafts. */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const drafts = await db.merk.findMany({
    where: { companyId, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      brandName: true,
      certificateType: true,
      updatedAt: true,
      ownership: {
        select: {
          ownerLocation: true,
          relationshipWithApiu: true,
          representationType: true,
          appointmentSource: true,
          agreementType: true,
        },
      },
      documents: { select: { documentType: true, filePath: true } },
    },
  });

  return NextResponse.json({
    data: drafts.map((draft) => {
      const completeness = computeBrandCompleteness(draft);
      const lastStep = draft.documents.length > 0 || completeness.requiredCount > 0
        ? "Dokumen Pendukung"
        : draft.ownership
          ? "Kepemilikan & Perwakilan"
          : "Informasi Merek";

      return {
        brandId: draft.id,
        brandName: draft.brandName,
        companyName: null,
        lastStep,
        completeness: completeness.percent,
        updatedAt: draft.updatedAt,
      };
    }),
  });
}
