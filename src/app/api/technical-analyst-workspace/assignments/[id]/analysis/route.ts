import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { isAssignmentReviewable } from "@/modules/applications/assignment-review-state";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  buildCapacityRows,
  buildMachineChecklist,
  buildProductionQtyChecklist,
  buildRawMaterialConversionRows,
} from "@/modules/verifikator-workspace/schema";
import { ALL_TECHNICAL_MODULE_KEYS, TECHNICAL_MODULE_STATUSES } from "@/modules/technical-analyst-workspace/status";
import { technicalAnalysisDataSchema, technicalModuleDecisionSchema } from "@/modules/technical-analyst-workspace/schema";
import { MODAL_STATEMENT_LETTER_DOC_DEF } from "@/modules/applications/financial-capability-defs";
import { konsumsiProductTotal } from "@/modules/applications/viu-schemes/konsumsi/schema";

/**
 * VIU Barang Konsumsi's own import plan, straight from the application's Product Information step —
 * so the technical analyst never re-types it. Totals stay per currency (products may be priced in
 * USD/EUR/CNY/... and the system holds no exchange rate); the Surat Pernyataan's Jumlah Modal Kerja
 * (always Rupiah) comes along for the modal analysis.
 */
function buildKonsumsiImportPlan(payload: ApplicationWizardValues) {
  if (!payload.importTypes?.includes("BARANG_KONSUMSI")) return null;
  const products = (payload.konsumsiProducts ?? []).map((product) => {
    const total = konsumsiProductTotal(product);
    return {
      id: product.id,
      productName: product.productName,
      brandName: product.productSnapshot?.brandName ?? null,
      hsCode: product.hsCode,
      quantity: Number(product.quantity) || 0,
      stockQuantity: Number(product.stockQuantity) || 0,
      unit: product.unit ?? null,
      averageUnitPrice: Number(product.averageUnitPrice) || 0,
      currency: product.currency ?? "USD",
      total,
    };
  });
  const totalsByCurrency: Record<string, number> = {};
  for (const product of products) {
    totalsByCurrency[product.currency] = (totalsByCurrency[product.currency] ?? 0) + product.total;
  }
  return { products, totalsByCurrency, modalKerja: statementAmount(payload.konsumsiFinancialDocuments) };
}

/** Jumlah Modal Kerja declared on a Surat Pernyataan Kepemilikan Modal Kerja entry (digits-only Rupiah string). */
function statementAmount(docs: { key: string; amount?: string }[] | undefined): number | null {
  const statement = (docs ?? []).find((doc) => doc.key === MODAL_STATEMENT_LETTER_DOC_DEF.key);
  return statement?.amount ? Number(statement.amount.replace(/[^\d]/g, "")) || null : null;
}

/**
 * Every VIU scheme submits its own Surat Pernyataan Kepemilikan Modal Kerja — Bahan Baku Industri/Non Industri
 * in `nonIndustriDocuments`, Barang Konsumsi in `konsumsiFinancialDocuments` — so the modal analysis reads the
 * amount from the application instead of having the analyst re-type it.
 */
function buildModalKerjaFromApplication(payload: ApplicationWizardValues) {
  if (payload.importTypes === undefined || payload.importTypes.length === 0) return null;
  const types = new Set(payload.importTypes);
  const bahanBaku = types.has("BAHAN_BAKU_INDUSTRI") || types.has("BAHAN_BAKU_NON_INDUSTRI");
  return {
    bahanBaku: bahanBaku ? statementAmount(payload.nonIndustriDocuments) : null,
    konsumsi: types.has("BARANG_KONSUMSI") ? statementAmount(payload.konsumsiFinancialDocuments) : null,
  };
}

async function findOwnedAssignment(assignmentNumber: string, technicalAnalystId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.technicalReviewerId !== technicalAnalystId) return null;
  return assignment;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, technicalAnalystId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const technicalAnalysisData = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});

  return NextResponse.json({
    data: {
      status: assignment.status,
      reviewable: isAssignmentReviewable(assignment),
      verificationType: assignment.application.verificationType,
      importTypes: payload.importTypes ?? [],
      konsumsiImportPlan: buildKonsumsiImportPlan(payload),
      modalKerjaFromApplication: buildModalKerjaFromApplication(payload),
      technicalAnalysisData,
      machines: buildMachineChecklist(payload),
      electricityMonths: payload.electricityMonths ?? [],
      capacity: buildCapacityRows(payload),
      productionQty: buildProductionQtyChecklist(payload),
      rawMaterialConversion: buildRawMaterialConversionRows(payload),
    },
  });
}

const patchSchema = z.object({
  moduleKey: z.enum(ALL_TECHNICAL_MODULE_KEYS),
  status: z.enum(TECHNICAL_MODULE_STATUSES).optional(),
  keterangan: z.string().trim().optional(),
  kesimpulan: z.string().trim().optional(),
  inputs: z.record(z.string(), z.string()).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, technicalAnalystId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (!isAssignmentReviewable(assignment)) {
    return NextResponse.json(
      { error: "Analisis hanya dapat diisi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const data = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});
  const existing = data[parsed.data.moduleKey];
  const merged = technicalModuleDecisionSchema.parse({
    status: parsed.data.status ?? existing?.status ?? "PENDING",
    keterangan: parsed.data.keterangan ?? existing?.keterangan,
    kesimpulan: parsed.data.kesimpulan ?? existing?.kesimpulan,
    inputs: { ...existing?.inputs, ...parsed.data.inputs },
  });
  data[parsed.data.moduleKey] = merged;

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: { technicalAnalysisData: data },
  });

  return NextResponse.json({ data: updated.technicalAnalysisData });
}
