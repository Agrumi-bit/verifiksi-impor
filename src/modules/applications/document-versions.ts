import { db } from "@/lib/db";
import type { ApplicationWizardValues } from "./schema";

export type VerificationStatusValue = "NOT_YET_VERIFIED" | "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE" | "EXPIRED";

/** Which review stage set the current `verificationStatus` — Customer Relation's administrative check vs the verifikator's authoritative technical review. */
export type VerifiedByRole = "CR" | "VERIFIKATOR";

/**
 * Rows written before `verifiedByRole` existed have it as null — fall back to inferring from the
 * verifier's own account role. Unambiguous for "CUSTOMER_RELATIONSHIP" and "VERIFIKATOR" exactly;
 * stays null (unknown) for "ADMIN"/"SUPER_ADMIN", which can act through either workspace.
 */
function inferVerifiedByRole(row: { verifiedByRole: string | null; verifiedBy: { role: string | null } | null }): VerifiedByRole | null {
  if (row.verifiedByRole === "CR" || row.verifiedByRole === "VERIFIKATOR") return row.verifiedByRole;
  if (row.verifiedBy?.role === "CUSTOMER_RELATIONSHIP") return "CR";
  if (row.verifiedBy?.role === "VERIFIKATOR") return "VERIFIKATOR";
  return null;
}

/** Same fallback shape as `inferVerifiedByRole`, for who actually uploaded this version (null =
 * the company's own upload, never staff on its behalf). */
function inferUploadedByRole(row: { uploadedByRole: string | null; uploadedBy: { role: string | null } | null }): VerifiedByRole | null {
  if (row.uploadedByRole === "CR" || row.uploadedByRole === "VERIFIKATOR") return row.uploadedByRole;
  if (row.uploadedBy?.role === "CUSTOMER_RELATIONSHIP") return "CR";
  if (row.uploadedBy?.role === "VERIFIKATOR") return "VERIFIKATOR";
  return null;
}

/**
 * Immutable write-back for a verifikator checklist `key` (the same keys
 * `buildDocumentChecklist` in modules/verifikator-workspace/schema.ts reads)
 * into a fresh copy of the application payload. Mirrors every shape that
 * builder already knows how to read, in reverse — scalar legal/tax fields,
 * per-location proofs, and the dynamic VKI/VIU support-document arrays.
 */
