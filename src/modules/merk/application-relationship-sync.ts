import { db } from "@/lib/db";
import { resolveKonsumsiBrandContexts, type ChecklistKonsumsiBrandContext } from "@/modules/verifikator-workspace/konsumsi-brand-context";
import type { ApplicationBrandEntryValues } from "@/modules/applications/viu-schemes/konsumsi/schema";

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
