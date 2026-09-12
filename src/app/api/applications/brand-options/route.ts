import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { MERK_LIST_INCLUDE, toMerkListItem } from "@/modules/merk/list-projection";

/**
 * Brand Master options for the VIU Barang Konsumsi wizard's "Pilih Merek"
 * dialog (Step "Merek yang Digunakan"). A signed-in company user is always
 * scoped to their own session `companyId` — a hard trust boundary, never
 * overridable by the client (same boundary `/api/company-workspace/brands`
 * already enforces).
 *
 * Staff (the generic/admin wizard entry point) get every registered Brand
 * regardless of which company is picked in Step 1: Brand Master rows are
 * registered by admin directly and aren't necessarily tied to whichever
 * company ends up applying, so the applicant may legitimately have zero
 * Brands of its own yet still need to attach one to the application.
 */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;

  const brands = await db.merk.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { createdAt: "desc" },
    include: MERK_LIST_INCLUDE,
  });
  return NextResponse.json({ data: brands.map(toMerkListItem) });
}