export function applyChecklistDocumentPath(
  payload: ApplicationWizardValues,
  key: string,
  newPath: string,
): ApplicationWizardValues {
  const SCALAR_FIELD_KEYS: Record<string, keyof ApplicationWizardValues> = {
    nib: "nibDocumentPath",
    "kbli-utama": "kbliDocumentPath",
    "kbli-pendukung": "kbliDocumentPath",
    notarial: "notarialDocumentPath",
    sk: "skDocumentPath",
    "notarial-amendment": "notarialAmendmentDocPath",
    npwp: "npwpDocumentPath",
    skt: "sktDocumentPath",
    "tax-proof-summary": "taxProofSummaryDocumentPath",
    "tax-support:spt-tahunan": "sptTahunanDocumentPath",
    "tax-support:bpe": "bpeDocumentPath",
    "tax-support:skf": "skfDocumentPath",
    "tax-support:ssp": "sspDocumentPath",
    "tax-support:pph-badan": "pphBadanDocumentPath",
    "tax-support:ppn": "ppnDocumentPath",
    "tax-support:e-billing": "eBillingDocumentPath",
  };
  if (key in SCALAR_FIELD_KEYS) {
    return { ...payload, [SCALAR_FIELD_KEYS[key]]: newPath };
  }

  const typedLocationMatch = key.match(/^location:([^:]+):(ownership|lease):([A-Za-z_]+)$/);
  if (typedLocationMatch) {
    const [, locationId, kind, docType] = typedLocationMatch;
    return {
      ...payload,
      locations: (payload.locations ?? []).map((loc) => {
        if (loc.id !== locationId) return loc;
        if (kind === "ownership") {
          const existing = loc.ownershipDocuments ?? [];
          const found = existing.some((entry) => entry.type === docType);
          const ownershipDocuments = found
            ? existing.map((entry) => (entry.type === docType ? { ...entry, documentPath: newPath } : entry))
            : [...existing, { type: docType as (typeof existing)[number]["type"], documentPath: newPath }];
          return { ...loc, ownershipDocuments };
        }
        const existing = loc.leaseDocuments ?? [];
        const found = existing.some((entry) => entry.type === docType);
        const leaseDocuments = found
          ? existing.map((entry) => (entry.type === docType ? { ...entry, documentPath: newPath } : entry))
          : [...existing, { type: docType as (typeof existing)[number]["type"], documentPath: newPath }];
        return { ...loc, leaseDocuments };
      }),
    };
  }

  const warehouseMatch = key.match(/^location:([^:]+):(warehouseRegistration|warehouseLayout)$/);
  if (warehouseMatch) {
    const [, locationId, field] = warehouseMatch;
    return {
      ...payload,
      locations: (payload.locations ?? []).map((loc) => {
        if (loc.id !== locationId) return loc;
        return field === "warehouseRegistration"
          ? { ...loc, warehouseRegistrationDocumentPath: newPath }
          : { ...loc, warehouseLayoutDocumentPath: newPath };
      }),
    };
  }

  if (key === "vki-support:tenaga-kerja") {
    return { ...payload, tenagaKerjaDocumentPath: newPath };
  }

  const electricityMatch = key.match(/^vki-support:listrik:(.+)$/);
  if (electricityMatch) {
    const [, monthId] = electricityMatch;
    return {
      ...payload,
      electricityMonths: (payload.electricityMonths ?? []).map((month) =>
        month.id === monthId ? { ...month, documentPath: newPath } : month,
      ),
    };
  }

  const supportDefMatch = key.match(/^vki-support:(.+)$/);
  if (supportDefMatch) {
    const [, defKey] = supportDefMatch;
    const existing = payload.vkiSupportDocs ?? [];
    const found = existing.some((entry) => entry.key === defKey);
    return {
      ...payload,
      vkiSupportDocs: found
        ? existing.map((entry) => (entry.key === defKey ? { ...entry, documentPath: newPath } : entry))
        : [...existing, { key: defKey, documentPath: newPath }],
    };
  }

  const nonIndustriMatch = key.match(/^nonindustri-support:(.+)$/);
  if (nonIndustriMatch) {
    const [, defKey] = nonIndustriMatch;
    const existing = payload.nonIndustriDocuments ?? [];
    const found = existing.some((entry) => entry.key === defKey);
    return {
      ...payload,
      nonIndustriDocuments: found
        ? existing.map((entry) => (entry.key === defKey ? { ...entry, documentPath: newPath } : entry))
        : [...existing, { key: defKey, enabled: true, documentPath: newPath }],
    };
  }

  // Barang Konsumsi's own, separate Bukti Kemampuan Finansial array — mirrors the
  // nonindustri-support handling above but never shares storage with it.
  const konsumsiFinancialMatch = key.match(/^konsumsi-financial:(.+)$/);
  if (konsumsiFinancialMatch) {
    const [, defKey] = konsumsiFinancialMatch;
    const existing = payload.konsumsiFinancialDocuments ?? [];
    const found = existing.some((entry) => entry.key === defKey);
    return {
      ...payload,
      konsumsiFinancialDocuments: found
        ? existing.map((entry) => (entry.key === defKey ? { ...entry, documentPath: newPath } : entry))
        : [...existing, { key: defKey, enabled: true, documentPath: newPath }],
    };
  }

  const supportDocMatch = key.match(/^support:(.+)$/);
  if (supportDocMatch) {
    const [, docId] = supportDocMatch;
    return {
      ...payload,
      konsumsiDocuments: (payload.konsumsiDocuments ?? []).map((doc) =>
        doc.id === docId ? { ...doc, documentPath: newPath } : doc,
      ),
    };
  }

  // VIU Konsumsi's "Dokumen Label Produk" — exactly two documents, once per Application (see
  // konsumsiLabelDocumentsSchema's own comment). Unlike every other key here, the target field is
  // `{fileName, filePath}` rather than a bare path string — this function only ever receives a
  // bare `newPath`, so `fileName` is derived from the path's own last segment (same convention
  // CR/Verifikator uploads already use elsewhere when the original filename isn't carried through
  // this generic, path-only write-back).
  if (key === "konsumsi-label:statement" || key === "konsumsi-label:documentation") {
    const fileName = newPath.split("/").pop() || newPath;
    const field = key === "konsumsi-label:statement" ? "labelStatementDocument" : "labelDocumentationDocument";
    return { ...payload, [field]: { filePath: newPath, fileName } };
  }

  // LHVKI is the one Partner Industri document that actually lives on the application payload
  // (see partnerIndustriEntrySchema) — the partner's NIB/NPWP/SK do not, they live on
  // `Partner.company` (a different Company row entirely) and can't be written here; the caller
  // (documents/[key]/history/route.ts) rejects those keys before ever reaching this function.
  const partnerLhvkiMatch = key.match(/^partner:([^:]+):lhvki$/);
  if (partnerLhvkiMatch) {
    const [, partnerId] = partnerLhvkiMatch;
    return {
      ...payload,
      partnerIndustriEntries: (payload.partnerIndustriEntries ?? []).map((entry) =>
        entry.partnerId === partnerId ? { ...entry, lhvkiDocumentPath: newPath } : entry,
      ),
    };
  }

  throw new Error(`Tidak diketahui cara menyimpan dokumen untuk key: ${key}`);
}

