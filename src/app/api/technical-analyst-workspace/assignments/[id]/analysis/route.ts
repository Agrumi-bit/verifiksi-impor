import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  buildCapacityRows,
  buildMachineChecklist,
  buildProductionQtyChecklist,
  buildRawMaterialConversionRows,
} from "@/modules/verifikator-workspace/schema";
import { TECHNICAL_MODULE_STATUSES, VIU_MODULE_KEYS, VKI_MODULE_KEYS } from "@/modules/technical-analyst-workspace/status";
import { technicalAnalysisDataSchema, technicalModuleDecisionSchema } from "@/modules/technical-analyst-workspace/schema";

async function findOwnedAssignment(assignmentNumber: string, technicalAnalystId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.technicalReviewerId !== technicalAnalystId) return null;
  return assignment;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const technicalAnalystId = session?.user.id;
  if (!technicalAnalystId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      verificationType: assignment.application.verificationType,
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
  moduleKey: z.enum([...VKI_MODULE_KEYS, ...VIU_MODULE_KEYS]),
  status: z.enum(TECHNICAL_MODULE_STATUSES).optional(),
  keterangan: z.string().trim().optional(),
  kesimpulan: z.string().trim().optional(),
  inputs: z.record(z.string(), z.string()).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const technicalAnalystId = session?.user.id;
  if (!technicalAnalystId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, technicalAnalystId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
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
