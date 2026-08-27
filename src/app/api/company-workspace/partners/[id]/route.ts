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
  const partner = await db.partner.findUnique({
    where: { id },
    include: { company: true, relatedCompanies: { select: { id: true, companyName: true } } },
  });
  const isOwner = partner?.ownerCompanyId === companyId;
  const isRelated = partner?.relatedCompanies.some((c) => c.id === companyId) ?? false;
  if (!partner || (!isOwner && !isRelated)) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: { ...partner, isOwner } });
}

/** Only the company that registered this Partner itself (`ownerCompanyId`) can delete it — a
 * company admin merely *related* to a partner (via the admin "PERUSAHAAN API-U TERKAIT" picker)
 * can see it in their list but doesn't own the record, since other companies may share that
 * same relation. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Akun Anda belum terhubung dengan perusahaan manapun." }, { status: 404 });
  }

  const { id } = await params;
  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }
  if (partner.ownerCompanyId !== companyId) {
    return NextResponse.json(
      { error: "Partner ini didaftarkan oleh admin, bukan oleh perusahaan Anda — tidak bisa dihapus dari sini." },
      { status: 403 },
    );
  }

  await db.partner.delete({ where: { id } });
  return NextResponse.json({ data: null });
}
