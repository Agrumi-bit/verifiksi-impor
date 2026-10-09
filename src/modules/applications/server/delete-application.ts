import { db } from "@/lib/db";

export type ApplicationDeletionSummary = {
  applicationNumber: string;
  assignments: number;
  locationVisits: number;
  surveyReports: number;
  messages: number;
  documentVersions: number;
  auditLogs: number;
  /** Merk/Uji Mutu rows that only get their link to this application cleared, never deleted. */
  unlinkedBrandRows: number;
};

/** What a delete would remove, for the confirmation dialog — counts only, no writes. */
export async function previewApplicationDeletion(applicationId: string): Promise<ApplicationDeletionSummary | null> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { id: true, applicationNumber: true },
  });
  if (!application) return null;

  const assignmentIds = (await db.assignment.findMany({ where: { applicationId }, select: { id: true } })).map((a) => a.id);

  const [locationVisits, surveyReports, messages, documentVersions, auditLogs, merkImporters, qualityTests] = await Promise.all([
    db.locationVisit.count({ where: { applicationId } }),
    assignmentIds.length > 0 ? db.surveyReport.count({ where: { assignmentId: { in: assignmentIds } } }) : Promise.resolve(0),
    db.applicationMessage.count({ where: { applicationId } }),
    db.applicationDocumentVersion.count({ where: { applicationId } }),
    db.applicationAuditLog.count({ where: { applicationId } }),
    db.merkImporter.count({ where: { sourceApplicationId: applicationId } }),
    db.brandQualityTest.count({ where: { sourceApplicationId: applicationId } }),
  ]);

  return {
    applicationNumber: application.applicationNumber,
    assignments: assignmentIds.length,
    locationVisits,
    surveyReports,
    messages,
    documentVersions,
    auditLogs,
    unlinkedBrandRows: merkImporters + qualityTests,
  };
}

/**
 * Permanently deletes one application and everything that hangs off it — for clearing out dummy
 * and duplicate rows. None of Application's relations declare `onDelete: Cascade`, so each child
 * is removed explicitly, children-first, inside one transaction: a foreign key that was missed
 * aborts the whole delete instead of leaving the application half-gone.
 *
 * Deliberately NOT deleted:
 * - Uploaded files in storage. Some documents are mapped to the company profile and are still
 *   referenced by its other applications, so the rows go and the files stay.
 * - Merk / BrandQualityTest rows. Brand data is shared and reused across applications; only this
 *   application's `sourceApplicationId` link is cleared (the column is nullable, and Postgres
 *   treats each NULL as distinct so the uniqueness constraints still hold).
 * - The Company row and its locations.
 */
export async function deleteApplicationCompletely(applicationId: string): Promise<ApplicationDeletionSummary | null> {
  const summary = await previewApplicationDeletion(applicationId);
  if (!summary) return null;

  const assignmentIds = (await db.assignment.findMany({ where: { applicationId }, select: { id: true } })).map((a) => a.id);

  await db.$transaction(async (tx) => {
    // SurveyReport and LocationVisit both point at Assignment, so they go before it.
    if (assignmentIds.length > 0) {
      await tx.surveyReport.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    }
    await tx.locationVisit.deleteMany({ where: { applicationId } });
    await tx.assignment.deleteMany({ where: { applicationId } });

    await tx.applicationMessage.deleteMany({ where: { applicationId } });
    await tx.applicationDocumentVersion.deleteMany({ where: { applicationId } });
    await tx.applicationAuditLog.deleteMany({ where: { applicationId } });

    // Keep the brand rows, drop only their link to this application.
    await tx.merkImporter.updateMany({ where: { sourceApplicationId: applicationId }, data: { sourceApplicationId: null } });
    await tx.brandQualityTest.updateMany({ where: { sourceApplicationId: applicationId }, data: { sourceApplicationId: null } });

    await tx.application.delete({ where: { id: applicationId } });
  });

  return summary;
}
