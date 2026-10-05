import { db } from "@/lib/db";
import { resolveKonsumsiBrandContexts, type ChecklistKonsumsiBrandContext } from "@/modules/verifikator-workspace/konsumsi-brand-context";
import type { ApplicationBrandEntryValues, ProductGroupCertificateValues } from "@/modules/applications/viu-schemes/konsumsi/schema";
import { groupSharedCertificates } from "@/modules/applications/viu-schemes/konsumsi/shared-certificates";

type SyncInput = {
  applicationId: string;
  companyId: string | null;
  companyName: string;
  applicationBrands: ApplicationBrandEntryValues[];
};

/**
 * Keeps `MerkImporter` in sync with a VIU Konsumsi application's own `applicationBrands[]` —
 * the applicant's relationship to a Brand (Pemilik Merek / Perwakilan Resmi / Hanya Bertindak
 * sebagai Importir), established per-application via `applicantRole`, never by Brand Master
 * ownership (see MerkImporter's own schema comment). Called at submit and at every subsequent
 * non-draft save of the same application (resubmission after RETURNED, etc.) — never for a
 * DRAFT, since a draft's brand list isn't final yet.
 *
 * Read-then-write: `resolveKonsumsiBrandContexts` (a plain `db` read, same resolver the
 * Customer Relation Workspace "Dokumen Merek" checklist already uses — see that module's own
 * comment) runs first to get each entry's actually-required relationship document code, via the
 * same `getVIUConsumptionBrandRequirements` rule engine Step 6/submit validation use — never a
 * second, independently-guessed document-key mapping. The upsert/delete pass that follows runs
 * inside one transaction so a partial brand list can never persist if a later row's write fails.
 *
 * No-op when `companyId` is null (nothing to attribute the relationship to) or
 * `applicationBrands` is empty (not a Konsumsi application, or no brands yet).
 */
export async function syncMerkRelationshipsForApplication({
  applicationId,
  companyId,
  companyName,
  applicationBrands,
}: SyncInput): Promise<void> {
  if (!companyId || applicationBrands.length === 0) return;

  const brandContexts = await resolveKonsumsiBrandContexts(applicationBrands);
  const contextByBrandId = new Map<string, ChecklistKonsumsiBrandContext>(brandContexts.map((c) => [c.brandId, c]));
  const desiredBrandIds = applicationBrands.map((entry) => entry.brandId);

  await db.$transaction(async (tx) => {
    // Brand removed from this application since the last sync — drop its stale relationship row.
    // Never touches MANUAL rows (sourceType filter) or other applications' own rows.
    await tx.merkImporter.deleteMany({
      where: {
        sourceApplicationId: applicationId,
        sourceType: "APPLICATION",
        merkId: { notIn: desiredBrandIds },
      },
    });

    for (const entry of applicationBrands) {
      const context = contextByBrandId.get(entry.brandId);
      // Whichever relationship document this entry's role/scenario actually requires (OWNER
      // requires none — see getVIUConsumptionBrandRequirements) — never a hardcoded key guess.
      const requiredCode = context?.requiredRelationshipDocuments[0]?.code;
      const document = requiredCode ? entry.relationshipDocuments?.[requiredCode] : undefined;

      await tx.merkImporter.upsert({
        where: {
          merkId_companyId_sourceApplicationId: {
            merkId: entry.brandId,
            companyId,
            sourceApplicationId: applicationId,
          },
        },
        create: {
          merkId: entry.brandId,
          companyId,
          companyName,
          role: entry.applicantRole,
          appointmentSource: entry.appointmentSource ?? null,
          authorizationDocumentPath: document?.filePath ?? null,
          authorizationDocumentName: document?.fileName ?? null,
          sourceType: "APPLICATION",
          sourceApplicationId: applicationId,
        },
        update: {
          // Keep this synced too — a company only ever renames via its own Company Workspace
          // profile, but a stale name here would otherwise never self-correct.
          companyName,
          role: entry.applicantRole,
          appointmentSource: entry.appointmentSource ?? null,
          authorizationDocumentPath: document?.filePath ?? null,
          authorizationDocumentName: document?.fileName ?? null,
        },
      });
    }
  });
}

/**
 * Keeps `BrandQualityTest` in sync with a VIU Konsumsi application's own
 * `productGroupCertificates[]` — see that schema's own comment, and that model's own comment for
 * the sync contract. Called at submit and at every subsequent non-draft save of the same
 * application, same lifecycle as `syncMerkRelationshipsForApplication` above — never for a DRAFT.
 *
 * Entries are grouped by certificate identity (shared-certificates.ts): one certificate used by N
 * Sub Kelompok becomes ONE row — primary `commodityGroupId` = its first group — plus coverage rows
 * for the other N-1 groups, never N copies.
 *   - A freshly uploaded certificate (no `qualityTestId`) is upserted per
 *     (merkId, primary commodityGroupId, sourceApplicationId).
 *   - A certificate picked from an existing row is never duplicated; only the groups it now also
 *     covers in this application are added as coverage rows (tagged with this application).
 * Rows and coverages this application added that are no longer used are removed; MANUAL rows and
 * other applications' rows/coverages are never touched.
 *
 * No-op when `productGroupCertificates` is empty (not a Konsumsi application, or no certificates
 * attached yet).
 */
