import "server-only";

import { db } from "@/lib/db";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { REQUIRED_LOCATION_TYPE_LABELS, composeLocationAddress, type LocationType } from "@/modules/shared/schema";
import { collectApplicationVisits, groupVisitsByLocation, type SurveyPayloadLocation } from "@/modules/shared/survey-visit-scope";
import { DOC_TYPE_DEFS } from "@/modules/surveyor-workspace/components/office-verification/schema";
import { docTypeDefs } from "@/modules/surveyor-workspace/components/field-verification/schema";
import type { FieldAnswer, LocationInput, LocationVisitResult, LokasiInput } from "../lokasi";
import { loadCaseDocuments } from "./document-statuses";

const REGISTRATION_LABELS: Record<string, string> = { TANDA_DAFTAR_GUDANG: "TDG", PENETAPAN_GUDANG_BERIKAT: "Gudang Berikat", GUDANG_PENIMBUNAN_SEMENTARA: "TPS" };

type PayloadLocation = SurveyPayloadLocation & {
  id?: string;
  city?: string;
  province?: string;
  buildingStatus?: "MILIK_SENDIRI" | "SEWA";
  leaseEndDate?: string;
  leaseOriginalOwnerName?: string;
  warehouseRegistrationType?: string;
  warehouseRegistrationNumber?: string;
};

type Answer = { value?: "sesuai" | "tidak" | null } | undefined;
type VisitForm = {
  actualVisitDate?: string;
  section1Docs?: { addressText?: string }[];
  section1Answers?: Record<string, Answer>;
  section2Answers?: Record<string, Answer>;
  ownershipAnswer?: Answer;
  sewaAnswers?: Record<string, Answer>;
  legalityAnswers?: Record<string, Answer>;
  documentation?: Record<string, { filePath?: string; caption?: string }>;
  documentationOther?: { filePath?: string; caption?: string }[];
  findingsExplanation?: string;
  conclusionStatus?: string | null;
  conclusionRecommendation?: string | null;
  conclusionSummary?: string;
};

function answer(value: Answer): FieldAnswer {
  return value?.value ?? null;
}

function visitResult(
  location: PayloadLocation,
  visit: { status: string; officeVerification: unknown; warehouseVerification: unknown; factoryVerification: unknown; surveyorName: string | null },
): LocationVisitResult {
  const form = ((location.locationType === "KANTOR" ? visit.officeVerification : location.locationType === "GUDANG" ? visit.warehouseVerification : visit.factoryVerification) ??
    {}) as VisitForm;
  const labels = new Map(
    (location.locationType === "KANTOR" ? DOC_TYPE_DEFS : docTypeDefs(location.locationType === "PABRIK" ? "PABRIK" : "GUDANG")).map((def) => [def.key, def.label]),
  );
  const photos = [
    ...Object.entries(form.documentation ?? {}).map(([key, item]) => ({ label: labels.get(key) ?? key, path: item.filePath ?? "", caption: item.caption ?? null })),
    ...(form.documentationOther ?? []).map((item) => ({ label: "Dokumentasi Lainnya", path: item.filePath ?? "", caption: item.caption ?? null })),
  ].filter((photo) => photo.path);
  const isSewa = location.buildingStatus === "SEWA";
  return {
    status: visit.status,
    surveyorName: visit.surveyorName,
    actualVisitDate: form.actualVisitDate || null,
    addressFound: form.section1Docs?.[0]?.addressText || null,
    addressMatch: answer(location.locationType === "KANTOR" ? form.section2Answers?.q1 : form.section1Answers?.q1),
    ownershipMatch: answer(isSewa ? form.sewaAnswers?.r1 : form.ownershipAnswer),
    leaseStillValid: isSewa ? answer(form.sewaAnswers?.r2) : null,
    registrationMatch: location.locationType === "GUDANG" ? answer(form.legalityAnswers?.l1) : null,
    conclusionStatus: form.conclusionStatus ?? null,
    recommendation: form.conclusionRecommendation ?? null,
    summary: form.conclusionSummary || null,
    findings: form.findingsExplanation || null,
    photos,
  };
}

/** Tahap 3 data for one case: declared locations, their documents with status, and the surveyor's active visit per location. */
export async function loadLokasiStage(applicationId: string): Promise<LokasiInput | null> {
  const documents = await loadCaseDocuments(applicationId, ["Dokumen Lokasi"]);
  if (!documents) return null;
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: {
      submissionDate: true,
      createdAt: true,
      assignments: {
        where: { scheduleType: "survey" },
        select: {
          assignmentNumber: true,
          pmReviewStatus: true,
          surveyor: { select: { name: true } },
          locationVisits: {
            select: {
              id: true,
              status: true,
              locationType: true,
              address: true,
              companyLocationId: true,
              submittedAt: true,
              updatedAt: true,
              createdAt: true,
              officeVerification: true,
              warehouseVerification: true,
              factoryVerification: true,
            },
          },
        },
      },
    },
  });
  if (!application) return null;

  const locations = ((documents.payload as { locations?: PayloadLocation[] }).locations ?? []) as PayloadLocation[];
  const surveyorByVisit = new Map(application.assignments.flatMap((a) => a.locationVisits.map((visit) => [visit.id, a.surveyor?.name ?? null] as const)));
  const { groups } = groupVisitsByLocation(collectApplicationVisits(application.assignments), locations);
  const activeVisit = new Map(groups.map((group) => [group.location, group.active]));
  const statusOf = (key: string) => documents.statuses[key]?.verificationStatus ?? "NOT_YET_VERIFIED";

  const result: LocationInput[] = locations.map((location, index) => {
    const id = location.id ?? `idx-${index}`;
    const type = REQUIRED_LOCATION_TYPE_LABELS[location.locationType as LocationType] ?? location.locationType;
    const visit = activeVisit.get(location);
    const registrationType = location.warehouseRegistrationType ? (REGISTRATION_LABELS[location.warehouseRegistrationType] ?? location.warehouseRegistrationType) : "";
    return {
      id,
      type,
      address: [composeLocationAddress(location), location.city, location.province].filter(Boolean).join(", "),
      buildingStatus: location.buildingStatus ?? null,
      leaseEndDate: location.leaseEndDate || null,
      leaseOriginalOwnerName: location.leaseOriginalOwnerName || null,
      registration: [registrationType, location.warehouseRegistrationNumber?.trim()].filter(Boolean).join(" ") || null,
      documents: documents.checklist
        .filter((item) => item.key.startsWith(`location:${id}:`) && item.documentPath)
        .map((item) => ({ key: item.key, label: item.label, path: item.documentPath!, status: statusOf(item.key) })),
      visit: visit ? visitResult(location, { ...visit, surveyorName: surveyorByVisit.get(visit.id) ?? null }) : null,
    };
  });
  return { submittedAt: effectiveSubmissionDate(application).value, locations: result };
}
