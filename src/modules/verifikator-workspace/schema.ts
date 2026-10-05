import { z } from "zod";

import {
  MODAL_STATEMENT_LETTER_DOC_DEF,
  NON_INDUSTRI_SUPPORT_DOC_DEFS,
  VKI_SUPPORT_DOC_DEFS,
  type ApplicationWizardValues,
  type MachineKondisiValue,
} from "@/modules/applications/schema";
import { documentFieldCode, type DocumentFieldKey } from "@/modules/company/document-fields";
import { slugify } from "@/lib/document-filename";
import { OWNERSHIP_DOCUMENT_TYPE_LABELS, LEASE_DOCUMENT_TYPE_LABELS, type LocationValues } from "@/modules/shared/schema";
import { normalizeKonsumsiPayload } from "@/modules/applications/viu-schemes/konsumsi/normalize";
import { certificateShareKey, isSameCertificate } from "@/modules/applications/viu-schemes/konsumsi/shared-certificates";
import { isDocumentApplicable, isSchemeRolloutActive, resolveSchemes } from "@/modules/schemes";
import {
  PRODUCT_VERIFICATION_STATUSES,
  MACHINE_VERIFICATION_STATUSES,
  PRODUCTION_QTY_VERIFICATION_STATUSES,
  type DocVerificationStatusValue,
} from "./status";
import type { ChecklistKonsumsiBrandContext } from "./konsumsi-brand-context";

/**
 * The 6 checklist documents that are snapshots of the company's own legal
 * documents (real versioning already lives on `CompanyDocumentVersion`, used
 * by both Company Workspace's profile editor and Verifikator's separate
 * "Verifikasi Dokumen" screen). Every other checklist key is application-only
 * and backed by `ApplicationDocumentVersion` instead — see
 * src/modules/applications/document-versions.ts.
 */
export const COMPANY_MAPPED_DOCUMENT_KEYS: Record<string, DocumentFieldKey> = {
  nib: "nibDocumentPath",
  // "kbli-pendukung" is intentionally NOT company-mapped — KBLI Utama and
  // KBLI Pendukung are independently reviewable checklist items even though
  // they're both drawn from the same physical Daftar KBLI attachment.
  // Keeping only Utama company-mapped preserves the existing shared
  // "Verifikasi Dokumen" review history; Pendukung gets its own
  // application-only ApplicationDocumentVersion trail (starts fresh).
  "kbli-utama": "kbliDocumentPath",
  notarial: "notarialDocumentPath",
  sk: "skDocumentPath",
  "notarial-amendment": "notarialAmendmentDocPath",
  npwp: "npwpDocumentPath",
  skt: "sktDocumentPath",
};

/**
 * Live Company shape `buildDocumentChecklist` needs — `companyAge` picks
 * between the "Bukti Pajak 3 Tahun" vs "SKT" alternative (Pasal 30 ayat (2)
 * huruf b angka 7). The document-path fields let every company-mapped
 * checklist item (see `COMPANY_MAPPED_DOCUMENT_KEYS`) resolve to whatever the
 * company most recently uploaded via Company Workspace's profile editor,
 * instead of staying stuck on the file path frozen into the application
 * payload at original submission. Optional on every caller — omitted, the
 * checklist still renders off the payload snapshot alone.
 */
export type ChecklistCompanyContext = {
  companyAge: "OVER_3" | "UNDER_3" | null;
  nibDocumentPath: string | null;
  kbliDocumentPath: string | null;
  notarialDocumentPath: string | null;
  notarialAmendmentDocPath: string | null;
  skDocumentPath: string | null;
  npwpDocumentPath: string | null;
  sktDocumentPath: string | null;
  taxProofs: { year: string; type?: string | null; docPath?: string | null }[] | null;
  /**
   * Live `Company.locations` — Company Workspace's "Facilities" tab lets a company edit/re-upload
   * a location's ownership/lease/warehouse documents after the application was submitted, same as
   * every other company-mapped field above. `payload.locations` stays a frozen snapshot, so every
   * location-keyed checklist item below must prefer the matching live entry (looked up by `id`,
   * preserved across edits — see `FacilitiesTab`) over the payload's own copy.
   */
  locations: LocationValues[] | null;
};

/**
 * A VIU-industri application's `partnerIndustriEntries` only stores `partnerId` +
 * LHVKI — the partner's own NIB/NPWP/SK live on `Partner.company` (a separate Company
 * row, not the applicant's). This is the resolved shape `buildDocumentChecklist` needs
 * per enabled partner to render checklist items for those documents — see
 * `resolvePartnerContexts` (partner-context.ts) for how callers build the array.
 */
export type ChecklistPartnerContext = {
  partnerId: string;
  companyName: string;
  nibDocumentPath: string | null;
  npwpDocumentPath: string | null;
  skDocumentPath: string | null;
};

function latestTaxProofPath(taxProofs: ChecklistCompanyContext["taxProofs"], type?: string): string | null {
  if (!taxProofs?.length) return null;
  const withDocs = taxProofs.filter((tp) => tp.docPath && (!type || tp.type === type));
  if (!withDocs.length) return null;
  return [...withDocs].sort((a, b) => b.year.localeCompare(a.year))[0].docPath ?? null;
}

