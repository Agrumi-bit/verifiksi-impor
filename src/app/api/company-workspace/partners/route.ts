import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { partnerWizardSchema } from "@/modules/partner/schema";

/**
 * Company Workspace's own "Partner Companies" list — scoped to `ownerCompanyId`, distinct
 * from the admin Partner Management module (`/api/partners`) which lists every Partner row
 * in the system regardless of who registered it. See the Prisma model comment on
 * `Partner.ownerCompanyId` for why this second field exists alongside `companyId`.
 */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  const partners = await db.partner.findMany({
    where: { ownerCompanyId: companyId },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: partners });
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
