import { db } from "@/lib/db";
import type { TaxProofEntryValues } from "@/modules/company/schema";
import { DOCUMENT_FIELD_KEYS, type DocumentFieldKey, parseTaxProofYear } from "./document-fields";

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

const STATIC_FIELD_KEY_SET = new Set<string>(DOCUMENT_FIELD_KEYS);

function isStaticFieldKey(value: string): value is DocumentFieldKey {
  return STATIC_FIELD_KEY_SET.has(value);
}

/**
 * Resolves the *current* path for a document field directly off a Company
 * row — 5 plain columns via `fieldKey`, or `taxProof:<year>` read out of the
 * `taxProofs` JSON array. Shared by every route that needs "what's the doc
 * at this field right now" without duplicating the static-vs-JSON branch.
 */
export function resolveCurrentDocumentPath(
  company: { taxProofs: unknown } & Record<DocumentFieldKey, string | null>,
  fieldKey: string,
): string | null {
  if (isStaticFieldKey(fieldKey)) return company[fieldKey];
  const year = parseTaxProofYear(fieldKey);
  if (!year) return null;
  const taxProofs = (company.taxProofs as TaxProofEntryValues[] | null) ?? [];
  return taxProofs.find((tp) => tp.year === year)?.docPath ?? null;
}

/**
 * Append-only document version tracking (see prisma schema:
 * `CompanyDocumentVersion`). "Version" for a field is the row count for
 * (companyId, fieldKey); "current" is the latest row. Only called when a
 * field's path actually changed — never on every save.
 *
 * `backfill` handles the very first tracked change to a field that already
 * had a document before this feature existed: without it, that first real
 * upload would insert its own "version 1", colliding with the synthetic v1
 * `getDocumentMeta` already shows for the untracked original (so replacing a
 * legacy doc would misleadingly still read as "v1"). When `backfill` is
 * given and no rows exist yet, the untracked original is recorded first
 * (uploader unknown, dated to the company's own createdAt — never
 * fabricated, already `EXPIRED` since it's being superseded right now),
 * then the real new upload lands as the version after it.
 *
 * Whenever a previous version existed (tracked or just backfilled), it's
 * flipped to `EXPIRED` — a document stops being "the current one" the
 * moment it's replaced, regardless of whether it had been verified/rejected
 * before.
 */
