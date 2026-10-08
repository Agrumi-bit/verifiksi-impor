import "server-only";

import { db } from "@/lib/db";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import type { LocationValues } from "@/modules/shared/schema";
import { applyChecklistDocumentPath } from "@/modules/applications/document-versions";

/**
 * Location document rows (`location:{id}:…`) are read from the LIVE Company.locations entry when it
 * exists (see buildDocumentChecklist). A replacement uploaded by CR/Verifikator therefore has to land
 * there too — writing only `payload.locations` left the row on the old (or empty) file. No-op for
 * other keys or when the company profile doesn't hold that location.
 */
export async function syncLocationDocumentToCompany(companyId: string | null | undefined, key: string, path: string): Promise<void> {
  if (!companyId || !key.startsWith("location:")) return;
  const locationId = key.split(":")[1];
  const company = await db.company.findUnique({ where: { id: companyId }, select: { locations: true } });
  const locations = (company?.locations as LocationValues[] | null) ?? [];
  if (!locations.some((loc) => loc.id === locationId)) return;
  const updated = applyChecklistDocumentPath({ locations } as ApplicationWizardValues, key, path).locations;
  await db.company.update({ where: { id: companyId }, data: { locations: updated } });
}
