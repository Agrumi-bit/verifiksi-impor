import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { PRODUCT_VERIFICATION_STATUSES } from "@/modules/verifikator-workspace/status";
import { buildProductChecklist, productVerificationsSchema } from "@/modules/verifikator-workspace/schema";

const productDataSchema = z.object({
  kategori: z.string().trim().optional(),
  materialType: z.string().trim().optional(),
  hsCode: z.string().trim().optional(),
  hsDesc: z.string().trim().optional(),
  deskripsi: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
});

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const checklist = buildProductChecklist(payload);
  const decisions = productVerificationsSchema.parse(assignment.productVerifications ?? {});

  return NextResponse.json({
    data: checklist.map((item) => ({
      ...item,
      status: decisions[item.id]?.status ?? "PENDING",
      note: decisions[item.id]?.note ?? "",
      verifiedAt: decisions[item.id]?.verifiedAt ?? null,
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(PRODUCT_VERIFICATION_STATUSES).optional(),
  note: z.string().trim().optional(),
  // Corrections to the applicant's own product data — written back to
  // Application.payload.products (the source of truth every other workspace
  // reads from via buildProductChecklist), not to productVerifications.
  productData: productDataSchema.optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Produk hanya dapat diverifikasi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const validIds = new Set(buildProductChecklist(payload).map((item) => item.id));
  if (!validIds.has(parsed.data.id)) {
    return NextResponse.json({ error: "Produk tidak dikenali" }, { status: 400 });
  }

  if (parsed.data.productData) {
    const products = (payload.products ?? []).map((p) =>
      p.id === parsed.data.id ? { ...p, ...parsed.data.productData } : p,
    );
    await db.application.update({
      where: { id: assignment.applicationId },
      data: { payload: { ...payload, products } },
    });
  }

  const decisions = productVerificationsSchema.parse(assignment.productVerifications ?? {});
  const existing = decisions[parsed.data.id];
  decisions[parsed.data.id] = {
    status: parsed.data.status ?? existing?.status ?? "PENDING",
    note: parsed.data.note ?? existing?.note,
    verifiedAt: new Date().toISOString(),
  };

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: { productVerifications: decisions },
  });

  return NextResponse.json({ data: updated.productVerifications });
}

/**
 * A product the surveyor found in the field but the applicant never listed — verifikator adds
 * it directly to Application.payload.products, same source array as PATCH decisions above,
 * starting blank so nothing is fabricated on the applicant's behalf.
 *
 * Verifikasi Jumlah Produksi's productionQty/sales sections are keyed off
 * payload.productionQty/sales — separate arrays from payload.products, one row per product,
 * created during the wizard. A product added here has no such rows yet, so it silently never
 * showed up on that tab. Seed blank rows (VKI only, matching what buildProductionQtyChecklist /
 * buildSalesChecklist require) alongside the product itself.
 *
 * payload.capacity ("Kapasitas Produksi Berdasarkan Perizinan") is deliberately NOT seeded here
 * — it's a free-standing, manually-managed list (one izin/license can cover several HS codes,
 * e.g. a textile spinning license producing many yarn types), not 1:1 with products anymore.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Produk hanya dapat ditambahkan saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = productDataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const newProduct = { id: randomUUID(), ...parsed.data };
  const products = [...(payload.products ?? []), newProduct];

  const isVki = payload.verificationType === "VKI";
  const productionQty = isVki
    ? [...(payload.productionQty ?? []), { productId: newProduct.id, perTahunSebelumnya: "", perTahunRencana: "", satuan: "" }]
    : payload.productionQty;
  const sales = isVki
    ? [...(payload.sales ?? []), { productId: newProduct.id, dalamNegeri: "", luarNegeri: "", negaraTujuan: "", satuan: "" }]
    : payload.sales;

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, products, productionQty, sales } },
  });

  return NextResponse.json({ data: newProduct }, { status: 201 });
}

/**
 * Removes a product verifikator added by mistake — cascades to every other array keyed by
 * productId (productionQty/sales seeded on add, plus any rawMaterialConversions linking it to
 * raw materials) so nothing orphaned lingers, and drops its productVerifications decision.
 * Products originally submitted by the applicant can also be deleted here — same capability as
 * the underlying array edit, no separate "own vs applicant's" distinction.
 *
 * payload.capacity is deliberately left alone — it's no longer 1:1 with products (see the POST
 * handler above), so a capacity row never gets cascade-deleted just because some product was.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Produk hanya dapat dihapus saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId wajib diisi" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const productExists = (payload.products ?? []).some((p) => p.id === productId);
  if (!productExists) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  }

  const products = (payload.products ?? []).filter((p) => p.id !== productId);
  const productionQty = (payload.productionQty ?? []).filter((p) => p.productId !== productId);
  const sales = (payload.sales ?? []).filter((s) => s.productId !== productId);
  const rawMaterialConversions = (payload.rawMaterialConversions ?? []).filter((c) => c.productId !== productId);

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, products, productionQty, sales, rawMaterialConversions } },
  });

  const decisions = productVerificationsSchema.parse(assignment.productVerifications ?? {});
  delete decisions[productId];
  await db.assignment.update({
    where: { id: assignment.id },
    data: { productVerifications: decisions },
  });

  return NextResponse.json({ data: { id: productId } });
}
