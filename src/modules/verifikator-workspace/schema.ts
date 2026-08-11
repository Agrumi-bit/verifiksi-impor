import { z } from "zod";

import { VKI_SUPPORT_DOC_DEFS, type ApplicationWizardValues, type MachineKondisiValue } from "@/modules/applications/schema";
import { documentFieldCode, type DocumentFieldKey } from "@/modules/company/document-fields";
import { slugify } from "@/lib/document-filename";
import { OWNERSHIP_DOCUMENT_TYPE_LABELS, LEASE_DOCUMENT_TYPE_LABELS } from "@/modules/shared/schema";
import {
  PRODUCT_VERIFICATION_STATUSES,
  MACHINE_VERIFICATION_STATUSES,
  PRODUCTION_QTY_VERIFICATION_STATUSES,
  type DocVerificationStatusValue,
} from "./status";

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
 * Minimal Company shape `buildDocumentChecklist` needs for the Perpajakan
 * items that have no home in `ApplicationWizardValues` — `companyAge` picks
 * between the "Bukti Pajak 3 Tahun" vs "SKT" alternative (Pasal 30 ayat (2)
 * huruf b angka 7), `sktDocumentPath`/`taxProofs` supply their real current
 * paths. Optional on every caller — omitted, both alternatives render so
 * nothing is silently hidden; a verifikator can still mark the wrong one N/A.
 */
