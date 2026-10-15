import type { Prisma } from "@/generated/prisma/client";

import { isAssignmentReviewable } from "@/modules/applications/assignment-review-state";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildKonsumsiImportPlan, buildModalKerjaFromApplication } from "@/modules/applications/viu-import-plan";
import {
  buildCapacityRows,
  buildMachineChecklist,
  buildProductionQtyChecklist,
  buildRawMaterialConversionRows,
  buildRawMaterialUsageChecklist,
} from "@/modules/verifikator-workspace/schema";
import { technicalAnalysisDataSchema } from "../schema";

/**
 * Everything the Analisis Teknis modules read — shared by the Technical Analyst's own Analysis tab
 * and the Project Manager's read-only Analisis tab.
 */
export function buildAnalysisData(assignment: Prisma.AssignmentGetPayload<{ include: { application: true } }>) {
  const payload = assignment.application.payload as ApplicationWizardValues;
  return {
    status: assignment.status,
    reviewable: isAssignmentReviewable(assignment),
    verificationType: assignment.application.verificationType,
    importTypes: payload.importTypes ?? [],
    konsumsiImportPlan: buildKonsumsiImportPlan(payload),
    modalKerjaFromApplication: buildModalKerjaFromApplication(payload),
    technicalAnalysisData: technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {}),
    machines: buildMachineChecklist(payload),
    electricityMonths: payload.electricityMonths ?? [],
    capacity: buildCapacityRows(payload),
    productionQty: buildProductionQtyChecklist(payload),
    rawMaterialConversion: buildRawMaterialConversionRows(payload),
    rawMaterialUsage: buildRawMaterialUsageChecklist(payload),
  };
}
