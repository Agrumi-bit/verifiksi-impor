import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { updateApplicationPayload } from "@/lib/application-payload";

const SOURCE_CONFIG = {
  // capacity rows are matched by their own id now, not productId — see capacityItemSchema for
  // why (no longer forced 1:1 with a product, and keyed by KBLI, not HS Code).
  capacity: {
    idField: "id",
    allowedFields: ["jenisProduk", "kbliCode", "kbliDescription", "berdasarkanIzin", "kapasitasTerpasang", "satuan"],
  },
  productionQty: { idField: "productId", allowedFields: ["perTahunSebelumnya", "perTahunRencana", "satuan"] },
  rawMaterialUsage: {
    idField: "rawMaterialId",
    allowedFields: [
      "penggunaan",
      "dataStock",
      "rencanaKebutuhan",
      "rencanaKebutuhanDalamNegeri",
      "rencanaKebutuhanLuarNegeri",
      "rencanaKebutuhanNegaraAsal",
      "satuan",
    ],
  },
  sales: { idField: "productId", allowedFields: ["dalamNegeri", "luarNegeri", "negaraTujuan", "satuan"] },
} as const;

type Source = keyof typeof SOURCE_CONFIG;

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

const patchSchema = z.object({
  source: z.enum(["capacity", "productionQty", "rawMaterialUsage", "sales"]),
  itemId: z.string().trim().min(1),
  fields: z.record(z.string(), z.string().trim()),
});

/**
 * Every VKI production-quantity source array (capacity, productionQty, rawMaterialUsage,
 * sales) lives on payload but only had a read/status/keterangan review layer — the underlying
 * volume/jumlah figures themselves were never editable by verifikator. This is the single
 * write path for all four, restricted to a per-source field allowlist so a stray key can't
 * clobber unrelated payload shape.
 */
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
      { error: "Data hanya dapat diubah saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { source, itemId, fields } = parsed.data;
  const config = SOURCE_CONFIG[source as Source];
  const filteredFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) => (config.allowedFields as readonly string[]).includes(key)),
  );
  if (Object.keys(filteredFields).length === 0) {
    return NextResponse.json({ error: "Tidak ada field yang valid untuk diubah" }, { status: 400 });
  }

  const result = await updateApplicationPayload<{ ok: boolean; item?: Record<string, unknown> }>(
    assignment.applicationId,
    (freshPayload) => {
      const list = (freshPayload[source] ?? []) as Array<Record<string, unknown>>;
      // capacity rows created before they had their own `id` fall back to `productId` as a
      // stable identity (see buildCapacityRows) — match either.
      const rowId = (item: Record<string, unknown>) =>
        source === "capacity" ? (item.id ?? item.productId) : item[config.idField];
      const index = list.findIndex((item) => rowId(item) === itemId);

      const isNew = index === -1;
      // rawMaterialUsage rows aren't seeded anywhere — a raw material linked to a product in
      // Product Verification has no usage row until the first edit here creates one. Every
      // other source is still 1:1-seeded elsewhere (capacity has its own add/delete route;
      // productionQty/sales are seeded per product), so a missing row there stays a real 404.
      if (isNew && source !== "rawMaterialUsage") {
        return { payload: freshPayload, result: { ok: false } };
      }

      const merged: Record<string, unknown> = isNew
        ? { rawMaterialId: itemId, ...filteredFields }
        : { ...list[index], ...filteredFields };
      // A legacy capacity row (no `id` of its own yet) converges onto the new shape the first
      // time it's edited, so future edits/deletes address it by a real id instead of productId.
      if (source === "capacity" && !merged.id) {
        merged.id = itemId;
      }
      // rencanaKebutuhan is kept as an auto-summed total (dalamNegeri + luarNegeri) — report
      // code reads this single field, so keep it in sync whenever either half changes.
      if (source === "rawMaterialUsage" && ("rencanaKebutuhanDalamNegeri" in filteredFields || "rencanaKebutuhanLuarNegeri" in filteredFields)) {
        const dalamNegeri = Number(merged.rencanaKebutuhanDalamNegeri) || 0;
        const luarNegeri = Number(merged.rencanaKebutuhanLuarNegeri) || 0;
        merged.rencanaKebutuhan = String(dalamNegeri + luarNegeri);
      }
      const updatedList = isNew ? [...list, merged] : list.map((item, i) => (i === index ? merged : item));

      return { payload: { ...freshPayload, [source]: updatedList }, result: { ok: true, item: merged } };
    },
  );

  if (!result.ok) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: result.item });
}
