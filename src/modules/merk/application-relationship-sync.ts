import { db } from "@/lib/db";
import { resolveKonsumsiBrandContexts, type ChecklistKonsumsiBrandContext } from "@/modules/verifikator-workspace/konsumsi-brand-context";
import type { ApplicationBrandEntryValues, ProductGroupCertificateValues } from "@/modules/applications/viu-schemes/konsumsi/schema";

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
 * Only entries WITHOUT a `qualityTestId` (freshly uploaded, not referenced from an existing row)
 * get written — one upserted row per (merkId, commodityGroupId, sourceApplicationId). An entry
 * that referenced an existing certificate is intentionally skipped: that row already exists and is
 * already visible in Hasil Uji Mutu, so syncing it again would duplicate it.
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

  const freshCertificates = productGroupCertificates.filter((certificate) => !certificate.qualityTestId);
  const desiredGroupKeys = freshCertificates.map((certificate) => `${certificate.brandId}|${certificate.commodityGroupId}`);

  await db.$transaction(async (tx) => {
    // A certificate removed (or switched to "pilih existing") since the last sync — drop its
    // stale APPLICATION row. Never touches MANUAL rows or other applications' own rows.
    const existingAppRows = await tx.brandQualityTest.findMany({
      where: { sourceApplicationId: applicationId, sourceType: "APPLICATION" },
      select: { id: true, merkId: true, commodityGroupId: true },
    });
    const staleIds = existingAppRows
      .filter((row) => !desiredGroupKeys.includes(`${row.merkId}|${row.commodityGroupId}`))
      .map((row) => row.id);
    if (staleIds.length > 0) {
      await tx.brandQualityTest.deleteMany({ where: { id: { in: staleIds } } });
    }

    for (const certificate of freshCertificates) {
      await tx.brandQualityTest.upsert({
        where: {
          merkId_commodityGroupId_sourceApplicationId: {
            merkId: certificate.brandId,
            commodityGroupId: certificate.commodityGroupId,
            sourceApplicationId: applicationId,
          },
        },
        create: {
          merkId: certificate.brandId,
          commodityGroupId: certificate.commodityGroupId,
          certificateNumber: certificate.certificateNumber,
          laboratoryName: certificate.laboratoryName,
          issueDate: new Date(certificate.issueDate),
          expiryDate: certificate.validUntil ? new Date(certificate.validUntil) : null,
          filePath: certificate.filePath,
          fileName: certificate.fileName,
          sourceType: "APPLICATION",
          sourceApplicationId: applicationId,
        },
        update: {
          certificateNumber: certificate.certificateNumber,
          laboratoryName: certificate.laboratoryName,
          issueDate: new Date(certificate.issueDate),
          expiryDate: certificate.validUntil ? new Date(certificate.validUntil) : null,
          filePath: certificate.filePath,
          fileName: certificate.fileName,
        },
      });
    }
  });
}
