import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

/**
 * One-off backfill for products added via the verifikator POST /products
 * endpoint before the seeding fix (3c8af1a) shipped — those landed in
 * payload.products with no matching payload.capacity/productionQty/sales
 * row, so they silently never showed up on Verifikasi Jumlah Produksi.
 * Idempotent: only appends rows for productIds that don't already have one
 * in that array, never touches existing rows. Secret-gated like the other
 * one-off routes in this family; remove once the backfill is done.
 */
export async function POST(request: Request) {
  const key = request.headers.get("x-audit-key");
  if (!key || key !== process.env.BETTER_AUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await db.application.findMany({
    where: { verificationType: "VKI" },
    select: { id: true, applicationNumber: true, payload: true },
  });

  const results: { applicationNumber: string; addedCapacity: number; addedProductionQty: number; addedSales: number }[] = [];

  for (const app of applications) {
    const payload = app.payload as ApplicationWizardValues;
    const products = payload.products ?? [];
    if (products.length === 0) continue;

    const capacityIds = new Set((payload.capacity ?? []).map((c) => c.productId));
    const productionQtyIds = new Set((payload.productionQty ?? []).map((p) => p.productId));
    const salesIds = new Set((payload.sales ?? []).map((s) => s.productId));

    const missingCapacity = products.filter((p) => !capacityIds.has(p.id));
    const missingProductionQty = products.filter((p) => !productionQtyIds.has(p.id));
    const missingSales = products.filter((p) => !salesIds.has(p.id));

    if (missingCapacity.length === 0 && missingProductionQty.length === 0 && missingSales.length === 0) continue;

    const capacity = [
      ...(payload.capacity ?? []),
      ...missingCapacity.map((p) => ({ productId: p.id, berdasarkanIzin: "", kapasitasTerpasang: "", satuan: "" })),
    ];
    const productionQty = [
      ...(payload.productionQty ?? []),
      ...missingProductionQty.map((p) => ({ productId: p.id, perTahunSebelumnya: "", perTahunRencana: "", satuan: "" })),
    ];
    const sales = [
      ...(payload.sales ?? []),
      ...missingSales.map((p) => ({ productId: p.id, dalamNegeri: "", luarNegeri: "", negaraTujuan: "", satuan: "" })),
    ];

    await db.application.update({
      where: { id: app.id },
      data: { payload: { ...payload, capacity, productionQty, sales } },
    });

    results.push({
      applicationNumber: app.applicationNumber,
      addedCapacity: missingCapacity.length,
      addedProductionQty: missingProductionQty.length,
      addedSales: missingSales.length,
    });
  }

  return NextResponse.json({ applicationsFixed: results.length, results });
}