/**
 * Short code used to build the display file name (see `document-filename.ts`)
 * for any checklist key `buildDocumentChecklist` can produce. Company-mapped
 * keys reuse the canonical code from `documentFieldCode` (kept in sync with
 * Company Workspace's own document viewer); every other key — location
 * proofs, VKI/VIU support docs — has no static code (their ids are dynamic
 * per-instance), so it's derived from the checklist item's own label.
 */
export function checklistItemCode(key: string, label: string): string {
  if (key in COMPANY_MAPPED_DOCUMENT_KEYS) return documentFieldCode(COMPANY_MAPPED_DOCUMENT_KEYS[key]);
  return slugify(label);
}

/** Prisma's `DocumentVerificationStatus` (company/application version tables) → the verifikator checklist's own 4-state enum. */
export function toChecklistStatus(status: string): DocVerificationStatusValue {
  switch (status) {
    case "VERIFIED":
      return "VALID";
    case "NEED_REVISION":
      return "NEED_REVISION";
    case "REJECTED":
      return "REJECTED";
    case "NOT_APPLICABLE":
      return "NOT_APPLICABLE";
    default:
      return "PENDING"; // NOT_YET_VERIFIED, or EXPIRED (never the latest row in practice)
  }
}

/** The reverse of `toChecklistStatus`, for the subset of statuses a verifikator can actually set (never "PENDING"). */
export function fromChecklistStatus(
  status: Exclude<DocVerificationStatusValue, "PENDING">,
): "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE" {
  return status === "VALID" ? "VERIFIED" : status;
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
/** HS Code text → its master-data commodity group, for resolving a Konsumsi product's Sub
 * Kelompok Komoditas when its own cached `commodityGroupId` is empty (pre-refactor product rows —
 * see buildDocumentChecklist's own "Sertifikat Uji Mutu" section). */
export type ChecklistHsCodeLookup = Map<string, { commodityGroupId: string; commodityName: string }>;

export function buildDocumentChecklist(
  payload: ApplicationWizardValues,
  company?: ChecklistCompanyContext | null,
  partners?: ChecklistPartnerContext[],
  konsumsiBrands?: ChecklistKonsumsiBrandContext[],
  konsumsiHsCodeLookup?: ChecklistHsCodeLookup,
): DocumentChecklistItem[] {
  // Defends every caller (20+ workspaces/routes) against a payload saved before the Step 7/9
  // refactor or the multi-country feature — see normalizeKonsumsiPayload's own comment.
  payload = normalizeKonsumsiPayload(payload);
  const items: DocumentChecklistItem[] = [];

  items.push({
    key: "nib",
    label: "NIB (Nomor Induk Berusaha)",
    category: "Legalitas Perusahaan",
    documentPath: company?.nibDocumentPath || payload.nibDocumentPath || null,
  });
  items.push({
    key: "kbli-utama",
    label: "KBLI Utama",
    category: "Legalitas Perusahaan",
    documentPath: company?.kbliDocumentPath || payload.kbliDocumentPath || null,
  });
  items.push({
    key: "kbli-pendukung",
    label: "KBLI Pendukung",
    category: "Legalitas Perusahaan",
    documentPath: company?.kbliDocumentPath || payload.kbliDocumentPath || null,
  });
  items.push({
    key: "notarial",
    label: "Akta Notaris",
    category: "Legalitas Perusahaan",
    documentPath: company?.notarialDocumentPath || payload.notarialDocumentPath || null,
  });
  items.push({
    key: "sk",
    label: "SK Kemenkumham",
    category: "Legalitas Perusahaan",
    documentPath: company?.skDocumentPath || payload.skDocumentPath || null,
  });
  if (payload.notarialAmendmentDocPath || company?.notarialAmendmentDocPath) {
    items.push({
      key: "notarial-amendment",
      label: "Akta Perubahan",
      category: "Legalitas Perusahaan",
      documentPath: company?.notarialAmendmentDocPath || payload.notarialAmendmentDocPath || null,
    });
  }
  items.push({
    key: "npwp",
    label: "NPWP",
    category: "Perpajakan",
    documentPath: company?.npwpDocumentPath || payload.npwpDocumentPath || null,
  });

  const showTaxProofGroup = company?.companyAge !== "UNDER_3";
  const showSkt = company?.companyAge !== "OVER_3";

  if (showTaxProofGroup) {
    items.push({
      key: "tax-proof-summary",
      label: "Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir",
      category: "Perpajakan",
      documentPath: payload.taxProofSummaryDocumentPath || latestTaxProofPath(company?.taxProofs ?? null),
    });
    items.push({
      key: "tax-support:spt-tahunan",
      label: "Surat Pemberitahuan (SPT) Tahunan Badan 3 Tahun Terakhir",
      category: "Perpajakan",
      documentPath: payload.sptTahunanDocumentPath || latestTaxProofPath(company?.taxProofs ?? null, "spt"),
    });
    items.push({
      key: "tax-support:bpe",
      label: "Bukti Penerimaan Elektronik (BPE) SPT Tahunan",
      category: "Perpajakan",
      documentPath: payload.bpeDocumentPath || latestTaxProofPath(company?.taxProofs ?? null, "bpe"),
    });
    items.push({
      key: "tax-support:skf",
      label: "Surat Keterangan Fiskal (SKF)",
      category: "Perpajakan",
      documentPath: payload.skfDocumentPath || latestTaxProofPath(company?.taxProofs ?? null, "skf"),
    });
    items.push({
      key: "tax-support:ssp",
      label: "Surat Setoran Pajak (SSP)",
      category: "Perpajakan",
      documentPath: payload.sspDocumentPath || latestTaxProofPath(company?.taxProofs ?? null, "ssp"),
    });
    items.push({
      key: "tax-support:pph-badan",
      label: "Bukti Pembayaran Pajak Penghasilan (PPh) Badan",
      category: "Perpajakan",
      documentPath: payload.pphBadanDocumentPath || latestTaxProofPath(company?.taxProofs ?? null, "pph_badan"),
    });
    items.push({
      key: "tax-support:ppn",
      label: "Bukti Pembayaran Pajak Pertambahan Nilai (PPN)",
      category: "Perpajakan",
      documentPath: payload.ppnDocumentPath || latestTaxProofPath(company?.taxProofs ?? null, "ppn"),
    });
    items.push({
      key: "tax-support:e-billing",
      label: "Bukti Setor Pajak melalui e-Billing",
      category: "Perpajakan",
      documentPath: payload.eBillingDocumentPath || latestTaxProofPath(company?.taxProofs ?? null, "e_billing"),
    });
  }
  if (showSkt) {
    items.push({
      key: "skt",
      label: "Surat Keterangan Terdaftar (SKT) Pajak",
      category: "Perpajakan",
      documentPath: company?.sktDocumentPath || payload.sktDocumentPath || null,
    });
  }

  const locationTypeById: Record<string, string> = {};
  for (const payloadLoc of payload.locations ?? []) {
    // Prefer the live Company.locations entry (same id, edited via Company Workspace's
    // Facilities tab after submission) over the frozen payload snapshot — see
    // `ChecklistCompanyContext.locations` above.
    const loc = company?.locations?.find((l) => l.id === payloadLoc.id) ?? payloadLoc;
    const label = LOCATION_TYPE_NAMES[loc.locationType] ?? loc.locationType;
    locationTypeById[loc.id] = loc.locationType;
    if (loc.buildingStatus === "MILIK_SENDIRI") {
      for (const entry of loc.ownershipDocuments ?? []) {
        items.push({
          key: `location:${loc.id}:ownership:${entry.type}`,
          label: `${OWNERSHIP_DOCUMENT_TYPE_LABELS[entry.type]} — ${label}`,
          category: "Dokumen Lokasi",
          documentPath: entry.documentPath || null,
        });
      }
    } else {
      for (const entry of loc.leaseDocuments ?? []) {
        items.push({
          key: `location:${loc.id}:lease:${entry.type}`,
          label: `${LEASE_DOCUMENT_TYPE_LABELS[entry.type]} — ${label}`,
          category: "Dokumen Lokasi",
          documentPath: entry.documentPath || null,
        });
      }
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

  if (payload.verificationType === "VKI") {
    for (const def of VKI_SUPPORT_DOC_DEFS) {
      if (def.type === "electricity") {
        for (const month of payload.electricityMonths ?? []) {
          items.push({
            key: `vki-support:${def.key}:${month.id}`,
            label: `${def.title} — ${month.bulan || month.id}`,
            category: "Dokumen Pendukung VKI",
            documentPath: month.documentPath || null,
          });
        }
        continue;
      }
      if (def.type === "tenagaKerja") {
        items.push({
          key: `vki-support:${def.key}`,
          label: def.title,
          category: "Tenaga Kerja",
          documentPath: payload.tenagaKerjaDocumentPath || null,
        });
        continue;
      }
      const entry = (payload.vkiSupportDocs ?? []).find((d) => d.key === def.key);
      items.push({
        key: `vki-support:${def.key}`,
        label: def.title,
        // "Memiliki/Menguasai" is about building/facility ownership, not a
        // generic declaration — it belongs with the location documents it
        // corroborates rather than the other Surat Pernyataan items.
        category: def.key === "memiliki-menguasai" ? "Dokumen Lokasi" : "Surat Pernyataan",
        documentPath: entry?.documentPath || null,
      });
    }
  } else {
    // Bahan Baku Industri/Non Industri's own "Dokumen Pendukung" checklist, reading
    // `nonIndustriDocuments` — gated the same as Step5SupportDocument's own
    // `needsIndustriModalDocs` so a Barang-Konsumsi-only application (which never renders or
    // writes to this field) doesn't get an irrelevant, always-empty "Dokumen Pendukung" category
    // duplicating its own "Bukti Kemampuan Finansial — Konsumsi" one below.
    if (payload.importTypes?.includes("BAHAN_BAKU_INDUSTRI") || payload.importTypes?.includes("BAHAN_BAKU_NON_INDUSTRI")) {
      for (const def of [MODAL_STATEMENT_LETTER_DOC_DEF, ...NON_INDUSTRI_SUPPORT_DOC_DEFS]) {
        const entry = (payload.nonIndustriDocuments ?? []).find((d) => d.key === def.key);
        items.push({
          key: `nonindustri-support:${def.key}`,
          label: `${def.title} (${def.priority === "UTAMA" ? "Utama" : "Pendukung"})`,
          category: "Dokumen Pendukung",
          documentPath: entry?.documentPath || null,
        });
      }
    }
    // Barang Konsumsi's OWN Bukti Kemampuan Finansial — a separate `konsumsiFinancialDocuments`
    // array (see konsumsi/schema.ts), own key prefix and category, so a mixed Industri+Konsumsi
    // application shows two independent checklists instead of one shared one. Gated on Barang
    // Konsumsi actually being selected (unlike the loop above) so an Industri/Non-Industri-only
    // application doesn't get an irrelevant, always-empty checklist category. Unlike the
    // Industri/Non-Industri loop above, only the UTAMA statement letter is unconditional — a
    // PENDUKUNG evidence type the applicant never picked isn't a real requirement for this
    // application and must not show up as an unreviewed/"Kurang" item here.
    if (payload.importTypes?.includes("BARANG_KONSUMSI")) {
      const konsumsiFinancialDocs = payload.konsumsiFinancialDocuments ?? [];
      for (const def of [MODAL_STATEMENT_LETTER_DOC_DEF, ...NON_INDUSTRI_SUPPORT_DOC_DEFS]) {
        const entry = konsumsiFinancialDocs.find((d) => d.key === def.key);
        if (def.priority === "PENDUKUNG" && !entry?.enabled) continue;
        items.push({
          key: `konsumsi-financial:${def.key}`,
          label: `${def.title} (${def.priority === "UTAMA" ? "Utama" : "Pendukung"})`,
          category: "Bukti Kemampuan Finansial — Konsumsi",
          documentPath: entry?.documentPath || null,
        });
      }
    }
    for (const doc of payload.konsumsiDocuments ?? []) {
      items.push({
        key: `support:${doc.id}`,
        label: doc.label,
        category: "Dokumen Pendukung",
        documentPath: doc.documentPath || null,
      });
    }
  }

  // VIU-industri's "Partner Industri" step only lets a company enable a partner it already
  // picked from the Directory — NIB/NPWP/SK checklist items resolve against that partner's own
  // Company row (via `partners`, resolved by the caller); LHVKI is the one document actually
  // captured on the application itself. No-op when the application has no enabled partners.
  for (const entry of payload.partnerIndustriEntries ?? []) {
    if (!entry.enabled) continue;
    const partner = partners?.find((p) => p.partnerId === entry.partnerId);
    const partnerLabel = partner?.companyName ?? "Partner";
    items.push({
      key: `partner:${entry.partnerId}:nib`,
      label: `NIB Partner — ${partnerLabel}`,
      category: "Dokumen Partner Industri",
      documentPath: partner?.nibDocumentPath ?? null,
    });
    items.push({
      key: `partner:${entry.partnerId}:npwp`,
      label: `NPWP Partner — ${partnerLabel}`,
      category: "Dokumen Partner Industri",
      documentPath: partner?.npwpDocumentPath ?? null,
    });
    items.push({
      key: `partner:${entry.partnerId}:sk`,
      label: `SK Kemenkumham Partner — ${partnerLabel}`,
      category: "Dokumen Partner Industri",
      documentPath: partner?.skDocumentPath ?? null,
    });
    items.push({
      key: `partner:${entry.partnerId}:lhvki`,
      label: `LHVKI — ${partnerLabel}`,
      category: "Dokumen Partner Industri",
      documentPath: entry.lhvkiDocumentPath || null,
    });
  }

  // Barang Konsumsi's "Dokumen Merek" — the brand's own bukti merek file and any relationship
  // document its applicantRole actually requires (Step "Merek yang Digunakan"). Brand identity/
  // ownership itself lives on `Merk`, not the application payload, so this needs `konsumsiBrands`
  // (resolved by the caller via `resolveKonsumsiBrandContexts` — a live DB read, same pattern as
  // `partners` above) rather than anything already on `payload`. Omitted entirely when the
  // caller doesn't pass that context (e.g. a workspace not yet wired up for it) rather than
  // rendering with blank brand names.
  if (payload.importTypes?.includes("BARANG_KONSUMSI") && konsumsiBrands) {
    const brandContextById = new Map(konsumsiBrands.map((brand) => [brand.brandId, brand]));
    for (const entry of payload.applicationBrands ?? []) {
      const brand = brandContextById.get(entry.brandId);
      const brandLabel = brand?.brandName ?? entry.brandId;
      // Pasal 37 ayat (2) huruf c angka 2 huruf f) — sertifikat merek / tanda pendaftaran merek.
      items.push({
        key: `konsumsi-brand:${entry.brandId}:evidence`,
        label: `Sertifikat Merek — ${brandLabel}`,
        category: "Dokumen Merek",
        documentPath: brand?.registrationDocumentPath ?? null,
      });
      // Pasal 37 ayat (3)–(5) — only when the applicant is not the brand owner.
      if (entry.applicantRole !== "OWNER") {
        for (const requirement of brand?.requiredRelationshipDocuments ?? []) {
          items.push({
            key: `konsumsi-brand:${entry.brandId}:rel:${requirement.code}`,
            label: `${requirement.label} — ${brandLabel}`,
            category: "Dokumen Merek",
            documentPath: entry.relationshipDocuments?.[requirement.code]?.filePath ?? null,
          });
        }
      }
    }
  }

  // Barang Konsumsi's "Dokumen Label" — Pasal 37 ayat (2) huruf c angka 2 huruf h): one statement +
  // its label documentation, once per Application (Step "Dokumen Label Produk").
  if (payload.importTypes?.includes("BARANG_KONSUMSI")) {
    items.push({
      key: "konsumsi-label:statement",
      label: "Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia",
      category: "Dokumen Label",
      documentPath: payload.labelStatementDocument?.filePath ?? null,
    });
    items.push({
      key: "konsumsi-label:documentation",
      label: "Dokumentasi Label Produk",
      category: "Dokumen Label",
      documentPath: payload.labelDocumentationDocument?.filePath ?? null,
    });
  }

  //
  // One certificate shared by several Sub Kelompok of a Brand (shared-certificates.ts) is ONE row
  // — keyed by its first group, labelled with every group it covers — so one review covers all.
  if (payload.importTypes?.includes("BARANG_KONSUMSI") && konsumsiBrands) {
    const brandContextById = new Map(konsumsiBrands.map((brand) => [brand.brandId, brand]));
    const certificates = payload.productGroupCertificates ?? [];
    const certificateByGroupKey = new Map(certificates.map((certificate) => [`${certificate.brandId}|${certificate.commodityGroupId}`, certificate]));
    const groups: { brandId: string; commodityGroupId: string; commodityName: string }[] = [];
    const seenGroupKeys = new Set<string>();
    for (const product of payload.konsumsiProducts ?? []) {
      let commodityGroupId = product.commodityGroupId;
      let commodityName = product.commodityName;
      if (!commodityGroupId) {
        const resolved = konsumsiHsCodeLookup?.get(product.hsCode);
        if (!resolved) continue; // can't place this product in any group — nothing to show
        commodityGroupId = resolved.commodityGroupId;
        commodityName = resolved.commodityName;
      }
      const groupKey = `${product.brandId}|${commodityGroupId}`;
      if (seenGroupKeys.has(groupKey)) continue;
      seenGroupKeys.add(groupKey);
      groups.push({ brandId: product.brandId, commodityGroupId, commodityName: commodityName ?? commodityGroupId });
    }

    const emittedShareKeys = new Set<string>();
    for (const group of groups) {
      const certificate = certificateByGroupKey.get(`${group.brandId}|${group.commodityGroupId}`);
      let commodityNames = [group.commodityName];
      if (certificate?.filePath) {
        const shareKey = `${group.brandId}::${certificateShareKey(certificate)}`;
        if (emittedShareKeys.has(shareKey)) continue;
        emittedShareKeys.add(shareKey);
        commodityNames = groups
          .filter((g) => {
            const other = certificateByGroupKey.get(`${g.brandId}|${g.commodityGroupId}`);
            return Boolean(other?.filePath) && isSameCertificate(other!, certificate);
          })
          .map((g) => g.commodityName);
      }
      const brandLabel = brandContextById.get(group.brandId)?.brandName ?? group.brandId;
      items.push({
        key: `konsumsi-qt:${group.brandId}:${group.commodityGroupId}`,
        label: `Sertifikat Uji Mutu — ${brandLabel} · ${commodityNames.join(", ")}`,
        category: "Sertifikat Uji Mutu",
        documentPath: certificate?.filePath || null,
      });
    }
  }

  // Per-scheme refactor: once every scheme of this application is served by src/modules/schemes,
  // only the documents those schemes define are listed — e.g. a legacy `support:{id}` row or a
  // Pabrik location document never shows on a VIU Barang Konsumsi application. Hidden, never deleted.
  const schemes = resolveSchemes(payload);
  if (isSchemeRolloutActive(schemes)) {
    return items.filter((item) => isDocumentApplicable(schemes, item.key, { locationTypeById }));
  }
  return items;
}

export type ProductChecklistItem = {
  id: string;
  kategori: string;
  materialType: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  estimatedVolume: string;
  volumeUnit: string;
  intendedUse: string;
  photoPath: string | null;
};

export function buildProductChecklist(payload: ApplicationWizardValues): ProductChecklistItem[] {
  return (payload.products ?? []).map((product) => ({
    id: product.id,
    kategori: product.kategori ?? "",
    materialType: product.materialType ?? "",
    hsCode: product.hsCode ?? "",
    hsDesc: product.hsDesc ?? "",
    deskripsi: product.deskripsi ?? "",
    estimatedVolume: product.estimatedVolume ?? "",
    volumeUnit: product.volumeUnit ?? "",
    intendedUse: product.intendedUse ?? "",
    photoPath: product.photoPath || null,
  }));
}

export type RawMaterialChecklistItem = {
  id: string;
  jenis: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  photoPath: string | null;
};

/**
 * Unlike products/machines, raw materials have no verifikator review/status
 * system yet (no `Assignment.rawMaterialVerifications` field exists) — this
 * is a pure data readout, not a checklist with a decision to make.
 */
export function buildRawMaterialChecklist(payload: ApplicationWizardValues): RawMaterialChecklistItem[] {
  return (payload.rawMaterials ?? []).map((rm) => ({
    id: rm.id,
    jenis: rm.jenis ?? "",
    hsCode: rm.hsCode ?? "",
    hsDesc: rm.hsDesc ?? "",
    deskripsi: rm.deskripsi ?? "",
    photoPath: rm.photoPath || null,
  }));
}

export const machineVerificationEntrySchema = z.object({
  status: z.enum(MACHINE_VERIFICATION_STATUSES).default("PENDING"),
  note: z.string().trim().optional(),
  /** Currently selected cover/thumbnail photo — overrides the applicant's `photoMesinPath` from the application payload when present. Always one of `photoPaths` (or the applicant's original) once a gallery exists. */
  photoPath: z.string().trim().optional(),
  /** Additional photos the verifikator has taken/uploaded for this machine — the applicant's original `photoMesinPath` is always shown alongside these, not duplicated in here. */
  photoPaths: z.array(z.string().trim()).optional(),
  /** On-site findings, distinct from `payload.machines[].jumlah` (what the applicant claimed in
   * the application) — how many of this machine verifikator actually found installed/running
   * vs. present but not active, plus a remark (typically explaining the inactive count). */
  jumlahTerpasang: z.string().trim().optional(),
  jumlahTidakAktif: z.string().trim().optional(),
  keteranganJumlah: z.string().trim().optional(),
  verifiedAt: z.string().trim().optional(),
});
export type MachineVerificationEntry = z.infer<typeof machineVerificationEntrySchema>;

export const machineVerificationsSchema = z.record(z.string(), machineVerificationEntrySchema);
export type MachineVerifications = z.infer<typeof machineVerificationsSchema>;

export function emptyMachineVerifications(): MachineVerifications {
  return {};
}

export type MachineChecklistItem = {
  id: string;
  nama: string;
  proses: string;
  merk: string;
  model: string;
  tahun: string;
  quantity: string;
  quantitySatuan: string;
  kapasitas: string;
  kapasitasSatuan: string;
  kapasitasJam: string;
  kapasitasJamSatuan: string;
  waktuBeroperasi: string;
  /** waktuBeroperasi × kapasitas (kapasitas = jumlah × kapasitasJam) — only computed when all three parse as numbers, otherwise "" (never guessed). */
  kapasitasPerHari: string;
  hariEfektifPerTahun: string;
  /** kapasitasPerHari × hariEfektifPerTahun — only computed when both parse as numbers, otherwise "" (never guessed). */
  kapasitasPerTahun: string;
  kondisi: MachineKondisiValue | "";
  power: string;
  powerSatuan: string;
  input: string;
  output: string;
  photoMesinPath: string | null;
};

/** VKI-only — returns [] for VIU applications (payload.machines is never populated). */
export function buildMachineChecklist(payload: ApplicationWizardValues): MachineChecklistItem[] {
  if (payload.verificationType !== "VKI") return [];
  return (payload.machines ?? []).map((m) => {
    const jumlahNum = Number(m.jumlah);
    const kapasitasJamNum = Number(m.kapasitasJam);
    const waktuBeroperasiNum = Number(m.waktuBeroperasi);
    // Kapasitas per Hari = waktu beroperasi × Kapasitas Produksi, where Kapasitas Produksi = jumlah × kapasitas/jam.
    const kapasitasPerHari =
      m.jumlah &&
      m.kapasitasJam &&
      m.waktuBeroperasi &&
      Number.isFinite(jumlahNum) &&
      Number.isFinite(kapasitasJamNum) &&
      Number.isFinite(waktuBeroperasiNum)
        ? String(jumlahNum * kapasitasJamNum * waktuBeroperasiNum)
        : "";
    // Kapasitas per Tahun = Kapasitas per Hari × jumlah hari efektif per tahun.
    const hariEfektifNum = Number(m.hariEfektifPerTahun);
    const kapasitasPerTahun =
      kapasitasPerHari && m.hariEfektifPerTahun && Number.isFinite(hariEfektifNum)
        ? String(Number(kapasitasPerHari) * hariEfektifNum)
        : "";
    return {
      id: m.id,
      nama: m.nama ?? "",
      proses: m.proses ?? m.nama ?? "",
      merk: m.merk ?? "",
      model: m.model ?? "",
      tahun: m.tahun ?? "",
      quantity: m.jumlah ?? "",
      quantitySatuan: m.jumlahSatuan ?? "",
      kapasitas: m.kapasitas ?? "",
      kapasitasSatuan: m.kapasitasSatuan ?? "",
      kapasitasJam: m.kapasitasJam ?? "",
      kapasitasJamSatuan: m.kapasitasJamSatuan ?? "",
      waktuBeroperasi: m.waktuBeroperasi ?? "",
      kapasitasPerHari,
      hariEfektifPerTahun: m.hariEfektifPerTahun ?? "",
      kapasitasPerTahun,
      kondisi: m.kondisi ?? "",
      power: m.power ?? "",
      powerSatuan: m.powerSatuan ?? "",
      input: m.input ?? "",
      output: m.output ?? "",
      photoMesinPath: m.photoMesinPath || null,
    };
  });
}

export const productionQtyVerificationEntrySchema = z.object({
  status: z.enum(PRODUCTION_QTY_VERIFICATION_STATUSES).default("PENDING"),
  keterangan: z.string().trim().optional(),
  /** Verifikator's own written conclusion sentence — only meaningful on whole-section `summary:<section>` entries, shown in the report's kesimpulan box instead of the auto-generated one when present. */
  kesimpulan: z.string().trim().optional(),
  verifiedAt: z.string().trim().optional(),
});
export type ProductionQtyVerificationEntry = z.infer<typeof productionQtyVerificationEntrySchema>;

export const productionQtyVerificationsSchema = z.record(z.string(), productionQtyVerificationEntrySchema);
export type ProductionQtyVerifications = z.infer<typeof productionQtyVerificationsSchema>;

export function emptyProductionQtyVerifications(): ProductionQtyVerifications {
  return {};
}

export type CapacityRow = {
  id: string;
  jenisProduk: string;
  kbliCode: string;
  kbliDescription: string;
  berdasarkanIzin: string;
  kapasitasTerpasang: string;
  satuan: string;
};

/**
 * Free-standing list, NOT 1:1 with payload.products — perizinan (izin usaha) is granted per
 * KBLI, not per HS Code, and one KBLI commonly covers several product variants (e.g. a textile
 * spinning license producing many yarn types under one KBLI). jenisProduk/kbliCode/
 * kbliDescription live on the row itself, not joined from a product. Verifikator manages this
 * list directly (add/edit/delete); no verifikator decision status, VKI-only.
 *
 * `c.productId` fallback covers rows created before this changed (when capacity rows were
 * auto-seeded 1:1 per product and had no id of their own) — every such row has a productId,
 * so it doubles as a stable identity until the row is next edited and gets a real id. There is
 * no product-side fallback for kbliCode/kbliDescription (HS Code and KBLI are different
 * classification systems, so a linked product's HS Code is not a stand-in for its KBLI) — a
 * legacy row simply starts with those two fields blank until filled in once.
 */
export function buildCapacityRows(payload: ApplicationWizardValues): CapacityRow[] {
  if (payload.verificationType !== "VKI") return [];
  const products = payload.products ?? [];
  return (payload.capacity ?? []).map((c) => {
    const linkedProduct = !c.jenisProduk ? products.find((p) => p.id === c.productId) : undefined;
    return {
      id: c.id ?? c.productId ?? crypto.randomUUID(),
      jenisProduk: c.jenisProduk || linkedProduct?.materialType || "",
      kbliCode: c.kbliCode ?? "",
      kbliDescription: c.kbliDescription ?? "",
      berdasarkanIzin: c.berdasarkanIzin ?? "",
      kapasitasTerpasang: c.kapasitasTerpasang ?? "",
      satuan: c.satuan ?? "",
    };
  });
}

export type ProductionQtyChecklistItem = {
  key: string;
  section: "sebelumnya" | "rencana";
  productId: string;
  jenisProduk: string;
  deskripsiProduk: string;
  hsCode: string;
  jumlah: string;
  satuan: string;
};

/**
 * `payload.productionQty` carries both perTahunSebelumnya and perTahunRencana
 * on the same row — split into two verifiable rows (one per section) to
 * match the design's two separate tables, keyed "section:productId" so
 * verifikator decisions on one don't clobber the other.
 */
export function buildProductionQtyChecklist(payload: ApplicationWizardValues): ProductionQtyChecklistItem[] {
  if (payload.verificationType !== "VKI") return [];
  const products = payload.products ?? [];
  const items: ProductionQtyChecklistItem[] = [];
  for (const pq of payload.productionQty ?? []) {
    const product = products.find((p) => p.id === pq.productId);
    const base = {
      productId: pq.productId,
      jenisProduk: product?.materialType ?? "",
      deskripsiProduk: product?.deskripsi ?? "",
      hsCode: product?.hsCode ?? "",
      satuan: pq.satuan ?? "",
    };
    items.push({ key: `sebelumnya:${pq.productId}`, section: "sebelumnya", jumlah: pq.perTahunSebelumnya ?? "", ...base });
    items.push({ key: `rencana:${pq.productId}`, section: "rencana", jumlah: pq.perTahunRencana ?? "", ...base });
  }
  return items;
}

export type RawMaterialUsageRow = {
  id: string;
  rawMaterialId: string;
  jenis: string;
  hsCode: string;
  hsDesc: string;
  /** The raw material's own description (Product Verification's "Deskripsi Bahan Baku") — distinct from hsDesc (that field's "Deskripsi HS Code"). */
  deskripsi: string;
  productId: string | null;
  productName: string;
  conversionId: string | null;
  penggunaan: string;
  dataStock: string;
  rencanaKebutuhan: string;
  rencanaKebutuhanDalamNegeri: string;
  rencanaKebutuhanLuarNegeri: string;
  rencanaKebutuhanNegaraAsal: string;
  satuan: string;
};

/**
 * Real-data readout of raw material usage, joined to the raw material's own
 * info and (via the conversion table) every product it's paired with. No
 * verifikator review system exists for this data yet — unlike
 * products/machines/productionQty, there is no `Assignment` field or status
 * enum for it, so this never carries a `status`.
 *
 * Driven by the UNION of `payload.rawMaterialUsage` (existing usage figures)
 * and `payload.rawMaterialConversions` (raw material <-> product links,
 * created/edited in Product Verification) — not `rawMaterialUsage` alone.
 * A raw material linked to a product there has no reason to also have a
 * usage row yet (nothing seeds one), so reading `rawMaterialUsage` alone
 * left it invisible here even though it's clearly "in use." Every raw
 * material actually tied to a product now always shows up, with blank
 * penggunaan/dataStock/rencanaKebutuhan fields when no usage row exists —
 * same "starts blank, fill in once" pattern as legacy capacity rows.
 */
export function buildRawMaterialUsageChecklist(payload: ApplicationWizardValues): RawMaterialUsageRow[] {
  if (payload.verificationType !== "VKI") return [];
  const rawMaterials = payload.rawMaterials ?? [];
  const products = payload.products ?? [];
  const conversions = payload.rawMaterialConversions ?? [];
  const usageByRawMaterialId = new Map((payload.rawMaterialUsage ?? []).map((u) => [u.rawMaterialId, u]));
  const rawMaterialIds = new Set<string>([
    ...conversions.map((c) => c.rawMaterialId).filter((rmId): rmId is string => Boolean(rmId)),
    ...usageByRawMaterialId.keys(),
  ]);

  return Array.from(rawMaterialIds).flatMap((rawMaterialId, i) => {
    const rawMaterial = rawMaterials.find((rm) => rm.id === rawMaterialId);
    const usage = usageByRawMaterialId.get(rawMaterialId);
    // A raw material can be paired with several products via the conversion table —
    // emit one row per pairing so each product's usage is its own row, not merged
    // into a single row that only shows the first product found.
    const pairings = conversions.filter((c) => c.rawMaterialId === rawMaterialId);
    const productIds = pairings.length > 0 ? pairings.map((c) => c.productId) : [undefined];
    return productIds.map((productId, j) => {
      const product = products.find((p) => p.id === productId);
      const conversion = pairings.find((c) => c.productId === productId);
      return {
        id: `${rawMaterialId}:${i}:${j}`,
        rawMaterialId,
        jenis: rawMaterial?.jenis ?? "",
        hsCode: rawMaterial?.hsCode ?? "",
        hsDesc: rawMaterial?.hsDesc ?? "",
        deskripsi: rawMaterial?.deskripsi ?? "",
        productId: productId ?? null,
        productName: product?.materialType ?? "",
        conversionId: conversion?.id ?? null,
        penggunaan: usage?.penggunaan ?? "",
        dataStock: usage?.dataStock ?? "",
        rencanaKebutuhan: usage?.rencanaKebutuhan ?? "",
        rencanaKebutuhanDalamNegeri: usage?.rencanaKebutuhanDalamNegeri ?? "",
        rencanaKebutuhanLuarNegeri: usage?.rencanaKebutuhanLuarNegeri ?? "",
        rencanaKebutuhanNegaraAsal: usage?.rencanaKebutuhanNegaraAsal ?? "",
        satuan: usage?.satuan ?? "",
      };
    });
  });
}

export type RawMaterialConversionRow = {
  id: string;
  productId: string | null;
  productName: string;
  productHsCode: string;
  rawMaterialId: string | null;
  jenis: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  photoPath: string | null;
  kategori: string;
  volumeProduksiJumlah: string;
  volumeProduksiSatuan: string;
  volumeKebutuhanJumlah: string;
  volumeKebutuhanSatuan: string;
  rasioKonversi: string;
  keterangan: string;
};

/** Real conversion ratios already captured on `payload.rawMaterialConversions[]` — no separate review system exists. */
export function buildRawMaterialConversionRows(payload: ApplicationWizardValues): RawMaterialConversionRow[] {
  if (payload.verificationType !== "VKI") return [];
  const products = payload.products ?? [];
  const rawMaterials = payload.rawMaterials ?? [];
  return (payload.rawMaterialConversions ?? []).map((c) => {
    const product = products.find((p) => p.id === c.productId);
    const rawMaterial = rawMaterials.find((rm) => rm.id === c.rawMaterialId);
    return {
      id: c.id,
      productId: c.productId ?? null,
      productName: product?.materialType ?? "",
      productHsCode: product?.hsCode ?? "",
      rawMaterialId: c.rawMaterialId ?? null,
      jenis: rawMaterial?.jenis ?? "",
      hsCode: rawMaterial?.hsCode ?? "",
      hsDesc: rawMaterial?.hsDesc ?? "",
      deskripsi: rawMaterial?.deskripsi ?? "",
      photoPath: rawMaterial?.photoPath || null,
      kategori: c.kategori ?? "",
      volumeProduksiJumlah: c.volumeProduksiJumlah ?? "",
      volumeProduksiSatuan: c.volumeProduksiSatuan ?? "",
      volumeKebutuhanJumlah: c.volumeKebutuhanJumlah ?? "",
      volumeKebutuhanSatuan: c.volumeKebutuhanSatuan ?? "",
      rasioKonversi: c.rasioKonversi ?? "",
      keterangan: c.keterangan ?? "",
    };
  });
}

export type SalesRow = {
  id: string;
  productId: string;
  productName: string;
  deskripsi: string;
  hsCode: string;
  dalamNegeri: string;
  luarNegeri: string;
  negaraTujuan: string;
  satuan: string;
};

/** Real sales figures from `payload.sales[]`, joined to product info. No verifikator review system exists for this data. */
export function buildSalesChecklist(payload: ApplicationWizardValues): SalesRow[] {
  if (payload.verificationType !== "VKI") return [];
  const products = payload.products ?? [];
  return (payload.sales ?? []).map((s) => {
    const product = products.find((p) => p.id === s.productId);
    return {
      id: s.productId,
      productId: s.productId,
      productName: product?.materialType ?? "",
      deskripsi: product?.deskripsi ?? "",
      hsCode: product?.hsCode ?? "",
      dalamNegeri: s.dalamNegeri ?? "",
      luarNegeri: s.luarNegeri ?? "",
      negaraTujuan: s.negaraTujuan ?? "",
      satuan: s.satuan ?? "",
    };
  });
}
