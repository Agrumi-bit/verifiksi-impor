import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildKonsumsiImportPlan, buildModalKerjaFromApplication } from "@/modules/applications/viu-import-plan";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { buildCapacityRows, buildMachineChecklist, buildRawMaterialConversionRows, buildRawMaterialUsageChecklist } from "@/modules/verifikator-workspace/schema";
import { readDocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review-store";

export type TechnicalReportAssignment = Prisma.AssignmentGetPayload<{
  include: { application: true; technicalReviewer: { select: { name: true } } };
}>;

/** Data of the printable Laporan Analisis Teknis — shared by the PM and Technical Analyst routes. */
export async function buildTechnicalReportData(assignment: TechnicalReportAssignment) {
  const payload = assignment.application.payload as ApplicationWizardValues;
  const kantor = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];
  return {
    assignmentNumber: assignment.assignmentNumber,
    applicationNumber: assignment.application.applicationNumber,
    verificationType: assignment.application.verificationType,
    importTypes: payload.importTypes ?? [],
    companyName: payload.companyName,
    nibNumber: payload.nibNumber ?? null,
    businessAddress: kantor ? `${kantor.address}, ${kantor.city}, ${kantor.province}` : null,
    status: assignment.status,
    technicalReviewerName: assignment.technicalReviewer?.name ?? null,
    validatedAt: assignment.validatedAt,
    validationNotes: assignment.validationNotes,
    // Submit Report (Draft Report tab): tanda tangan + tanggal untuk bagian "Disusun Oleh".
    signaturePath: assignment.signaturePath,
    signatureDate: assignment.signatureDate,
    pmReviewStatus: assignment.pmReviewStatus,
    pmReviewedAt: assignment.pmReviewedAt,
    technicalAnalysisData: technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {}),
    documentReportReview: await readDocumentReportReview(assignment.id),
    konsumsiImportPlan: buildKonsumsiImportPlan(payload),
    modalKerjaFromApplication: buildModalKerjaFromApplication(payload),
    capacity: buildCapacityRows(payload),
    rawMaterialConversion: buildRawMaterialConversionRows(payload),
    rawMaterialUsage: buildRawMaterialUsageChecklist(payload),
    // Energi Listrik: machines + PLN bills, for the report's own A/C/D sections (listrik-calc.ts).
    machines: buildMachineChecklist(payload),
    electricityMonths: payload.electricityMonths ?? [],
  };
}
