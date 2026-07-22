import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import {
  contactPersonSchema,
  generalInformationSchema,
  legalInformationSchema,
  locationsSchema,
} from "@/modules/shared/schema";

export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: company });
}

const SECTIONS = ["general", "contact", "legal", "facilities"] as const;
type Section = (typeof SECTIONS)[number];

function isSection(value: unknown): value is Section {
  return typeof value === "string" && (SECTIONS as readonly string[]).includes(value);
}

function invalidResponse(error: z.ZodError) {
  return NextResponse.json(
    { error: "Data tidak valid", issues: z.treeifyError(error) },
    { status: 400 },
  );
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const section = (body as { section?: unknown })?.section;
  if (!isSection(section)) {
    return NextResponse.json({ error: "Bagian formulir tidak valid" }, { status: 400 });
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  if (section === "general") {
    const parsed = generalInformationSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        companyName: v.companyName,
        companyType: v.companyType,
        investmentStatus: v.investmentStatus,
        companyEmail: v.companyEmail,
        companyPhone: v.companyPhone,
        companyWebsite: v.companyWebsite || null,
      },
    });
  } else if (section === "contact") {
    const parsed = contactPersonSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        contactFullName: v.contactFullName,
        contactDesignation: v.contactDesignation,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone,
      },
    });
  } else if (section === "legal") {
    const parsed = legalInformationSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        nibNumber: v.nibNumber,
        nibIssueDate: new Date(v.nibIssueDate),
        nibDocumentPath: v.nibDocumentPath,
        kbliEntries: v.kbliEntries,
        kbliDocumentPath: v.kbliDocumentPath,
        notarialDeedNumber: v.notarialDeedNumber,
        notarialDeedIssueDate: new Date(v.notarialDeedIssueDate),
        notarialIssuingAuthority: v.notarialIssuingAuthority,
        notarialAmendmentInfo: v.notarialAmendmentInfo || null,
        notarialDocumentPath: v.notarialDocumentPath,
      },
    });
  } else {
    const parsed = locationsSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: { locations: v.locations },
    });
  }

  const updated = await db.company.findUnique({ where: { id: companyId } });
  return NextResponse.json({ data: updated });
}
