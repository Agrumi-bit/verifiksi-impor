import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { PARTNER_TYPES, PARTNER_STATUSES } from "@/modules/partner/schema";

const createPartnerSchema = z.object({
  companyId: z.string().trim().min(1),
  type: z.enum(PARTNER_TYPES),
  contractNumber: z.string().trim().min(1),
  contractStartDate: z.string().trim().min(1),
  contractEndDate: z.string().trim().min(1),
  contractDocumentPath: z.string().trim().optional(),
  relatedCompanyIds: z.array(z.string().trim().min(1)).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  // Application wizard's Partner Industri step passes this when the applying company is known,
  // so it only offers partners that company itself registered (Company Workspace's own "Partner
  // Companies" list) instead of every partner in the system. Omitted entirely by the admin
  // Partner Management table, which intentionally still lists everything.
  const ownerCompanyId = searchParams.get("ownerCompanyId");

  const partners = await db.partner.findMany({
    where: {
      type: type && PARTNER_TYPES.includes(type as (typeof PARTNER_TYPES)[number])
        ? (type as (typeof PARTNER_TYPES)[number])
        : undefined,
      status: status && PARTNER_STATUSES.includes(status as (typeof PARTNER_STATUSES)[number])
        ? (status as (typeof PARTNER_STATUSES)[number])
        : undefined,
      ownerCompanyId: ownerCompanyId || undefined,
    },
    include: {
      company: true,
      // Admin-curated "PERUSAHAAN API-U TERKAIT" — which API-U companies use/relate to this
      // partner, set explicitly at create time (see POST below), not derived from application data.
      relatedCompanies: { select: { id: true, companyName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: partners });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createPartnerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;

  const company = await db.company.findUnique({ where: { id: values.companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const partner = await db.partner.create({
    data: {
      companyId: values.companyId,
      type: values.type,
      contractNumber: values.contractNumber,
      contractStartDate: new Date(values.contractStartDate),
      contractEndDate: new Date(values.contractEndDate),
      contractDocumentPath: values.contractDocumentPath || null,
      relatedCompanies: values.relatedCompanyIds?.length
        ? { connect: values.relatedCompanyIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { company: true, relatedCompanies: { select: { id: true, companyName: true } } },
  });

  return NextResponse.json({ data: partner }, { status: 201 });
}
