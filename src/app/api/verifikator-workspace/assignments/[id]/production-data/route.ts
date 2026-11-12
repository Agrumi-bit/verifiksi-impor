import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { isAssignmentReviewable } from "@/modules/applications/assignment-review-state";
import { getServerSession } from "@/lib/get-session";
import { updateApplicationPayload } from "@/lib/application-payload";
import { kbliMasterDescriptions } from "@/modules/master-data/kbli-lookup.server";
import { productionQtyVerificationsSchema } from "@/modules/verifikator-workspace/schema";

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
  if (!isAssignmentReviewable(assignment)) {
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
  // Satuan is picked from the Satuan master data on the client, but validated here only as a
  // non-empty string — values saved before the master existed (or since removed from it) stay valid.
  if ("satuan" in filteredFields && !filteredFields.satuan) {
    return NextResponse.json({ error: "Satuan wajib dipilih" }, { status: 400 });
  }

  // Capacity: Uraian KBLI follows the KBLI master data — looked up for the new code, or for the
  // row's current code when only the description is sent (a manual description is kept only for
  // codes the master data doesn't list).
  let kbliMaster: Map<string, string> | null = null;
  if (source === "capacity" && ("kbliCode" in filteredFields || "kbliDescription" in filteredFields)) {
    const currentRow = ((assignment.application.payload as { capacity?: Array<Record<string, unknown>> } | null)?.capacity ?? []).find(
      (item) => (item.id ?? item.productId) === itemId,
    );
    kbliMaster = await kbliMasterDescriptions([filteredFields.kbliCode, currentRow?.kbliCode as string | undefined]);
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
      // Product Verification has no usage row until the first edit here creates one.
      // productionQty/sales rows are seeded per product, but verifikator can delete one (see
      // DELETE below) and add it back here — allowed only for a product that exists.
      // Capacity has its own add/delete route, so a missing row there stays a real 404.
      const productExists = (freshPayload.products ?? []).some((p) => p.id === itemId);
      if (isNew && source === "capacity") {
        return { payload: freshPayload, result: { ok: false } };
      }
      if (isNew && (source === "productionQty" || source === "sales") && !productExists) {
        return { payload: freshPayload, result: { ok: false } };
      }

      const blankRow: Record<Source, Record<string, unknown>> = {
        capacity: {},
        rawMaterialUsage: { rawMaterialId: itemId },
        productionQty: { productId: itemId, perTahunSebelumnya: "", perTahunRencana: "", satuan: "" },
        sales: { productId: itemId, dalamNegeri: "", luarNegeri: "", negaraTujuan: "", satuan: "" },
      };
      const merged: Record<string, unknown> = isNew
        ? { ...blankRow[source], ...filteredFields }
        : { ...list[index], ...filteredFields };
      // A legacy capacity row (no `id` of its own yet) converges onto the new shape the first
      // time it's edited, so future edits/deletes address it by a real id instead of productId.
      if (source === "capacity" && !merged.id) {
        merged.id = itemId;
      }
      const masterKbli = kbliMaster?.get(String(merged.kbliCode ?? "").trim());
      if (source === "capacity" && masterKbli) {
        merged.kbliDescription = masterKbli;
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

const deleteSourceSchema = z.enum(["productionQty", "sales"]);

/**
 * Removes one product's row from Jumlah Produksi (productionQty — the same row feeds both the
 * "Satu Tahun Sebelumnya" and "Rencana" tables) or from Penjualan (sales). The product itself
 * stays in Product Verification; the row can be added back through PATCH above. Row-level
 * decisions of a removed productionQty row are dropped with it.
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
  if (!isAssignmentReviewable(assignment)) {
    return NextResponse.json(
      { error: "Data hanya dapat dihapus saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const source = deleteSourceSchema.safeParse(searchParams.get("source"));
  const itemId = searchParams.get("itemId");
  if (!source.success || !itemId) {
    return NextResponse.json({ error: "source dan itemId wajib diisi" }, { status: 400 });
  }

  const removed = await updateApplicationPayload<boolean>(assignment.applicationId, (freshPayload) => {
    const list = (freshPayload[source.data] ?? []) as Array<{ productId?: string }>;
    const next = list.filter((item) => item.productId !== itemId);
    return { payload: { ...freshPayload, [source.data]: next }, result: next.length !== list.length };
  });
  if (!removed) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  if (source.data === "productionQty") {
    const decisions = productionQtyVerificationsSchema.parse(assignment.productionQtyVerifications ?? {});
    const rowKeys = [`sebelumnya:${itemId}`, `rencana:${itemId}`];
    if (rowKeys.some((key) => key in decisions)) {
      const remaining = Object.fromEntries(Object.entries(decisions).filter(([key]) => !rowKeys.includes(key)));
      await db.assignment.update({ where: { id: assignment.id }, data: { productionQtyVerifications: remaining } });
    }
  }

  return NextResponse.json({ data: { source: source.data, itemId } });
}
