import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { computeBrandCompleteness } from "@/modules/merk/compute-brand-completeness";

/** `Merk.status = DRAFT` rows only. "Last Completed Step" is a heuristic —
 * this model has no persisted `currentStep`/`createdBy` column, so both are
 * best-effort/absent rather than fabricated (see the Merek Management
 * navigation report). */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const drafts = await db.merk.findMany({
    where: { status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      brandName: true,
      certificateType: true,
      updatedAt: true,
      company: { select: { companyName: true } },
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
        companyName: draft.company?.companyName ?? null,
        lastStep,
        completeness: completeness.percent,
        updatedAt: draft.updatedAt,
      };
    }),
  });
}
