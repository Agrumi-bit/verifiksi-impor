import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { PARTNER_TYPES } from "@/modules/partner/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await db.partner.findUnique({
    where: { id },
    include: { company: true, relatedCompanies: { select: { id: true, companyName: true } } },
  });

  if (!partner) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: partner });
}

const updatePartnerSchema = z.object({
  type: z.enum(PARTNER_TYPES).optional(),
  contractNumber: z.string().trim().min(1).optional(),
  contractStartDate: z.string().trim().min(1).optional(),
  contractEndDate: z.string().trim().min(1).optional(),
  contractDocumentPath: z.string().trim().optional(),
  // Full replace, not merge — the edit form always sends the complete current selection.
  relatedCompanyIds: z.array(z.string().trim().min(1)).optional(),
});

/** The mitra's own identity (`companyId`) is immutable after creation — editing a Partner only
 * ever changes its contract/relation details, never which company it refers to. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await db.partner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  const parsed = updatePartnerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const values = parsed.data;

  const partner = await db.partner.update({
    where: { id },
    data: {
      ...(values.type !== undefined ? { type: values.type } : {}),
      ...(values.contractNumber !== undefined ? { contractNumber: values.contractNumber } : {}),
      ...(values.contractStartDate !== undefined ? { contractStartDate: new Date(values.contractStartDate) } : {}),
      ...(values.contractEndDate !== undefined ? { contractEndDate: new Date(values.contractEndDate) } : {}),
      ...(values.contractDocumentPath !== undefined
        ? { contractDocumentPath: values.contractDocumentPath || null }
        : {}),
      ...(values.relatedCompanyIds !== undefined
        ? { relatedCompanies: { set: values.relatedCompanyIds.map((companyId) => ({ id: companyId })) } }
        : {}),
    },
    include: { company: true, relatedCompanies: { select: { id: true, companyName: true } } },
  });

  return NextResponse.json({ data: partner });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  await db.partner.delete({ where: { id } });
  return NextResponse.json({ data: null });
}