export async function syncQualityTestCertificatesForApplication({
  applicationId,
  productGroupCertificates,
}: {
  applicationId: string;
  productGroupCertificates: ProductGroupCertificateValues[];
}): Promise<void> {
  if (productGroupCertificates.length === 0) return;

  const buckets = groupSharedCertificates(productGroupCertificates);
  const freshBuckets = buckets.filter((bucket) => !bucket[0].qualityTestId);
  const pickedBuckets = buckets.filter((bucket) => Boolean(bucket[0].qualityTestId));
  const desiredPrimaryKeys = new Set(freshBuckets.map((bucket) => `${bucket[0].brandId}|${bucket[0].commodityGroupId}`));

  await db.$transaction(async (tx) => {
    // A certificate removed (or switched to "pilih existing") since the last sync — drop its
    // stale APPLICATION row (its coverages cascade). Never touches MANUAL rows or other
    // applications' own rows.
    const existingAppRows = await tx.brandQualityTest.findMany({
      where: { sourceApplicationId: applicationId, sourceType: "APPLICATION" },
      select: { id: true, merkId: true, commodityGroupId: true },
    });
    const staleIds = existingAppRows
      .filter((row) => !desiredPrimaryKeys.has(`${row.merkId}|${row.commodityGroupId}`))
      .map((row) => row.id);
    if (staleIds.length > 0) {
      await tx.brandQualityTest.deleteMany({ where: { id: { in: staleIds } } });
    }

    const desiredCoverages: { qualityTestId: string; commodityGroupId: string }[] = [];

    for (const bucket of freshBuckets) {
      const [certificate, ...others] = bucket;
      const data = {
        certificateNumber: certificate.certificateNumber,
        laboratoryName: certificate.laboratoryName,
        issueDate: new Date(certificate.issueDate),
        expiryDate: certificate.validUntil ? new Date(certificate.validUntil) : null,
        filePath: certificate.filePath,
        fileName: certificate.fileName,
      };
      const row = await tx.brandQualityTest.upsert({
        where: {
          merkId_commodityGroupId_sourceApplicationId: {
            merkId: certificate.brandId,
            commodityGroupId: certificate.commodityGroupId,
            sourceApplicationId: applicationId,
          },
        },
        create: {
          ...data,
          merkId: certificate.brandId,
          commodityGroupId: certificate.commodityGroupId,
          sourceType: "APPLICATION",
          sourceApplicationId: applicationId,
        },
        update: data,
        select: { id: true },
      });
      for (const other of others) {
        if (other.commodityGroupId !== certificate.commodityGroupId) {
          desiredCoverages.push({ qualityTestId: row.id, commodityGroupId: other.commodityGroupId });
        }
      }
    }

    const pickedIds = pickedBuckets.map((bucket) => bucket[0].qualityTestId!);
    const pickedRows = pickedIds.length > 0
      ? await tx.brandQualityTest.findMany({ where: { id: { in: pickedIds } }, select: { id: true, merkId: true, commodityGroupId: true } })
      : [];
    const pickedById = new Map(pickedRows.map((row) => [row.id, row]));
    for (const bucket of pickedBuckets) {
      const row = pickedById.get(bucket[0].qualityTestId!);
      if (!row) continue;
      for (const entry of bucket) {
        if (entry.brandId === row.merkId && entry.commodityGroupId !== row.commodityGroupId) {
          desiredCoverages.push({ qualityTestId: row.id, commodityGroupId: entry.commodityGroupId });
        }
      }
    }

    const desiredCoverageKeys = new Set(desiredCoverages.map((c) => `${c.qualityTestId}|${c.commodityGroupId}`));
    const existingCoverages = await tx.brandQualityTestCoverage.findMany({
      where: { sourceApplicationId: applicationId },
      select: { id: true, qualityTestId: true, commodityGroupId: true },
    });
    const staleCoverageIds = existingCoverages
      .filter((c) => !desiredCoverageKeys.has(`${c.qualityTestId}|${c.commodityGroupId}`))
      .map((c) => c.id);
    if (staleCoverageIds.length > 0) {
      await tx.brandQualityTestCoverage.deleteMany({ where: { id: { in: staleCoverageIds } } });
    }
    if (desiredCoverages.length > 0) {
      await tx.brandQualityTestCoverage.createMany({
        data: desiredCoverages.map((c) => ({ ...c, sourceApplicationId: applicationId })),
        skipDuplicates: true,
      });
    }
  });
}
