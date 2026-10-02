import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { MERK_LIST_INCLUDE, toMerkListItem } from "@/modules/merk/list-projection";

/**
 * Brand Master options for the VIU Barang Konsumsi wizard's "Pilih Merek"
 * dialog (Step "Merek yang Digunakan"). Brand ownership (`Merk.companyId`,
 * free text in Merk Management, not a Company FK — see validate-submit.ts's
 * own comment) is deliberately separate from which company may USE a brand
 * in a VIU Konsumsi application: one brand can legitimately be used by
 * several different applicants (e.g. as Perwakilan Resmi or ditunjuk sebagai
 * importir), with that relationship established per-application via
 * `applicationBrands[].applicantRole` and its supporting documents — never
 * by Brand Master company ownership. A signed-in company user therefore sees
 * its own Brands (any status, so it can keep working on its own drafts too)
 * PLUS every ACTIVE Brand platform-wide, not just its own — mirroring the
 * same relaxation in `/api/company-workspace/brands/[id]`'s own GET.
 *
 * Staff (the generic/admin wizard entry point) still get every registered
 * Brand regardless of status or company.
 */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;

  const brands = await db.merk.findMany({
    where: companyId ? { OR: [{ companyId }, { status: "ACTIVE" }] } : undefined,
    orderBy: { createdAt: "desc" },
    include: MERK_LIST_INCLUDE,
  });
  return NextResponse.json({ data: brands.map(toMerkListItem) });
}
