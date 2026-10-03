import { db } from "@/lib/db";

import type { ApplicationWizardValues } from "../../../schema";
import type { ApplicationKonsumsiProductValues } from "../schema";

function normalizeHsCode(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Konsumsi products saved by the pre-refactor Excel importer (or the old product form) carry only
 * the HS Code *string* — no `hsCodeId`, no `commoditySubGroupId` — and their `commodityGroupId`
 * was taken from whatever group the user had open at the time, not from master data. The current
 * `konsumsiProductSchema` requires `hsCodeId`, so such a draft fails Step 9 validation forever
 * (the user can't see why: the table has nowhere to render a per-row hsCodeId error).
 *
 * This resolves every product that has an `hsCode` but no `hsCodeId` against ACTIVE
 * `HsCodeMasterData` (matched on digits only, so "6212.10.19" == "62121019") and fills the whole
 * commodity chain from master data — HS Code is the single source of truth for the chain, so a
 * product whose stored group disagrees with master data is MOVED to the master-data group (its
 * Merek x Sub Kelompok group then shows its own certificate status in the matrix).
 *
 * Products whose HS Code isn't found / isn't ACTIVE are left untouched; Step 9 validation then
 * reports them by name. Server-only (needs the DB). Idempotent: products that already have an
 * `hsCodeId` are never touched, and a payload with nothing to fix is returned as-is.
 */
export async function backfillKonsumsiHsCodes(payload: ApplicationWizardValues): Promise<ApplicationWizardValues> {
  const products = (payload.konsumsiProducts ?? []) as ApplicationKonsumsiProductValues[];
  const needsFix = products.filter((product) => !product.hsCodeId && normalizeHsCode(product.hsCode));
  if (needsFix.length === 0) return payload;

  const rows = await db.hsCodeMasterData.findMany({
    where: { status: "ACTIVE" },
    include: {
      commodityGroup: { include: { industryGroup: true } },
      commoditySubGroup: true,
      unitOfMeasurement: true,
    },
  });
  const byCode = new Map(rows.map((row) => [normalizeHsCode(row.hsCode), row]));

  const konsumsiProducts = products.map((product) => {
    if (product.hsCodeId) return product;
    const row = byCode.get(normalizeHsCode(product.hsCode));
    if (!row) return product;
    return {
      ...product,
      hsCodeId: row.id,
      hsCode: row.hsCode,
      hsDescription: product.hsDescription || row.description,
      unit: row.unitOfMeasurement?.symbol || row.unitOfMeasurement?.name || product.unit || "",
      commoditySubGroupId: row.commoditySubGroupId,
      commoditySubGroupName: row.commoditySubGroup.name,
      commodityGroupId: row.commodityGroupId,
      commodityName: row.commodityGroup.name,
      industryGroupId: row.commodityGroup.industryGroupId ?? "",
      industryName: row.commodityGroup.industryGroup?.name ?? "",
    };
  });

  return { ...payload, konsumsiProducts };
}
