import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/** Company-scoped counterpart to /api/merk/documents. */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const documents = await db.brandDocument.findMany({
    where: { merk: { companyId } },
    orderBy: { createdAt: "desc" },
    include: { merk: { select: { id: true, brandName: true } } },
  });

  return NextResponse.json({
    data: documents.map((doc) => ({
      id: doc.id,
      brandId: doc.merk.id,
      brandName: doc.merk.brandName,
      documentType: doc.documentType,
      category: doc.category,
      fileName: doc.fileName,
      documentNumber: doc.documentNumber,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
    })),
  });
}
