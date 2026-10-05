import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { locationSchema, type LocationValues } from "@/modules/shared/schema";

type Provenance =
  | { source: "APPLICATION"; sourceApplicationId?: string }
  | {
      source: "FIELD_DISCOVERY";
      discoveredByUserId: string;
      discoveredByName: string;
      discoveredAssignmentId: string;
    };

/**
 * Adds one location to Company.locations — the single source of truth for a company's
 * facilities. Used by Step 5 "Tambah Lokasi Baru" (APPLICATION) and the Surveyor's "Tambah
 * Lokasi Temuan Lapangan" (FIELD_DISCOVERY). The location must pass the same full validation as
 * a Company Profile save (documents included). Never removes or rewrites existing entries; an id
 * that collides with an existing location is replaced with a fresh one.
 */
export async function appendCompanyLocation(
  companyId: string,
  input: unknown,
  provenance: Provenance,
): Promise<{ ok: true; location: LocationValues } | { ok: false; status: number; error: string; issues?: unknown }> {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { locations: true } });
  if (!company) return { ok: false, status: 404, error: "Perusahaan tidak ditemukan" };

  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? "Data lokasi tidak valid", issues: parsed.error.issues };
  }

  const existing = (company.locations as LocationValues[] | null) ?? [];
  const id = existing.some((l) => l.id === parsed.data.id) || !parsed.data.id ? randomUUID() : parsed.data.id;
  const now = new Date().toISOString();
  const location: LocationValues = {
    ...parsed.data,
    id,
    // Application-only link fields never belong on the company's own entry.
    companyLocationId: undefined,
    capturedAt: undefined,
    ...(provenance.source === "APPLICATION"
      ? { source: "APPLICATION", sourceApplicationId: provenance.sourceApplicationId }
      : {
          source: "FIELD_DISCOVERY",
          discoveredByUserId: provenance.discoveredByUserId,
          discoveredByName: provenance.discoveredByName,
          discoveredAssignmentId: provenance.discoveredAssignmentId,
          discoveredAt: now,
          fieldVerificationStatus: "UNVERIFIED",
        }),
  };

  await db.company.update({ where: { id: companyId }, data: { locations: [...existing, location] } });
  return { ok: true, location };
}