export type ChecklistCompanyContext = {
  companyAge: "OVER_3" | "UNDER_3" | null;
  sktDocumentPath: string | null;
  taxProofs: { year: string; type?: string | null; docPath?: string | null }[] | null;
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
export function buildDocumentChecklist(
  payload: ApplicationWizardValues,
  company?: ChecklistCompanyContext | null,
): DocumentChecklistItem[] {
  const items: DocumentChecklistItem[] = [];

  items.push({
    key: "nib",
    label: "NIB (Nomor Induk Berusaha)",
    category: "Legalitas Perusahaan",
    documentPath: payload.nibDocumentPath || null,
  });
  items.push({
    key: "kbli-utama",
    label: "KBLI Utama",
    category: "Legalitas Perusahaan",
    documentPath: payload.kbliDocumentPath || null,
  });
  items.push({
    key: "kbli-pendukung",
    label: "KBLI Pendukung",
    category: "Legalitas Perusahaan",
    documentPath: payload.kbliDocumentPath || null,
  });
  items.push({
    key: "notarial",
    label: "Akta Notaris",
    category: "Legalitas Perusahaan",
    documentPath: payload.notarialDocumentPath || null,
  });
  items.push({
    key: "sk",
    label: "SK Kemenkumham",
    category: "Legalitas Perusahaan",
    documentPath: payload.skDocumentPath || null,
  });
  if (payload.notarialAmendmentDocPath) {
    items.push({
      key: "notarial-amendment",
      label: "Akta Perubahan",
      category: "Legalitas Perusahaan",
      documentPath: payload.notarialAmendmentDocPath,
    });
  }
  items.push({
    key: "npwp",
    label: "NPWP",
    category: "Perpajakan",
    documentPath: payload.npwpDocumentPath || null,
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
      documentPath: payload.sktDocumentPath || company?.sktDocumentPath || null,
    });
  }

  for (const loc of payload.locations ?? []) {
    const label = LOCATION_TYPE_NAMES[loc.locationType] ?? loc.locationType;
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
    materialType: product.materialType,
    hsCode: product.hsCode,
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
  /** Verifikator's own replacement machine photo — overrides the applicant's `photoMesinPath` from the application payload when present. */
  photoPath: z.string().trim().optional(),
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
  kapasitas: string;
  kapasitasSatuan: string;
  kapasitasJam: string;
  kapasitasJamSatuan: string;
  waktuBeroperasi: string;
  /** kapasitasJam × waktuBeroperasi — only computed when both parse as numbers, otherwise "" (never guessed). */
  kapasitasPerHari: string;
  kondisi: MachineKondisiValue | "";
  power: string;
  input: string;
  output: string;
  photoMesinPath: string | null;
};

/** VKI-only — returns [] for VIU applications (payload.machines is never populated). */
export function buildMachineChecklist(payload: ApplicationWizardValues): MachineChecklistItem[] {
  if (payload.verificationType !== "VKI") return [];
  return (payload.machines ?? []).map((m) => {
    const kapasitasJamNum = Number(m.kapasitasJam);
    const waktuBeroperasiNum = Number(m.waktuBeroperasi);
    const kapasitasPerHari =
      m.kapasitasJam && m.waktuBeroperasi && Number.isFinite(kapasitasJamNum) && Number.isFinite(waktuBeroperasiNum)
        ? String(kapasitasJamNum * waktuBeroperasiNum)
        : "";
    return {
      id: m.id,
      nama: m.nama ?? "",
      proses: m.proses ?? m.nama ?? "",
      merk: m.merk ?? "",
      model: m.model ?? "",
      tahun: m.tahun ?? "",
      quantity: m.jumlah ?? "",
      kapasitas: m.kapasitas ?? "",
      kapasitasSatuan: m.kapasitasSatuan ?? "",
      kapasitasJam: m.kapasitasJam ?? "",
      kapasitasJamSatuan: m.kapasitasJamSatuan ?? "",
      waktuBeroperasi: m.waktuBeroperasi ?? "",
      kapasitasPerHari,
      kondisi: m.kondisi ?? "",
      power: m.power ?? "",
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
  productId: string;
  jenisProduk: string;
  hsCode: string;
  berdasarkanIzin: string;
  kapasitasTerpasang: string;
  satuan: string;
};

/** Read-only — Kapasitas Berdasarkan Perizinan has no verifikator decision, VKI-only. */
export function buildCapacityRows(payload: ApplicationWizardValues): CapacityRow[] {
  if (payload.verificationType !== "VKI") return [];
  const products = payload.products ?? [];
  return (payload.capacity ?? []).map((c) => {
    const product = products.find((p) => p.id === c.productId);
    return {
      productId: c.productId,
      jenisProduk: product?.materialType ?? "",
      hsCode: product?.hsCode ?? "",
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
 * Real-data readout of `payload.rawMaterialUsage[]`, joined to the raw
 * material's own info and (via the conversion table) every product it's
 * paired with. No verifikator review system exists for this data yet —
 * unlike products/machines/productionQty, there is no `Assignment` field or
 * status enum for it, so this never carries a `status`.
 */
export function buildRawMaterialUsageChecklist(payload: ApplicationWizardValues): RawMaterialUsageRow[] {
  if (payload.verificationType !== "VKI") return [];
  const rawMaterials = payload.rawMaterials ?? [];
  const products = payload.products ?? [];
  const conversions = payload.rawMaterialConversions ?? [];
  return (payload.rawMaterialUsage ?? []).flatMap((u, i) => {
    const rawMaterial = rawMaterials.find((rm) => rm.id === u.rawMaterialId);
    // A raw material can be paired with several products via the conversion table —
    // emit one row per pairing so each product's usage is its own row, not merged
    // into a single row that only shows the first product found.
    const pairings = conversions.filter((c) => c.rawMaterialId === u.rawMaterialId);
    const productIds = pairings.length > 0 ? pairings.map((c) => c.productId) : [undefined];
    return productIds.map((productId, j) => {
      const product = products.find((p) => p.id === productId);
      const conversion = pairings.find((c) => c.productId === productId);
      return {
        id: `${u.rawMaterialId}:${i}:${j}`,
        rawMaterialId: u.rawMaterialId,
        jenis: rawMaterial?.jenis ?? "",
        hsCode: rawMaterial?.hsCode ?? "",
        hsDesc: rawMaterial?.hsDesc ?? "",
        productId: productId ?? null,
        productName: product?.materialType ?? "",
        conversionId: conversion?.id ?? null,
        penggunaan: u.penggunaan ?? "",
        dataStock: u.dataStock ?? "",
        rencanaKebutuhan: u.rencanaKebutuhan ?? "",
        rencanaKebutuhanDalamNegeri: u.rencanaKebutuhanDalamNegeri ?? "",
        rencanaKebutuhanLuarNegeri: u.rencanaKebutuhanLuarNegeri ?? "",
        rencanaKebutuhanNegaraAsal: u.rencanaKebutuhanNegaraAsal ?? "",
        satuan: u.satuan ?? "",
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
