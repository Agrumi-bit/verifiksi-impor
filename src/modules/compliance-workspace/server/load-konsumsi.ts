import "server-only";

import { db } from "@/lib/db";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { APPLICANT_BRAND_ROLE_LABELS, IMPORT_APPOINTMENT_SOURCE_LABELS } from "@/modules/applications/viu-schemes/konsumsi/business-rules";
import type {
  ApplicationBrandEntryValues,
  ApplicationKonsumsiProductValues,
  ProductGroupCertificateValues,
} from "@/modules/applications/viu-schemes/konsumsi/schema";
import { MERK_EVIDENCE_TYPE_LABELS, type MerkEvidenceType } from "@/modules/merk/schema";
import { composeLocationAddress } from "@/modules/shared/schema";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { resolveKonsumsiBrandContexts } from "@/modules/verifikator-workspace/konsumsi-brand-context";
import { productVerificationsSchema } from "@/modules/verifikator-workspace/schema";
import { buildDocumentRows } from "../document-matrix";
import { KONSUMSI_STAGE_CATEGORIES, type BrandInput, type KonsumsiStageInput, type ProductInput } from "../konsumsi-stages";
import { loadCaseDocuments } from "./document-statuses";

const EVIDENCE_TYPES = new Set<string>(Object.keys(MERK_EVIDENCE_TYPE_LABELS));

type KonsumsiPayload = {
  applicationBrands?: ApplicationBrandEntryValues[];
  konsumsiProducts?: ApplicationKonsumsiProductValues[];
  productGroupCertificates?: ProductGroupCertificateValues[];
  locations?: { locationType?: string; city?: string }[];
};

function toNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** The newest assignment of a type — a re-assigned case keeps its older, superseded rows. */
function latest<T extends { scheduleType: string | null; updatedAt: Date }>(assignments: T[], type: string): T | undefined {
  return assignments.filter((a) => a.scheduleType === type).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
}

/**
 * Tahap 4–8 data for one VIU Konsumsi case: brands (Merek Management + the entry's declared
 * relationship), products, quality-test certificates, the Verifikator's per-product and per-document
 * status and the Technical Analyst's module decisions. Read only.
 */
export async function loadKonsumsiStage(applicationId: string): Promise<KonsumsiStageInput | null> {
  const documents = await loadCaseDocuments(applicationId, KONSUMSI_STAGE_CATEGORIES);
  if (!documents) return null;
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: {
      submissionDate: true,
      createdAt: true,
      assignments: { select: { scheduleType: true, updatedAt: true, productVerifications: true, technicalAnalysisData: true } },
    },
  });
  if (!application) return null;

  const payload = documents.payload as KonsumsiPayload;
  const entries = payload.applicationBrands ?? [];
  const contexts = await resolveKonsumsiBrandContexts(entries);
  const merks = await db.merk.findMany({
    where: { id: { in: entries.map((entry) => entry.brandId) } },
    select: { id: true, certificateType: true, hasCertificate: true, ownership: { select: { ownerLocation: true, ownerCountryCode: true } } },
  });
  const merkById = new Map(merks.map((merk) => [merk.id, merk]));

  const brands: BrandInput[] = entries.map((entry, index) => {
    const context = contexts[index];
    const merk = merkById.get(entry.brandId);
    const evidenceType = merk?.hasCertificate && merk.certificateType && EVIDENCE_TYPES.has(merk.certificateType) ? (merk.certificateType as MerkEvidenceType) : null;
    return {
      brandId: entry.brandId,
      brandName: context?.brandName ?? "Merek tidak ditemukan",
      ownerName: context?.details?.ownerName ?? null,
      ownerLocation: merk?.ownership?.ownerLocation ?? null,
      ownerCountry: merk?.ownership?.ownerLocation === "DOMESTIC" ? "Indonesia" : (merk?.ownership?.ownerCountryCode ?? null),
      evidenceType,
      evidenceTypeLabel: context?.details?.evidenceTypeLabel || "—",
      registrationNumber: context?.details?.registrationNumber ?? null,
      registrationDate: context?.details?.registrationDate ?? null,
      registrationExpiryDate: context?.details?.registrationExpiryDate ?? null,
      applicantRole: entry.applicantRole ? APPLICANT_BRAND_ROLE_LABELS[entry.applicantRole] : null,
      appointedBy: entry.applicantRole === "IMPORTER_ONLY" && entry.appointmentSource ? IMPORT_APPOINTMENT_SOURCE_LABELS[entry.appointmentSource] : null,
      requiredDocuments: context?.requiredRelationshipDocuments.map((doc) => doc.label) ?? [],
    };
  });
  const brandName = new Map(brands.map((brand) => [brand.brandId, brand.brandName]));

  const products: ProductInput[] = (payload.konsumsiProducts ?? []).map((item) => ({
    id: item.id,
    brandId: item.brandId,
    brandName: brandName.get(item.brandId) ?? item.productSnapshot?.brandName ?? "—",
    productName: item.productName,
    kelompok: item.industryName || null,
    subKelompok: item.commodityName || null,
    commodityGroupId: item.commodityGroupId,
    hsCode: item.hsCode,
    hsDescription: item.hsDescription || null,
    quantity: toNumber(item.quantity),
    stock: toNumber(item.stockQuantity),
    unit: item.unit || null,
    unitPrice: toNumber(item.averageUnitPrice),
    currency: item.currency ?? "USD",
  }));

  const dokumen = latest(application.assignments, "dokumen");
  const technical = latest(application.assignments, "technical");
  const verifications = productVerificationsSchema.safeParse(dokumen?.productVerifications ?? {});
  const analysis = technicalAnalysisDataSchema.safeParse(technical?.technicalAnalysisData ?? {});
  const moduleOf = (key: "stokKonsumsi" | "penyimpanan" | "modal") => {
    const decision = analysis.success ? analysis.data[key] : undefined;
    return decision ? { status: decision.status, keterangan: decision.keterangan || null, kesimpulan: decision.kesimpulan || null } : undefined;
  };

  return {
    submittedAt: effectiveSubmissionDate(application).value,
    brands,
    products,
    certificates: (payload.productGroupCertificates ?? []).map((cert) => ({
      brandId: cert.brandId,
      commodityGroupId: cert.commodityGroupId,
      subKelompok: cert.commodityName || null,
      certificateNumber: cert.certificateNumber,
      laboratory: cert.laboratoryName,
      issueDate: cert.issueDate || null,
      validUntil: cert.validUntil || null,
      filePath: cert.filePath || null,
    })),
    productStatuses: verifications.success
      ? Object.fromEntries(Object.entries(verifications.data).map(([id, entry]) => [id, { status: entry.status, note: entry.note || null }]))
      : {},
    modules: { stokKonsumsi: moduleOf("stokKonsumsi"), penyimpanan: moduleOf("penyimpanan"), modal: moduleOf("modal") },
    documents: buildDocumentRows(documents.checklist, documents.statuses, { categories: KONSUMSI_STAGE_CATEGORIES }),
    warehouses: (payload.locations ?? [])
      .filter((location) => location.locationType === "GUDANG")
      .map((location) => [composeLocationAddress(location as Parameters<typeof composeLocationAddress>[0]), location.city].filter(Boolean).join(", ")),
  };
}
