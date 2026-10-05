import { db } from "@/lib/db";

import type { ApplicationWizardValues } from "../../../schema";
import type { ApplicationKonsumsiProductValues } from "../schema";

function normalizeHsCode(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "");
}

type MasterRow = Awaited<ReturnType<typeof loadMasterRows>>[number];

async function loadMasterRows(where: { id?: { in: string[] }; status?: "ACTIVE" }) {
  return db.hsCodeMasterData.findMany({
    where,
    include: {
      commodityGroup: { include: { industryGroup: true } },
      commoditySubGroup: true,
      unitOfMeasurement: true,
    },
  });
}

function withMasterChain(product: ApplicationKonsumsiProductValues, row: MasterRow): ApplicationKonsumsiProductValues {
  const movedFrom =
    product.commodityGroupId && product.commodityGroupId !== row.commodityGroupId
      ? product.commodityName || product.commodityGroupId
      : product.commodityGroupChangedFrom;
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
    ...(movedFrom ? { commodityGroupChangedFrom: movedFrom } : {}),
  };
}

const CHAIN_FIELDS = [
  "hsCodeId",
  "hsCode",
  "commoditySubGroupId",
  "commoditySubGroupName",
  "commodityGroupId",
  "commodityName",
  "industryGroupId",
  "industryName",
  "commodityGroupChangedFrom",
] as const;

/**
 * Re-derives every Konsumsi product's commodity chain (Sub Kelompok, Komoditas, Kelompok) from the
 * CURRENT HS Code master data — the same source `validateKonsumsiSubmit` groups by at submit — so
 * the Step 9 matrix and the server can never disagree about which Merek x Sub Kelompok groups
 * exist (an admin may move an HS Code to another Sub Kelompok after products were entered).
 *
 *   - A product with `hsCodeId` is re-read from that master row (whatever its status; an inactive
 *     row is still reported by name at submit).
 *   - A product with only an `hsCode` string (pre-refactor Excel importer / old product form) is
 *     matched against ACTIVE master rows on digits only ("6212.10.19" == "62121019").
 *   - A product whose Sub Kelompok changed is moved to the master-data group and marked
 *     `commodityGroupChangedFrom` (old name) for the "Sub Kelompok diperbarui" notice; its group
 *     then shows its own certificate status in the matrix.
 * Products whose HS Code can't be found are left untouched (Step 9 validation names them).
 * Server-only (needs the DB). Idempotent; a payload with nothing to change is returned as-is.
 */
export async function resyncKonsumsiProductCommodities(
  payload: ApplicationWizardValues,
  options: { onlyMissingHsCodeId?: boolean } = {},
): Promise<ApplicationWizardValues> {
  const products = (payload.konsumsiProducts ?? []) as ApplicationKonsumsiProductValues[];
  const skip = (product: ApplicationKonsumsiProductValues) => Boolean(options.onlyMissingHsCodeId && product.hsCodeId);
  if (products.every(skip)) return payload;

  const ids = [...new Set(products.filter((product) => !skip(product)).map((product) => product.hsCodeId).filter(Boolean))];
  const needsCodeLookup = products.some((product) => !product.hsCodeId && normalizeHsCode(product.hsCode));
  const [byIdRows, activeRows] = await Promise.all([
    ids.length > 0 ? loadMasterRows({ id: { in: ids } }) : Promise.resolve([]),
    needsCodeLookup ? loadMasterRows({ status: "ACTIVE" }) : Promise.resolve([]),
  ]);
  const byId = new Map(byIdRows.map((row) => [row.id, row]));
  const byCode = new Map(activeRows.map((row) => [normalizeHsCode(row.hsCode), row]));

  let changed = false;
  const konsumsiProducts = products.map((product) => {
    if (skip(product)) return product;
    const row = product.hsCodeId ? byId.get(product.hsCodeId) : byCode.get(normalizeHsCode(product.hsCode));
    if (!row) return product;
    const next = withMasterChain(product, row);
    if (CHAIN_FIELDS.some((field) => (next[field] ?? "") !== (product[field] ?? ""))) {
      changed = true;
      return next;
    }
    return product;
  });

  return changed ? { ...payload, konsumsiProducts } : payload;
}

/**
 * Read-only views of a SUBMITTED application (CR / Verifikator): only fills in products that have
 * no `hsCodeId` at all (pre-refactor rows), never regroups products the server already resolved at
 * submit. Editable payloads (draft, revision, Admin edit) use `resyncKonsumsiProductCommodities`.
 */
export function backfillKonsumsiHsCodes(payload: ApplicationWizardValues): Promise<ApplicationWizardValues> {
  return resyncKonsumsiProductCommodities(payload, { onlyMissingHsCodeId: true });
}
