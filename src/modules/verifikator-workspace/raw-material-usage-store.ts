import { db } from "@/lib/db";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

import {
  buildRawMaterialUsageChecklist,
  productionQtyVerificationsSchema,
  remapRawMaterialUsageDecisions,
} from "./schema";

type AssignmentWithPayload = {
  id: string;
  applicationId: string;
  productionQtyVerifications: unknown;
  application: { payload: unknown };
};

/**
 * Saves a change to the raw material arrays of an application payload (rawMaterials,
 * rawMaterialConversions, rawMaterialUsage) and, in the same transaction, moves the
 * verifikator's per-row Penggunaan / Stok / Rencana Kebutuhan decisions to the rows' new ids —
 * see remapRawMaterialUsageDecisions.
 */
export async function saveRawMaterialPayload(assignment: AssignmentWithPayload, nextPayload: ApplicationWizardValues) {
  const previous = assignment.application.payload as ApplicationWizardValues;
  const decisions = productionQtyVerificationsSchema.parse(assignment.productionQtyVerifications ?? {});
  const remapped = remapRawMaterialUsageDecisions(
    buildRawMaterialUsageChecklist(previous),
    buildRawMaterialUsageChecklist(nextPayload),
    decisions,
  );
  const decisionsChanged = JSON.stringify(remapped) !== JSON.stringify(decisions);

  await db.$transaction([
    db.application.update({ where: { id: assignment.applicationId }, data: { payload: nextPayload } }),
    ...(decisionsChanged
      ? [db.assignment.update({ where: { id: assignment.id }, data: { productionQtyVerifications: remapped } })]
      : []),
  ]);
}
