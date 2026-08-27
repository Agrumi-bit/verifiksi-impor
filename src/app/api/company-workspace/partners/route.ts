import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { partnerWizardSchema } from "@/modules/partner/schema";

/**
 * Company Workspace's own "Partner Companies" list, distinct from the admin Partner Management
 * module (`/api/partners`) which lists every Partner row in the system regardless of who
 * registered it. Shows a partner here if EITHER:
 *  - this company registered it itself (`ownerCompanyId`, via this workspace's own wizard), or
 *  - admin explicitly related this company to it ("PERUSAHAAN API-U TERKAIT" on the admin
 *    Partner form) — otherwise a partner admin adds and flags as related to this company would
 *    never show up here, which is exactly the sync gap this OR was added to close.
 */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  const partners = await db.partner.findMany({
    where: { OR: [{ ownerCompanyId: companyId }, { relatedCompanies: { some: { id: companyId } } }] },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  const data = partners.map((partner) => ({ ...partner, isOwner: partner.ownerCompanyId === companyId }));
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = partnerWizardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const values = parsed.data;

  const partnerCompany = await db.company.findUnique({ where: { id: values.companyId } });
  if (!partnerCompany) {
    return NextResponse.json({ error: "Perusahaan partner tidak ditemukan" }, { status: 404 });
  }

  const partner = await db.partner.create({
    data: {
      companyId: values.companyId,
      ownerCompanyId: companyId,
      type: values.type,
      contractNumber: values.contractNumber,
      contractStartDate: new Date(values.contractStartDate),
      contractEndDate: new Date(values.contractEndDate),
      contractDocumentPath: values.contractDocumentPath || null,
    },
    include: { company: true },
  });

  return NextResponse.json({ data: partner }, { status: 201 });
}
