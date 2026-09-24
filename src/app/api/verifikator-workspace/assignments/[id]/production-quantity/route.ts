import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  PRODUCTION_QTY_VERIFICATION_STATUSES,
  PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY,
  PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY,
  PRODUCTION_QTY_STOK_SUMMARY_KEY,
  PRODUCTION_QTY_KONVERSI_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY,
  PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY,
  rawMaterialUsageRowKey,
} from "@/modules/verifikator-workspace/status";

import {
  buildCapacityRows,
  buildProductionQtyChecklist,
  buildRawMaterialUsageChecklist,
  buildRawMaterialConversionRows,
  buildSalesChecklist,
  productionQtyVerificationsSchema,
} from "@/modules/verifikator-workspace/schema";

const SUMMARY_KEYS: string[] = [
  PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY,
  PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY,
  PRODUCTION_QTY_STOK_SUMMARY_KEY,
  PRODUCTION_QTY_KONVERSI_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY,
  PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY,
];

function summaryConclusion(decisions: ReturnType<typeof productionQtyVerificationsSchema.parse>, key: string) {
  return {
    status: decisions[key]?.status ?? "PENDING",
    keterangan: decisions[key]?.keterangan ?? "",
    kesimpulan: decisions[key]?.kesimpulan ?? "",
    verifiedAt: decisions[key]?.verifiedAt ?? null,
  };
}

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
  const capacity = buildCapacityRows(payload);
  const checklist = buildProductionQtyChecklist(payload);
  const decisions = productionQtyVerificationsSchema.parse(assignment.productionQtyVerifications ?? {});
  const rawMaterialUsage = buildRawMaterialUsageChecklist(payload);
  const rawMaterialConversion = buildRawMaterialConversionRows(payload);
  const sales = buildSalesChecklist(payload);
  const capacityDocumentPath = payload.capacityDocumentPath ?? null;

  return NextResponse.json({
    data: {
      capacity,
      capacityDocumentPath,
      rows: checklist.map((item) => ({
        ...item,
        status: decisions[item.key]?.status ?? "PENDING",
        keterangan: decisions[item.key]?.keterangan ?? "",
        verifiedAt: decisions[item.key]?.verifiedAt ?? null,
      })),
      rawMaterialUsage: rawMaterialUsage.map((r) => ({
        ...r,
        penggunaanStatus: decisions[rawMaterialUsageRowKey("penggunaan", r.id)]?.status ?? "PENDING",
        penggunaanKeterangan: decisions[rawMaterialUsageRowKey("penggunaan", r.id)]?.keterangan ?? "",
        stokStatus: decisions[rawMaterialUsageRowKey("stok", r.id)]?.status ?? "PENDING",
        stokKeterangan: decisions[rawMaterialUsageRowKey("stok", r.id)]?.keterangan ?? "",
        rencanaKebutuhanStatus: decisions[rawMaterialUsageRowKey("rencana-kebutuhan", r.id)]?.status ?? "PENDING",
        rencanaKebutuhanKeterangan: decisions[rawMaterialUsageRowKey("rencana-kebutuhan", r.id)]?.keterangan ?? "",
      })),
      rawMaterialConversion,
      sales,
      sebelumnyaConclusion: summaryConclusion(decisions, PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY),
      penggunaanConclusion: summaryConclusion(decisions, PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY),
      stokConclusion: summaryConclusion(decisions, PRODUCTION_QTY_STOK_SUMMARY_KEY),
      konversiConclusion: summaryConclusion(decisions, PRODUCTION_QTY_KONVERSI_SUMMARY_KEY),
      rencanaConclusion: summaryConclusion(decisions, PRODUCTION_QTY_RENCANA_SUMMARY_KEY),
      rencanaKebutuhanConclusion: summaryConclusion(decisions, PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY),
      penjualanConclusion: summaryConclusion(decisions, PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY),
    },
  });
}

const patchSchema = z.object({
  key: z.string().min(1),
  status: z.enum(PRODUCTION_QTY_VERIFICATION_STATUSES),
  keterangan: z.string().trim().optional(),
  kesimpulan: z.string().trim().optional(),
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
      { error: "Jumlah produksi hanya dapat diverifikasi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const validKeys = new Set(buildProductionQtyChecklist(payload).map((item) => item.key));
  const rawMaterialUsage = buildRawMaterialUsageChecklist(payload);
  for (const r of rawMaterialUsage) {
    validKeys.add(rawMaterialUsageRowKey("penggunaan", r.id));
    validKeys.add(rawMaterialUsageRowKey("stok", r.id));
    validKeys.add(rawMaterialUsageRowKey("rencana-kebutuhan", r.id));
  }
  if (!SUMMARY_KEYS.includes(parsed.data.key) && !validKeys.has(parsed.data.key)) {
    return NextResponse.json({ error: "Baris tidak dikenali" }, { status: 400 });
  }

  const decisions = productionQtyVerificationsSchema.parse(assignment.productionQtyVerifications ?? {});
  const existing = decisions[parsed.data.key];
  decisions[parsed.data.key] = {
    status: parsed.data.status,
    keterangan: parsed.data.keterangan ?? existing?.keterangan,
    kesimpulan: parsed.data.kesimpulan ?? existing?.kesimpulan,
    verifiedAt: new Date().toISOString(),
  };

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: { productionQtyVerifications: decisions },
  });

  return NextResponse.json({ data: updated.productionQtyVerifications });
}
