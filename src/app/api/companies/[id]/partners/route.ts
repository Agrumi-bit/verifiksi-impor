import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

/**
 * Admin-scoped mirror of `GET /api/company-workspace/partners` — same OR-scoping (a partner
 * shows here if this company registered it itself via `ownerCompanyId`, or admin related this
 * company to it via "PERUSAHAAN API-U TERKAIT") — but keyed by the `id` in the URL instead of
 * the caller's own `session.user.companyId`, for the "Partner" tab on admin's Company Detail
 * page (an arbitrary company, not the admin's own).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const partners = await db.partner.findMany({
    where: { OR: [{ ownerCompanyId: id }, { relatedCompanies: { some: { id } } }] },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  const data = partners.map((partner) => ({ ...partner, isOwner: partner.ownerCompanyId === id }));
  return NextResponse.json({ data });
}
