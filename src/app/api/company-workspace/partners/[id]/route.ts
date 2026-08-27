import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Akun Anda belum terhubung dengan perusahaan manapun." }, { status: 404 });
  }

  const { id } = await params;
  const partner = await db.partner.findUnique({ where: { id }, include: { company: true } });
  if (!partner || partner.ownerCompanyId !== companyId) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: partner });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Akun Anda belum terhubung dengan perusahaan manapun." }, { status: 404 });
  }

  const { id } = await params;
  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner || partner.ownerCompanyId !== companyId) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  await db.partner.delete({ where: { id } });
  return NextResponse.json({ data: null });
}
