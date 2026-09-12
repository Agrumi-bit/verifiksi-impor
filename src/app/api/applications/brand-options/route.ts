import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { MERK_LIST_INCLUDE, toMerkListItem } from "@/modules/merk/list-projection";

/**
 * Brand Master options for the VIU Barang Konsumsi wizard's "Pilih Merek"
 * dialog (Step "Merek yang Digunakan"). A signed-in company user is always
 * scoped to their own session `companyId`, ignoring any `companyId` query
 * param a client might send — the same trust boundary
 * `/api/company-workspace/brands` already enforces. Staff without a
 * `companyId` (the generic/admin wizard entry point, where a company is
 * picked mid-form rather than implied by the session) may pass `companyId`
 * explicitly to scope the list to whichever company is selected in Step 1.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  const sessionCompanyId = session?.user.companyId;
  const { searchParams } = new URL(request.url);
  const requestedCompanyId = searchParams.get("companyId");
  const companyId = sessionCompanyId ?? requestedCompanyId;

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
