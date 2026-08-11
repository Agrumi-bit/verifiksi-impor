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
  status: z.enum(PRODUCT_VERIFICATION_STATUSES),
  note: z.string().trim().optional(),
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

  const decisions = productVerificationsSchema.parse(assignment.productVerifications ?? {});
  decisions[parsed.data.id] = {
    status: parsed.data.status,
    note: parsed.data.note,
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
 * Verifikasi Jumlah Produksi's capacity/productionQty/sales sections are keyed off
 * payload.capacity/productionQty/sales — separate arrays from payload.products, one row per
 * product, created during the wizard. A product added here has no such rows yet, so it silently
 * never showed up on that tab. Seed blank rows (VKI only, matching what buildCapacityRows /
 * buildProductionQtyChecklist / buildSalesChecklist require) alongside the product itself.
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
  const capacity = isVki
    ? [...(payload.capacity ?? []), { productId: newProduct.id, berdasarkanIzin: "", kapasitasTerpasang: "", satuan: "" }]
    : payload.capacity;
  const productionQty = isVki
    ? [...(payload.productionQty ?? []), { productId: newProduct.id, perTahunSebelumnya: "", perTahunRencana: "", satuan: "" }]
    : payload.productionQty;
  const sales = isVki
    ? [...(payload.sales ?? []), { productId: newProduct.id, dalamNegeri: "", luarNegeri: "", negaraTujuan: "", satuan: "" }]
    : payload.sales;

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, products, capacity, productionQty, sales } },
  });

  return NextResponse.json({ data: newProduct }, { status: 201 });
}
