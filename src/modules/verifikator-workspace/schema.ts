import { z } from "zod";

import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { DOC_VERIFICATION_STATUSES, PRODUCT_VERIFICATION_STATUSES } from "./status";

export const docVerificationEntrySchema = z.object({
  status: z.enum(DOC_VERIFICATION_STATUSES).default("PENDING"),
  note: z.string().trim().optional(),
  verifiedAt: z.string().trim().optional(),
});
export type DocVerificationEntry = z.infer<typeof docVerificationEntrySchema>;

export const documentVerificationsSchema = z.record(z.string(), docVerificationEntrySchema);
export type DocumentVerifications = z.infer<typeof documentVerificationsSchema>;

export function emptyDocumentVerifications(): DocumentVerifications {
  return {};
}

export const productVerificationEntrySchema = z.object({
  status: z.enum(PRODUCT_VERIFICATION_STATUSES).default("PENDING"),
  note: z.string().trim().optional(),
  verifiedAt: z.string().trim().optional(),
});
export type ProductVerificationEntry = z.infer<typeof productVerificationEntrySchema>;

export const productVerificationsSchema = z.record(z.string(), productVerificationEntrySchema);
export type ProductVerifications = z.infer<typeof productVerificationsSchema>;

export function emptyProductVerifications(): ProductVerifications {
  return {};
}

export type DocumentChecklistItem = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
};

const LOCATION_TYPE_NAMES: Record<string, string> = {
  KANTOR: "Kantor",
  GUDANG: "Gudang",
  PABRIK: "Pabrik",
};

/**
 * Application documents live scattered across the wizard payload (fixed
 * legal fields, per-location ownership/lease/warehouse docs, and dynamic
 * support-document arrays keyed by import type). This derives one flat,
 * stably-keyed checklist so verification decisions can be stored against
 * real payload paths instead of an invented document model.
 */
export function buildDocumentChecklist(payload: ApplicationWizardValues): DocumentChecklistItem[] {
  const items: DocumentChecklistItem[] = [];

  items.push({
    key: "nib",
    label: "NIB (Nomor Induk Berusaha)",
    category: "Legalitas Perusahaan",
    documentPath: payload.nibDocumentPath || null,
  });
  items.push({
    key: "kbli",
    label: "Daftar KBLI",
    category: "Legalitas Perusahaan",
    documentPath: payload.kbliDocumentPath || null,
  });
  items.push({
    key: "notarial",
    label: "Akta Notaris",
    category: "Legalitas Perusahaan",
    documentPath: payload.notarialDocumentPath || null,
  });

  for (const loc of payload.locations ?? []) {
    const label = LOCATION_TYPE_NAMES[loc.locationType] ?? loc.locationType;
    if (loc.buildingStatus === "MILIK_SENDIRI") {
      items.push({
        key: `location:${loc.id}:ownership`,
        label: `Bukti Kepemilikan — ${label}`,
        category: "Dokumen Lokasi",
        documentPath: loc.ownershipDocumentPath || null,
      });
    } else {
      items.push({
        key: `location:${loc.id}:lease`,
        label: `Perjanjian Sewa — ${label}`,
        category: "Dokumen Lokasi",
        documentPath: loc.leaseDocumentPath || null,
      });
    }
    if (loc.locationType === "GUDANG") {
      items.push({
        key: `location:${loc.id}:warehouseRegistration`,
        label: `Tanda Daftar Gudang — ${label}`,
        category: "Dokumen Lokasi",
        documentPath: loc.warehouseRegistrationDocumentPath || null,
      });
      items.push({
        key: `location:${loc.id}:warehouseLayout`,
        label: `Layout Gudang — ${label}`,
        category: "Dokumen Lokasi",
        documentPath: loc.warehouseLayoutDocumentPath || null,
      });
    }
  }

  for (const doc of payload.nonIndustriDocuments ?? []) {
    items.push({
      key: `support:${doc.id}`,
      label: doc.label,
      category: "Dokumen Pendukung",
      documentPath: doc.documentPath || null,
    });
  }
  for (const doc of payload.konsumsiDocuments ?? []) {
    items.push({
      key: `support:${doc.id}`,
      label: doc.label,
      category: "Dokumen Pendukung",
      documentPath: doc.documentPath || null,
    });
  }

  return items;
}

export type ProductChecklistItem = {
  id: string;
  materialType: string;
  hsCode: string;
  estimatedVolume: string;
  volumeUnit: string;
  intendedUse: string;
};

export function buildProductChecklist(payload: ApplicationWizardValues): ProductChecklistItem[] {
  return (payload.products ?? []).map((product) => ({
    id: product.id,
    materialType: product.materialType,
    hsCode: product.hsCode,
    estimatedVolume: product.estimatedVolume,
    volumeUnit: product.volumeUnit,
    intendedUse: product.intendedUse,
  }));
}
