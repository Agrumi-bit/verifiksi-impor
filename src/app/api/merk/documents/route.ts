import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { resolveTrademarkEvidenceExpiry } from "@/modules/merk/trademark-evidence-expiry";

/** Platform-level Brand document monitoring — flattens `BrandDocument`
 * across every brand. Upload status only; never "Verified" (no verification
 * workflow exists on this model — see the Merek Management navigation
 * report). */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const documents = await db.brandDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      merk: {
        select: {
          id: true,
          brandName: true,
          certificateType: true,
          registrationDate: true,
          registrationExpiryDate: true,
          company: { select: { companyName: true } },
        },
      },
    },
  });

  return NextResponse.json({
    data: documents.map((doc) => ({
      id: doc.id,
      brandId: doc.merk.id,
      brandName: doc.merk.brandName,
      companyName: doc.merk.company?.companyName ?? null,
      documentType: doc.documentType,
      category: doc.category,
      fileName: doc.fileName,
      documentNumber: doc.documentNumber,
      issueDate: doc.issueDate,
      expiryDate:
        doc.documentType === "trademark_evidence"
          ? resolveTrademarkEvidenceExpiry(doc.merk.certificateType, doc.merk.registrationDate, doc.merk.registrationExpiryDate)
          : doc.expiryDate,
    })),
  });
}