/**
 * Append-only version tracking for application-only documents — structural
 * mirror of src/modules/company/document-versions.ts, keyed by applicationId
 * instead of companyId. See that file for the backfill/EXPIRED-on-replace
 * rationale; behavior here is identical.
 */
export async function recordApplicationDocumentVersion(
  applicationId: string,
  fieldKey: string,
  path: string,
  uploadedById: string | null,
  backfill?: { previousPath: string; createdAt: Date },
  // Set when CR/Verifikator uploads on the company's own behalf (see applyChecklistDocumentPath's
  // callers) — null for the company's own upload. Never implies a review decision: the new
  // version still starts at the default `NOT_YET_VERIFIED`, same as any other upload.
  uploadedByRole: VerifiedByRole | null = null,
): Promise<void> {
  const latest = await db.applicationDocumentVersion.findFirst({
    where: { applicationId, fieldKey },
    orderBy: { version: "desc" },
    select: { id: true, version: true },
  });

  let nextVersion = (latest?.version ?? 0) + 1;

  if (!latest && backfill) {
    await db.applicationDocumentVersion.create({
      data: {
        applicationId,
        fieldKey,
        path: backfill.previousPath,
        uploadedById: null,
        version: 1,
        createdAt: backfill.createdAt,
        verificationStatus: "EXPIRED",
      },
    });
    nextVersion = 2;
  } else if (latest) {
    await db.applicationDocumentVersion.update({
      where: { id: latest.id },
      data: { verificationStatus: "EXPIRED" },
    });
  }

  await db.applicationDocumentVersion.create({
    data: { applicationId, fieldKey, path, uploadedById, uploadedByRole, version: nextVersion },
  });
}

export type ChecklistResultValue = "PASS" | "FAIL" | "NA";

export type ChecklistItemResult = {
  result: ChecklistResultValue | null;
  note: string | null;
  criteriaChecked: boolean[];
};

const EMPTY_CHECKLIST_ITEM_RESULT: ChecklistItemResult = { result: null, note: null, criteriaChecked: [] };

export type DocumentMetaEntry = {
  version: number;
  uploadedByName: string | null;
  uploadedAt: string;
  uploadedByRole: VerifiedByRole | null;
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verifiedByRole: VerifiedByRole | null;
  rejectionNote: string | null;
  checklistResult: Record<string, ChecklistItemResult> | null;
};

function fallbackMetaEntry(fallbackCreatedAt: Date): DocumentMetaEntry {
  return {
    version: 1,
    uploadedByName: null,
    uploadedAt: fallbackCreatedAt.toISOString(),
    uploadedByRole: null,
    verificationStatus: "NOT_YET_VERIFIED",
    verifiedByName: null,
    verifiedAt: null,
    verifiedByRole: null,
    rejectionNote: null,
    checklistResult: null,
  };
}

export async function getApplicationDocumentMeta(
  applicationId: string,
  fieldKeys: string[],
  fallbackCreatedAt: Date,
): Promise<Record<string, DocumentMetaEntry>> {
  const rows = fieldKeys.length
    ? await db.applicationDocumentVersion.findMany({
        where: { applicationId, fieldKey: { in: fieldKeys } },
        orderBy: { version: "desc" },
        include: { uploadedBy: { select: { name: true, role: true } }, verifiedBy: { select: { name: true, role: true } } },
      })
    : [];

  const meta: Record<string, DocumentMetaEntry> = {};
  for (const key of fieldKeys) {
    meta[key] = fallbackMetaEntry(fallbackCreatedAt);
  }
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.fieldKey)) continue; // rows are ordered desc — first hit per key is the latest version
    seen.add(row.fieldKey);
    meta[row.fieldKey] = {
      version: row.version,
      uploadedByName: row.uploadedBy?.name ?? null,
      uploadedAt: row.createdAt.toISOString(),
      uploadedByRole: inferUploadedByRole(row),
      verificationStatus: row.verificationStatus,
      verifiedByName: row.verifiedBy?.name ?? null,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      verifiedByRole: inferVerifiedByRole(row),
      rejectionNote: row.rejectionNote,
      checklistResult: (row.checklistResult as Record<string, ChecklistItemResult> | null) ?? null,
    };
  }

  return meta;
}

