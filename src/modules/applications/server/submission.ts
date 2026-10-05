import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { applicationSubmitSchema, type ApplicationWizardValues, type LocationValues } from "@/modules/applications/schema";
import { findDisallowedViuImportType, viuKbliRequirementMessage } from "@/modules/applications/viu-kbli-requirements";
import { konsumsiScheme } from "@/modules/applications/viu-schemes/konsumsi/registry";
import { syncMerkRelationshipsForApplication, syncQualityTestCertificatesForApplication } from "@/modules/merk/application-relationship-sync";

/**
 * Everything an application goes through on its way into the database — shared by the submit
 * endpoint (POST /api/applications) and Admin edit (PUT /api/applications/[id]) so an edited
 * application is held to exactly the same rules and side effects as a submitted one.
 */

/**
 * Schemes with a registered DB-aware server validator — only Konsumsi for
 * now (Industri/Non-Industri aren't separated into scheme modules yet, see
 * the VIU Konsumsi implementation plan). Each validator may return a
 * replacement `applicationBrands`-shaped slice of `values` (e.g. Konsumsi
 * attaches a server-built submission snapshot) — when it does, that
 * replacement is what gets persisted, never the client-submitted payload
 * for that slice.
 */
const REGISTERED_VIU_SCHEMES = [konsumsiScheme];

type PrepareResult = { ok: true; values: ApplicationWizardValues } | { ok: false; response: NextResponse };

/**
 * Re-captures every application location from the live company profile before validation:
 * an entry linked to a Company.locations entry (by companyLocationId, else by its own id) is
 * replaced by that entry's current data, so what gets submitted is exactly what the profile says
 * today; `capturedAt` stamps the snapshot. Entries with no matching company location (legacy
 * application-only locations) are kept as they are, just stamped.
 */
async function refreshLocationSnapshots(body: unknown): Promise<unknown> {
  if (!body || typeof body !== "object") return body;
  const raw = body as { companyId?: unknown; locations?: unknown };
  if (typeof raw.companyId !== "string" || !Array.isArray(raw.locations)) return body;

  const company = await db.company.findUnique({ where: { id: raw.companyId }, select: { locations: true } });
  const live = new Map(((company?.locations as LocationValues[] | null) ?? []).map((loc) => [loc.id, loc]));
  const capturedAt = new Date().toISOString();
  const locations = (raw.locations as Partial<LocationValues>[]).map((loc) => {
    const linkedId = loc.companyLocationId || loc.id;
    const current = linkedId ? live.get(linkedId) : undefined;
    return current ? { ...current, companyLocationId: current.id, capturedAt } : { ...loc, capturedAt };
  });
  return { ...raw, locations };
}

/**
 * Validates a wizard payload and returns the values to persist. `authorize` runs right after the
 * schema parse, before any DB-backed rule, so a caller can refuse (e.g. wrong company) without
 * revealing anything else about the payload.
 */
export async function prepareApplicationSubmission(
  wizardBody: unknown,
  authorize?: (values: ApplicationWizardValues) => NextResponse | null,
): Promise<PrepareResult> {
  // Discriminated by verificationType — the authoritative gate, structurally unable to run
  // a VIU-only rule against a VKI payload (see applicationSubmitSchema's own comment).
  const parsed = applicationSubmitSchema.safeParse(await refreshLocationSnapshots(wizardBody));
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Data tidak valid", issues: z.treeifyError(parsed.error) }, { status: 400 }),
    };
  }

  let values: ApplicationWizardValues = parsed.data;

  const denied = authorize?.(values);
  if (denied) return { ok: false, response: denied };

  // The schema checked the VIU type ↔ KBLI rule against the payload's own company snapshot;
  // re-check it against the Company row so a stale or edited payload can't bypass it.
  if (values.verificationType === "VIU" && values.companyId) {
    const company = await db.company.findUnique({
      where: { id: values.companyId },
      select: { apiType: true, kbliEntries: true },
    });
    const companyKbli = Array.isArray(company?.kbliEntries) ? (company.kbliEntries as { code: string; category?: "UTAMA" | "PENDUKUNG" }[]) : [];
    const disallowed = company ? findDisallowedViuImportType(values.importTypes, company.apiType, companyKbli) : undefined;
    if (disallowed) {
      return { ok: false, response: NextResponse.json({ error: viuKbliRequirementMessage(disallowed) }, { status: 400 }) };
    }
  }

  // The generic `products` list is only meaningful for Bahan Baku Industri/Non Industri — a
  // Barang-Konsumsi-only (or VKI-only-fields-irrelevant) submission may still carry a stray
  // leftover row (e.g. an empty default item from before this list stopped requiring
  // materialType/hsCode unconditionally); normalize it away before persisting rather than storing
  // dead data forever. Validation already passed either way — this is cleanup, not a gate.
  if (
    values.verificationType === "VIU" &&
    !values.importTypes.includes("BAHAN_BAKU_INDUSTRI") &&
    !values.importTypes.includes("BAHAN_BAKU_NON_INDUSTRI")
  ) {
    values = { ...values, products: [] };
  }

  // Run every registered scheme's server-side validator whose key is
  // actually enabled on this application — never the client's own computed
  // readiness/document count/brand metadata. A scheme's validator may
  // return a server-authoritative replacement for its own slice of
  // `values` (Konsumsi attaches a submission snapshot to each brand entry
  // here); when it does, that replacement is what gets persisted below.
  for (const scheme of REGISTERED_VIU_SCHEMES) {
    if (!values.importTypes.includes(scheme.key)) continue;
    const result = await scheme.validateServerSide(values);
    if ("error" in result) {
      return { ok: false, response: NextResponse.json({ error: result.error }, { status: 400 }) };
    }
    values = {
      ...values,
      applicationBrands: result.applicationBrands,
      konsumsiProducts: result.konsumsiProducts,
      productGroupCertificates: result.productGroupCertificates,
    };
  }

  return { ok: true, values };
}

const locationKey = (loc: LocationValues) => `${loc.locationType}::${loc.address}`;

/**
 * A wizard applicant can add a new facility (e.g. Pabrik) directly in the
 * application's Location step without ever visiting Company Profile — that
 * facility only lives in Application.payload.locations until we mirror it
 * back here. Existing facilities are left untouched; only genuinely new
 * ones (by locationType+address) get appended.
 */
async function syncNewFacilitiesToCompany(companyId: string, submittedLocations: LocationValues[]): Promise<void> {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { locations: true } });
  if (!company) return;

  const existingLocations = (company.locations as LocationValues[] | null) ?? [];
  const existingKeys = new Set(existingLocations.map(locationKey));
  const newLocations = submittedLocations.filter((loc) => !existingKeys.has(locationKey(loc)));
  if (newLocations.length === 0) return;

  await db.company.update({
    where: { id: companyId },
    data: { locations: [...existingLocations, ...newLocations] },
  });
}

/** Side effects of every non-draft write of an application's payload (submit, resubmit, Admin edit). */
export async function runApplicationSubmissionSyncs(applicationId: string, values: ApplicationWizardValues): Promise<void> {
  if (values.companyId) {
    await syncNewFacilitiesToCompany(values.companyId, values.locations);
  }
  await syncMerkRelationshipsForApplication({
    applicationId,
    companyId: values.companyId,
    companyName: values.companyName,
    applicationBrands: values.applicationBrands ?? [],
  });
  await syncQualityTestCertificatesForApplication({
    applicationId,
    productGroupCertificates: values.productGroupCertificates ?? [],
  });
}
