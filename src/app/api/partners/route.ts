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

  const [partners, applications] = await Promise.all([
    db.partner.findMany({
      where: {
        type: type && PARTNER_TYPES.includes(type as (typeof PARTNER_TYPES)[number])
          ? (type as (typeof PARTNER_TYPES)[number])
          : undefined,
        status: status && PARTNER_STATUSES.includes(status as (typeof PARTNER_STATUSES)[number])
          ? (status as (typeof PARTNER_STATUSES)[number])
          : undefined,
        ownerCompanyId: ownerCompanyId || undefined,
      },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
    db.application.findMany({
      where: { companyId: { not: null } },
      select: { payload: true, company: { select: { companyName: true } } },
    }),
  ]);

  const relatedCompaniesByPartnerId = new Map<string, Set<string>>();
  for (const application of applications) {
    const payload = application.payload as { partnerIndustriEntries?: { partnerId?: string; enabled?: boolean }[] } | null;
    const companyName = application.company?.companyName;
    if (!companyName) continue;
    for (const entry of payload?.partnerIndustriEntries ?? []) {
      if (!entry.enabled || !entry.partnerId) continue;
      const set = relatedCompaniesByPartnerId.get(entry.partnerId) ?? new Set<string>();
      set.add(companyName);
      relatedCompaniesByPartnerId.set(entry.partnerId, set);
    }
  }

  const data = partners.map((partner) => ({
    ...partner,
    relatedCompanies: Array.from(relatedCompaniesByPartnerId.get(partner.id) ?? []),
  }));

  return NextResponse.json({ data });
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
    },
    include: { company: true },
  });

  return NextResponse.json({ data: partner }, { status: 201 });
}