export type DocumentVersionEntry = {
  version: number;
  path: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
  uploadedByRole: VerifiedByRole | null;
  isCurrent: boolean;
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verifiedByRole: VerifiedByRole | null;
  rejectionNote: string | null;
};

export async function getApplicationDocumentVersionHistory(
  applicationId: string,
  fieldKey: string,
  currentPath: string | null,
  fallbackCreatedAt: Date,
): Promise<DocumentVersionEntry[]> {
  const rows = await db.applicationDocumentVersion.findMany({
    where: { applicationId, fieldKey },
    orderBy: { version: "desc" },
    include: { uploadedBy: { select: { name: true, role: true } }, verifiedBy: { select: { name: true, role: true } } },
  });

  if (rows.length === 0) {
    if (!currentPath) return [];
    return [{ ...fallbackMetaEntry(fallbackCreatedAt), path: currentPath, isCurrent: true }];
  }

  return rows.map((row) => ({
    version: row.version,
    path: row.path,
    uploadedByName: row.uploadedBy?.name ?? null,
    uploadedAt: row.createdAt.toISOString(),
    uploadedByRole: inferUploadedByRole(row),
    isCurrent: row.path === currentPath,
    verificationStatus: row.verificationStatus,
    verifiedByName: row.verifiedBy?.name ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verifiedByRole: inferVerifiedByRole(row),
    rejectionNote: row.rejectionNote,
  }));
}

export async function setApplicationDocumentVerificationStatus(
  applicationId: string,
  fieldKey: string,
  currentPath: string | null,
  applicationCreatedAt: Date,
  status: "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE",
  verifiedById: string,
  rejectionNote: string | null,
  verifiedByRole: VerifiedByRole,
): Promise<void> {
  let latest = await db.applicationDocumentVersion.findFirst({
    where: { applicationId, fieldKey },
    orderBy: { version: "desc" },
    select: { id: true },
  });

  if (!latest) {
    latest = await db.applicationDocumentVersion.create({
      data: { applicationId, fieldKey, path: currentPath, uploadedById: null, version: 1, createdAt: applicationCreatedAt },
      select: { id: true },
    });
  }

  await db.applicationDocumentVersion.update({
    where: { id: latest.id },
    data: {
      verificationStatus: status,
      verifiedById,
      verifiedAt: new Date(),
      verifiedByRole,
      rejectionNote: status === "VERIFIED" ? null : rejectionNote,
    },
  });
}

/**
 * Application-only mirror of `patchDocumentChecklistItem` in
 * modules/company/document-versions.ts — see that file for rationale.
 */
export async function patchApplicationDocumentChecklistItem(
  applicationId: string,
  fieldKey: string,
  currentPath: string,
  applicationCreatedAt: Date,
  itemId: string,
  patch: Partial<ChecklistItemResult>,
): Promise<Record<string, ChecklistItemResult>> {
  let latest = await db.applicationDocumentVersion.findFirst({
    where: { applicationId, fieldKey },
    orderBy: { version: "desc" },
    select: { id: true, checklistResult: true },
  });

  if (!latest) {
    latest = await db.applicationDocumentVersion.create({
      data: { applicationId, fieldKey, path: currentPath, uploadedById: null, version: 1, createdAt: applicationCreatedAt },
      select: { id: true, checklistResult: true },
    });
  }

  const current = (latest.checklistResult as Record<string, ChecklistItemResult> | null) ?? {};
  const currentItem = current[itemId] ?? EMPTY_CHECKLIST_ITEM_RESULT;
  const updated = { ...current, [itemId]: { ...currentItem, ...patch } };

  await db.applicationDocumentVersion.update({ where: { id: latest.id }, data: { checklistResult: updated } });
  return updated;
}