export async function recordDocumentVersion(
  companyId: string,
  fieldKey: string,
  path: string,
  uploadedById: string | null,
  backfill?: { previousPath: string; createdAt: Date },
): Promise<void> {
  const latest = await db.companyDocumentVersion.findFirst({
    where: { companyId, fieldKey },
    orderBy: { version: "desc" },
    select: { id: true, version: true },
  });

  let nextVersion = (latest?.version ?? 0) + 1;

  if (!latest && backfill) {
    await db.companyDocumentVersion.create({
      data: {
        companyId,
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
    await db.companyDocumentVersion.update({
      where: { id: latest.id },
      data: { verificationStatus: "EXPIRED" },
    });
  }

  await db.companyDocumentVersion.create({
    data: { companyId, fieldKey, path, uploadedById, version: nextVersion },
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
    verificationStatus: "NOT_YET_VERIFIED",
    verifiedByName: null,
    verifiedAt: null,
    verifiedByRole: null,
    rejectionNote: null,
    checklistResult: null,
  };
}

/**
 * Latest version per fieldKey, for exactly the field keys passed in (only
 * fields that actually have a document today — callers filter to truthy
 * paths first). Docs saved before this feature existed have zero rows —
 * synthesized as version 1 with the company's own createdAt, no uploader,
 * and `NOT_YET_VERIFIED` (never fabricate a name or a review that never
 * happened). Returns a plain, fully-populated object so it survives
 * `NextResponse.json()` — no lazy/proxy fallback, since a JSON round trip
 * only serializes concrete own keys.
 */
export async function getDocumentMeta(
  companyId: string,
  fieldKeys: string[],
  fallbackCreatedAt: Date,
): Promise<Record<string, DocumentMetaEntry>> {
  const rows = fieldKeys.length
    ? await db.companyDocumentVersion.findMany({
        where: { companyId, fieldKey: { in: fieldKeys } },
        orderBy: { version: "desc" },
        include: { uploadedBy: { select: { name: true } }, verifiedBy: { select: { name: true, role: true } } },
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
  isCurrent: boolean;
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verifiedByRole: VerifiedByRole | null;
  rejectionNote: string | null;
};

/**
 * Every version for one field, newest first. Same untracked-original
 * fallback as `getDocumentMeta` — if there are no rows yet but the field
 * currently has a document, that's a single synthetic v1 entry.
 */
export async function getVersionHistory(
  companyId: string,
  fieldKey: string,
  currentPath: string | null,
  fallbackCreatedAt: Date,
): Promise<DocumentVersionEntry[]> {
  const rows = await db.companyDocumentVersion.findMany({
    where: { companyId, fieldKey },
    orderBy: { version: "desc" },
    include: { uploadedBy: { select: { name: true } }, verifiedBy: { select: { name: true, role: true } } },
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
    isCurrent: row.path === currentPath,
    verificationStatus: row.verificationStatus,
    verifiedByName: row.verifiedBy?.name ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verifiedByRole: inferVerifiedByRole(row),
    rejectionNote: row.rejectionNote,
  }));
}

/**
 * Verifikator decision on the *current* version of a field. If that version
 * was never tracked (legacy doc, zero rows), it's materialized first — same
 * backfill semantics as `recordDocumentVersion` — so there's a real row to
 * attach the decision to.
 */
export async function setDocumentVerificationStatus(
  companyId: string,
  fieldKey: string,
  currentPath: string | null,
  companyCreatedAt: Date,
  status: "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE",
  verifiedById: string,
  rejectionNote: string | null,
  verifiedByRole: VerifiedByRole,
): Promise<void> {
  let latest = await db.companyDocumentVersion.findFirst({
    where: { companyId, fieldKey },
    orderBy: { version: "desc" },
    select: { id: true },
  });

  if (!latest) {
    latest = await db.companyDocumentVersion.create({
      data: { companyId, fieldKey, path: currentPath, uploadedById: null, version: 1, createdAt: companyCreatedAt },
      select: { id: true },
    });
  }

  await db.companyDocumentVersion.update({
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
 * One item of the "Uraian yang Diperiksa" checklist, set on the *current*
 * version of a field — same materialize-if-untracked semantics as
 * `setDocumentVerificationStatus`. Stored as a plain `{ itemId: { result, note,
 * criteriaChecked } }` map so items (and individual criteria rows within an
 * item) can be ticked one at a time without clobbering the rest. `patch` is
 * merged onto whatever was already stored for that item — callers only pass
 * the field(s) they're actually changing (e.g. just `criteriaChecked` when
 * toggling one criterion row, without touching the overall `result`).
 */
export async function patchDocumentChecklistItem(
  companyId: string,
  fieldKey: string,
  currentPath: string,
  companyCreatedAt: Date,
  itemId: string,
  patch: Partial<ChecklistItemResult>,
): Promise<Record<string, ChecklistItemResult>> {
  let latest = await db.companyDocumentVersion.findFirst({
    where: { companyId, fieldKey },
    orderBy: { version: "desc" },
    select: { id: true, checklistResult: true },
  });

  if (!latest) {
    latest = await db.companyDocumentVersion.create({
      data: { companyId, fieldKey, path: currentPath, uploadedById: null, version: 1, createdAt: companyCreatedAt },
      select: { id: true, checklistResult: true },
    });
  }

  const current = (latest.checklistResult as Record<string, ChecklistItemResult> | null) ?? {};
  const currentItem = current[itemId] ?? EMPTY_CHECKLIST_ITEM_RESULT;
  const updated = { ...current, [itemId]: { ...currentItem, ...patch } };

  await db.companyDocumentVersion.update({ where: { id: latest.id }, data: { checklistResult: updated } });
  return updated;
}
