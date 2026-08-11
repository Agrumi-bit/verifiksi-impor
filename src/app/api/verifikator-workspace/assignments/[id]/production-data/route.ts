import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

const SOURCE_CONFIG = {
  capacity: { idField: "productId", allowedFields: ["berdasarkanIzin", "kapasitasTerpasang", "satuan"] },
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

  const payload = assignment.application.payload as ApplicationWizardValues;
  const list = (payload[source] ?? []) as Array<Record<string, unknown>>;
  const index = list.findIndex((item) => item[config.idField] === itemId);
  if (index === -1) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  const merged = { ...list[index], ...filteredFields };
  // rencanaKebutuhan is kept as an auto-summed total (dalamNegeri + luarNegeri) — report code
  // reads this single field, so keep it in sync whenever either half changes.
  if (source === "rawMaterialUsage" && ("rencanaKebutuhanDalamNegeri" in filteredFields || "rencanaKebutuhanLuarNegeri" in filteredFields)) {
    const dalamNegeri = Number(merged.rencanaKebutuhanDalamNegeri) || 0;
    const luarNegeri = Number(merged.rencanaKebutuhanLuarNegeri) || 0;
    merged.rencanaKebutuhan = String(dalamNegeri + luarNegeri);
  }
  const updatedList = list.map((item, i) => (i === index ? merged : item));

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, [source]: updatedList } },
  });

  return NextResponse.json({ data: updatedList[index] });
}
