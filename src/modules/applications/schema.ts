import { z } from "zod";
import {
  companyProfileSchema,
  createEmptyLocation,
  legalInformationSchema,
  locationSchema,
  locationsSchema,
  BUILDING_STATUSES,
  INVESTMENT_STATUSES,
  LOCATION_TYPES,
  WAREHOUSE_REGISTRATION_TYPES,
  type BuildingStatus,
  type InvestmentStatus,
  type LocationType,
  type LocationValues,
  type WarehouseRegistrationType,
} from "@/modules/shared/schema";
import { taxProofEntrySchema, COMPANY_AGES } from "@/modules/company/schema";
import { brandsUsedSchema, brandQualityTestsSchema, konsumsiDocumentsSchema } from "./viu-schemes/konsumsi/schema";
import { applyKonsumsiSubmitRules } from "./viu-schemes/konsumsi/submit-rules";
import { KONSUMSI_STEP_FIELD_NAMES } from "./viu-schemes/konsumsi/step-field-names";

export {
  companyProfileSchema,
  createEmptyLocation,
  legalInformationSchema,
  locationSchema,
  locationsSchema,
  BUILDING_STATUSES,
  INVESTMENT_STATUSES,
  LOCATION_TYPES,
  WAREHOUSE_REGISTRATION_TYPES,
};
export type {
  BuildingStatus,
  InvestmentStatus,
  LocationType,
  LocationValues,
  WarehouseRegistrationType,
};

export const VERIFICATION_TYPES = ["VKI", "VIU"] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const APPLICATION_CATEGORIES = ["NEW", "RENEWAL", "AMENDMENT"] as const;
export type ApplicationCategory = (typeof APPLICATION_CATEGORIES)[number];

export const IMPORT_TYPES = [
  "BAHAN_BAKU_INDUSTRI",
  "BAHAN_BAKU_NON_INDUSTRI",
  "BARANG_KONSUMSI",
] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

const requiredString = (message: string) => z.string().trim().min(1, message);

/** Verification type, application category, and import types — Application Information step. */
export const applicationMetaSchema = z.object({
  verificationType: z.enum(VERIFICATION_TYPES, {
    message: "Pilih tipe verifikasi",
  }),
  applicationCategory: z.enum(APPLICATION_CATEGORIES, {
    message: "Pilih kategori aplikasi",
  }),
  importTypes: z.array(z.enum(IMPORT_TYPES)),
});

/** Company identity and contact info — Company Information step. */
export const companySchema = companyProfileSchema.extend({
  companyId: requiredString("Pilih perusahaan terdaftar"),
  companyApiType: z.string().trim().optional(),
});
export const kbliEntrySchema = z.object({
  code: requiredString("Kode KBLI wajib diisi"),
  description: requiredString("Deskripsi KBLI wajib diisi"),
});

/**
 * VKI-only extras not covered by the shared legalInformationSchema/companyProfileSchema —
 * SK Kemenkumham + NPWP, mirrored from the Company model's own fields (companyLegalSchema /
 * companyTaxSchema in modules/company/schema.ts). Auto-filled by CompanyPickerField, displayed
 * read-only in the VKI wizard's Legal/Tax steps; never manually entered here.
 */
export const companyLegalExtraSchema = z.object({
  skNumber: z.string().trim().optional(),
  skDate: z.string().trim().optional(),
  skDocumentPath: z.string().trim().optional(),
  notarialAmendmentNumber: z.string().trim().optional(),
  notarialAmendmentDate: z.string().trim().optional(),
  notarialAmendmentAuthority: z.string().trim().optional(),
  notarialAmendmentDocPath: z.string().trim().optional(),
  npwpNumber: z.string().trim().optional(),
  npwpDocumentPath: z.string().trim().optional(),
  companyAge: z.enum(COMPANY_AGES).nullable().optional(),
  taxProofs: z.array(taxProofEntrySchema).optional(),
  sktNumber: z.string().trim().optional(),
  sktIssuer: z.string().trim().optional(),
  sktDate: z.string().trim().optional(),
  sktDocumentPath: z.string().trim().optional(),
});

/**
 * "Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir" supporting evidence — no
 * wizard step or company-profile tab collects these yet (unlike the fields
 * above), so every field here starts empty. They exist purely as backing
 * paths for the verifikator's Perpajakan checklist (Documents Verification
 * tab), fillable only via verifikator upload-on-behalf or marked N/A.
 */
export const taxSupportDocumentsSchema = z.object({
  taxProofSummaryDocumentPath: z.string().trim().optional(),
  sptTahunanDocumentPath: z.string().trim().optional(),
  bpeDocumentPath: z.string().trim().optional(),
  skfDocumentPath: z.string().trim().optional(),
  sspDocumentPath: z.string().trim().optional(),
  pphBadanDocumentPath: z.string().trim().optional(),
  ppnDocumentPath: z.string().trim().optional(),
  eBillingDocumentPath: z.string().trim().optional(),
});

export const supportDocumentSchema = z.object({
  id: z.string(),
  label: requiredString("Nama dokumen wajib diisi"),
  documentPath: requiredString("Dokumen wajib diunggah"),
});

/** One card per Partner Industri — `enabled` is the on/off toggle, supports multiple partners per application. */
export const partnerIndustriEntrySchema = z.object({
  partnerId: requiredString("Partner wajib dipilih"),
  enabled: z.boolean(),
  lhvki: z.string().trim().optional(),
  lhvkiDocumentPath: z.string().trim().optional(),
});
export type PartnerIndustriEntryValues = z.infer<typeof partnerIndustriEntrySchema>;

// Konsumsi-exclusive schemas live in ./viu-schemes/konsumsi/schema — imported
// above for this file's own internal composition (`applicationWizardShape`
// below) only. No longer re-exported from here: every former consumer
// (components, hooks) has been migrated to import directly from the
// konsumsi module (see viu-schemes/konsumsi/schema.ts for ownership). New
// code should do the same rather than reaching for these via schema.ts.

export type NonIndustriDocPriority = "UTAMA" | "PENDUKUNG";

export type NonIndustriSupportDocDef = {
  key: string;
  title: string;
  /** What the document proves — shown as the field's hint. */
  desc: string;
  priority: NonIndustriDocPriority;
};

/** The only unconditionally required document in the Bukti Kemampuan Finansial section — a sworn
 * statement of working-capital ownership. Kept out of `NON_INDUSTRI_SUPPORT_DOC_DEFS` (the "pick
 * one evidence type" group below) since it's not a choice: every applicant uploads this one, full
 * stop, then additionally picks ONE supporting evidence document from the list. Still stored in
 * the same `nonIndustriDocuments` array (keyed by `MODAL_STATEMENT_LETTER_DOC_DEF.key`) so the
 * existing document-version tracking (`nonindustri-support:<key>`) and verifikator checklist both
 * keep working unchanged. */
export const MODAL_STATEMENT_LETTER_DOC_DEF: NonIndustriSupportDocDef = {
  key: "surat-pernyataan-modal-kerja",
  title: "Surat Pernyataan Kepemilikan Modal Kerja",
  desc: "Pernyataan bermaterai bahwa perusahaan memiliki modal kerja yang cukup untuk membiayai kegiatan impor.",
  priority: "UTAMA",
};

/**
 * "Pick one" evidence-of-financial-capability checklist for "Impor Bahan Baku – Perusahaan Non
 * Industri (API-U)" and Barang Konsumsi — supplementary to `MODAL_STATEMENT_LETTER_DOC_DEF`
 * (always required). All PENDUKUNG: the applicant selects exactly one type of evidence and
 * uploads it, rather than needing every item on this list.
 */
export const NON_INDUSTRI_SUPPORT_DOC_DEFS: NonIndustriSupportDocDef[] = [
  {
    key: "rekening-koran",
    title: "Rekening Koran Perusahaan (3–6 Bulan Terakhir)",
    desc: "Saldo, arus kas, dan aktivitas keuangan aktual perusahaan.",
    priority: "PENDUKUNG",
  },
  {
    key: "surat-referensi-bank",
    title: "Surat Referensi Bank",
    desc: "Hubungan perbankan dan keberadaan rekening perusahaan.",
    priority: "PENDUKUNG",
  },
  {
    key: "laporan-keuangan",
    title: "Laporan Keuangan Terakhir",
    desc: "Kas, aset lancar, kewajiban lancar, modal dan kondisi keuangan.",
    priority: "PENDUKUNG",
  },
  {
    key: "fasilitas-kredit",
    title: "Bukti Fasilitas Kredit / Credit Line dari Bank",
    desc: "Kemampuan memperoleh pembiayaan untuk transaksi impor.",
    priority: "PENDUKUNG",
  },
  {
    key: "keterangan-saldo",
    title: "Surat Keterangan Saldo / Bank Statement",
    desc: "Posisi dana pada tanggal tertentu.",
    priority: "PENDUKUNG",
  },
  {
    key: "deposito",
    title: "Bukti Deposito atau Instrumen Likuid Perusahaan",
    desc: "Tambahan sumber dana yang dapat digunakan.",
    priority: "PENDUKUNG",
  },
  {
    key: "pinjaman-afiliasi",
    title: "Perjanjian Pinjaman Pemegang Saham/Afiliasi",
    desc: "Sumber pembiayaan tambahan, jika memang ada dan sah.",
    priority: "PENDUKUNG",
  },
  {
    key: "kontrak-po",
    title: "Kontrak/PO dengan Perusahaan Industri",
    desc: "Dasar komersial kebutuhan pembelian/importasi.",
    priority: "PENDUKUNG",
  },
  {
    key: "proforma-invoice",
    title: "Proforma Invoice/Quotation Supplier Luar Negeri",
    desc: "Estimasi nilai pembelian barang yang akan dibiayai.",
    priority: "PENDUKUNG",
  },
];

/** `enabled` is a per-document on/off toggle — not every applicant has every one of these
 * (e.g. a shareholder loan only "jika memang ada dan sah"), so the upload field only appears
 * once its toggle is switched on, mirroring the Partner Industri card pattern. */
export const nonIndustriDocumentSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  documentPath: z.string().trim().optional(),
  // Only meaningful for MODAL_STATEMENT_LETTER_DOC_DEF's entry — the Rupiah amount the statement
  // itself declares. Kept on the generic per-entry shape rather than a dedicated top-level field
  // so it travels with that one entry (same key-based lookup, no new array/field to thread through
  // document-versions.ts or the submit payload separately).
  amount: z.string().trim().optional(),
});
export type NonIndustriDocumentValues = z.infer<typeof nonIndustriDocumentSchema>;

export function createEmptyNonIndustriDocuments(): NonIndustriDocumentValues[] {
  return [MODAL_STATEMENT_LETTER_DOC_DEF, ...NON_INDUSTRI_SUPPORT_DOC_DEFS].map((def) => ({ key: def.key, enabled: false }));
}

/** Industri/Non-Industri supporting documents (Partner Industri financing
 * proof, Non-Industri modal proof) — Support Document step. Konsumsi's own
 * `konsumsiDocuments` field is declared and owned by
 * ./viu-schemes/konsumsi/schema.ts (`konsumsiDocumentsSchema`) and composed
 * in below, not declared here, so this object only ever holds fields no
 * scheme module has claimed ownership of yet. */
export const importSupportDocumentsSchema = z.object({
  partnerIndustriEntries: z.array(partnerIndustriEntrySchema).default([]),
  nonIndustriDocuments: z.array(nonIndustriDocumentSchema).default([]),
});

/** Every document-shaped field on the application: company legal/tax proof (auto-filled,
 * read-only) plus the import-type-specific support documents above. One import for "the
 * documents part" of the payload instead of three. */
export const documentsSchema = companyLegalExtraSchema
  .extend(taxSupportDocumentsSchema.shape)
  .extend(importSupportDocumentsSchema.shape)
  .extend(konsumsiDocumentsSchema.shape);

export const productItemSchema = z.object({
  id: z.string(),
  kategori: z.string().trim().optional(),
  materialType: requiredString("Jenis material wajib diisi"),
  hsCode: requiredString("HS Code wajib diisi"),
  hsDesc: z.string().trim().optional(),
  estimatedVolume: z.string().trim().optional(),
  volumeUnit: z.string().trim().optional(),
  intendedUse: z.string().trim().optional(),
  deskripsi: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
  /** Links this product to the Partner Industri supplying it — one of the ids in
   * `partnerIndustriEntries` (enabled entries only). Only meaningful when Jenis Impor
   * includes BAHAN_BAKU_INDUSTRI; left empty otherwise. */
  partnerIndustriId: z.string().trim().optional(),
});

/** Product list — Product Information step. */
export const productsSchema = z.object({
  products: z.array(productItemSchema).min(1, "Tambahkan minimal satu produk"),
});

/** VIU submission declaration checkbox — Submit step. */
export const declarationSchema = z.object({
  declarationAccepted: z.boolean().default(false),
});
// Declaration checkbox is a VIU-only gate (checked via superRefine below) — the VKI
// wizard's design has no such checkbox, submission is gated by the confirm modal instead.

// VKI-only steps (design: Data Mesin / Product+Raw Materials / Jumlah Produksi /
// Bahan Baku yang Digunakan / Penjualan). No fields carry a required asterisk in the
// design, so validation stays permissive — the point of these steps is capturing
// industrial-capacity data, not gatekeeping submission.
export const MACHINE_KONDISI_VALUES = ["AKTIF", "TIDAK_AKTIF"] as const;
export type MachineKondisiValue = (typeof MACHINE_KONDISI_VALUES)[number];
export const MACHINE_KONDISI_LABELS: Record<MachineKondisiValue, string> = {
  AKTIF: "Aktif",
  TIDAK_AKTIF: "Tidak Aktif",
};

export const machineItemSchema = z.object({
  id: z.string(),
  nama: z.string().trim().optional(),
  merk: z.string().trim().optional(),
  model: z.string().trim().optional(),
  tahun: z.string().trim().optional(),
  jumlah: z.string().trim().optional(),
  jumlahSatuan: z.string().trim().optional(),
  proses: z.string().trim().optional(),
  kapasitas: z.string().trim().optional(),
  kapasitasSatuan: z.string().trim().optional(),
  kapasitasJam: z.string().trim().optional(),
  kapasitasJamSatuan: z.string().trim().optional(),
  waktuBeroperasi: z.string().trim().optional(),
  hariEfektifPerTahun: z.string().trim().optional(),
  kondisi: z.enum(MACHINE_KONDISI_VALUES).optional(),
  power: z.string().trim().optional(),
  powerSatuan: z.string().trim().optional(),
  input: z.string().trim().optional(),
  output: z.string().trim().optional(),
  photoMesinPath: z.string().trim().optional(),
  photoInputPath: z.string().trim().optional(),
  photoOutputPath: z.string().trim().optional(),
});
export type MachineItemValues = z.infer<typeof machineItemSchema>;

export const rawMaterialItemSchema = z.object({
  id: z.string(),
  jenis: z.string().trim().optional(),
  hsCode: z.string().trim().optional(),
  hsDesc: z.string().trim().optional(),
  deskripsi: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
});
export type RawMaterialItemValues = z.infer<typeof rawMaterialItemSchema>;

export const RAW_MATERIAL_CONVERSION_KATEGORI = ["BAHAN_BAKU", "BAHAN_PENOLONG"] as const;
export type RawMaterialConversionKategori = (typeof RAW_MATERIAL_CONVERSION_KATEGORI)[number];

/** Many-to-many link between a product and a raw material — one row per "produk X pakai bahan baku Y" pairing, with its own conversion ratio. */
export const rawMaterialConversionEntrySchema = z.object({
  id: z.string(),
  productId: z.string().trim().optional(),
  rawMaterialId: z.string().trim().optional(),
  kategori: z.enum(RAW_MATERIAL_CONVERSION_KATEGORI).optional(),
  volumeProduksiJumlah: z.string().trim().optional(),
  volumeProduksiSatuan: z.string().trim().optional(),
  volumeKebutuhanJumlah: z.string().trim().optional(),
  volumeKebutuhanSatuan: z.string().trim().optional(),
  rasioKonversi: z.string().trim().optional(),
  keterangan: z.string().trim().optional(),
});
export type RawMaterialConversionEntryValues = z.infer<typeof rawMaterialConversionEntrySchema>;

export const productionQtyItemSchema = z.object({
  productId: z.string(),
  perTahunSebelumnya: z.string().trim().optional(),
  perTahunRencana: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type ProductionQtyItemValues = z.infer<typeof productionQtyItemSchema>;

// One row per licensed capacity entry — deliberately NOT forced 1:1 with a product. Perizinan
// (izin usaha) is granted per KBLI, not per HS Code — one KBLI (e.g. a textile spinning
// license) commonly covers many HS Codes/product variants — so this is keyed off the company's
// own registered KBLI, not a product's HS Code. A verifikator manages this list freely:
// add/edit/delete rows, each carrying its own jenisProduk/kbliCode/kbliDescription rather than
// joining against payload.products. `productId` is kept only for backward compatibility with
// rows created before this changed (when it WAS auto-seeded 1:1 per product) — no longer read
// or written.
export const capacityItemSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  jenisProduk: z.string().trim().optional(),
  kbliCode: z.string().trim().optional(),
  kbliDescription: z.string().trim().optional(),
  berdasarkanIzin: z.string().trim().optional(),
  kapasitasTerpasang: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type CapacityItemValues = z.infer<typeof capacityItemSchema>;

export const rawMaterialUsageItemSchema = z.object({
  rawMaterialId: z.string(),
  penggunaan: z.string().trim().optional(),
  dataStock: z.string().trim().optional(),
  /** Total rencana kebutuhan — auto-summed from dalamNegeri + luarNegeri whenever either changes, kept for report code that only needs the total. */
  rencanaKebutuhan: z.string().trim().optional(),
  rencanaKebutuhanDalamNegeri: z.string().trim().optional(),
  rencanaKebutuhanLuarNegeri: z.string().trim().optional(),
  /** Only meaningful when rencanaKebutuhanLuarNegeri is filled — rencana negara asal impor. */
  rencanaKebutuhanNegaraAsal: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type RawMaterialUsageItemValues = z.infer<typeof rawMaterialUsageItemSchema>;

export const salesItemSchema = z.object({
  productId: z.string(),
  dalamNegeri: z.string().trim().optional(),
  luarNegeri: z.string().trim().optional(),
  negaraTujuan: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type SalesItemValues = z.infer<typeof salesItemSchema>;

/**
 * VKI's Support Document step (6) is a fixed checklist (per design), not a
 * user-defined list — see VKI_SUPPORT_DOC_DEFS below for the 6 required docs.
 * Two of them have a special repeatable shape instead of a single upload.
 */
export const vkiSupportDocEntrySchema = z.object({
  key: z.string(),
  nomorSurat: z.string().trim().optional(),
  tanggal: z.string().trim().optional(),
  penandatangan: z.string().trim().optional(),
  documentPath: z.string().trim().optional(),
});
export type VkiSupportDocEntryValues = z.infer<typeof vkiSupportDocEntrySchema>;

export const electricityMonthSchema = z.object({
  id: z.string(),
  bulan: z.string().trim().optional(),
  kwh: z.string().trim().optional(),
  nominal: z.string().trim().optional(),
  documentPath: z.string().trim().optional(),
});
export type ElectricityMonthValues = z.infer<typeof electricityMonthSchema>;

export const tenagaKerjaEntrySchema = z.object({
  id: z.string(),
  kategori: z.string().trim().optional(),
  jumlah: z.string().trim().optional(),
});
export type TenagaKerjaEntryValues = z.infer<typeof tenagaKerjaEntrySchema>;

/** Machine/equipment inventory — VKI Data Mesin step. */
export const machinesSchema = z.object({
  machines: z.array(machineItemSchema).default([]),
});

/** Raw material inventory, product-material conversion ratios, and planned usage — VKI Bahan
 * Baku steps. */
export const rawMaterialsSchema = z.object({
  rawMaterials: z.array(rawMaterialItemSchema).default([]),
  rawMaterialConversions: z.array(rawMaterialConversionEntrySchema).default([]),
  rawMaterialUsage: z.array(rawMaterialUsageItemSchema).default([]),
});

/** Licensed production capacity, planned production quantity, and sales split — VKI
 * Kapasitas/Produksi/Penjualan steps. */
export const productionCapacitySchema = z.object({
  capacity: z.array(capacityItemSchema).default([]),
  capacityDocumentPath: z.string().trim().optional(),
  productionQty: z.array(productionQtyItemSchema).default([]),
  sales: z.array(salesItemSchema).default([]),
});

/** VKI's fixed Support Document checklist plus its two repeatable-shape entries (electricity
 * bills, tenaga kerja headcount). */
export const vkiSupportSchema = z.object({
  vkiSupportDocs: z.array(vkiSupportDocEntrySchema).default([]),
  electricityMonths: z.array(electricityMonthSchema).default([]),
  tenagaKerjaEntries: z.array(tenagaKerjaEntrySchema).default([]),
  tenagaKerjaDocumentPath: z.string().trim().optional(),
});

/** Every field both VKI and VIU wizards carry — no cross-field rules attached yet. The
 * shared base for three different schemas below: the flat `applicationWizardSchema` the
 * live wizard form actually uses (one react-hook-form instance, one `ApplicationWizardValues`
 * type — splitting that into a union breaks RHF's generic field-path inference across every
 * step component), plus the two `verificationType`-literal branches `applicationSubmitSchema`
 * discriminates on. */
const applicationWizardShape = applicationMetaSchema
  .extend(companySchema.shape)
  .extend(legalInformationSchema.shape)
  .extend(locationsSchema.shape)
  .extend(documentsSchema.shape)
  .extend(brandsUsedSchema.shape)
  .extend(brandQualityTestsSchema.shape)
  .extend(productsSchema.shape)
  .extend(declarationSchema.shape)
  .extend(machinesSchema.shape)
  .extend(rawMaterialsSchema.shape)
  .extend(productionCapacitySchema.shape)
  .extend(vkiSupportSchema.shape);

/**
 * Every cross-field rule that only makes sense for VIU Barang Konsumsi (declaration
 * checkbox, Partner Industri, Merek yang Digunakan, Hasil Uji Mutu, Support Document
 * Konsumsi) — VKI has no `importTypes` field in its own wizard UI at all (see
 * step1-application-information.tsx's `verificationType === "VIU"` gate) and no
 * declaration checkbox (submission is gated by its own confirm modal instead). Pulled
 * into its own function so it's the ONE place these rules live, called from both
 * `applicationWizardSchema` (guarded below, for the live form) and `applicationSubmitSchema`'s
 * own VIU branch (unguarded — the discriminated union only ever calls this for a VIU
 * payload in the first place, so a future rule added here can never leak into a VKI
 * submission by a forgotten if-guard).
 */
// Exported for scripts/test-viu-konsumsi-scheme-separation.mjs's submit-rule
// parity regression — not otherwise imported outside this file.
export function applyViuOnlySubmitRules(data: z.infer<typeof applicationWizardShape>, ctx: z.RefinementCtx): void {
  if (data.declarationAccepted !== true) {
    ctx.addIssue({
      code: "custom",
      path: ["declarationAccepted"],
      message: "Anda harus menyetujui pernyataan ini sebelum submit",
    });
  }
  // Industri/Non-Industri rules — not yet separated into their own scheme
  // modules (Konsumsi is the first; see the VIU Konsumsi implementation
  // plan). Left exactly as before, unaffected by the Konsumsi extraction
  // below.
  if (
    data.importTypes.includes("BAHAN_BAKU_INDUSTRI") &&
    !data.partnerIndustriEntries.some((entry) => entry.enabled)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["partnerIndustriEntries"],
      message: "Aktifkan minimal satu Partner Industri tujuan",
    });
  }
  if (
    data.importTypes.includes("BAHAN_BAKU_INDUSTRI") ||
    data.importTypes.includes("BAHAN_BAKU_NON_INDUSTRI") ||
    data.importTypes.includes("BARANG_KONSUMSI")
  ) {
    // Only the Surat Pernyataan Kepemilikan Modal Kerja is unconditionally required — the rest of
    // NON_INDUSTRI_SUPPORT_DOC_DEFS is a "pick one" supplementary evidence list the applicant may
    // optionally fill in (see Step5SupportDocument's own NonIndustriChecklist). Applies to Barang
    // Konsumsi too now (see `needsModalDocs`) — Bukti Kemampuan Finansial is required regardless of
    // which Jenis Impor is selected.
    const statementEntry = data.nonIndustriDocuments.find((doc) => doc.key === MODAL_STATEMENT_LETTER_DOC_DEF.key);
    if (!statementEntry?.enabled || !statementEntry.documentPath) {
      ctx.addIssue({
        code: "custom",
        path: ["nonIndustriDocuments"],
        message: "Unggah Surat Pernyataan Kepemilikan Modal Kerja",
      });
    } else if (!statementEntry.amount?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["nonIndustriDocuments"],
        message: "Isi jumlah modal kerja pada Surat Pernyataan Kepemilikan Modal Kerja",
      });
    }
  }
  // Konsumsi rules live in viu-schemes/konsumsi/submit-rules.ts — this
  // shared function only decides *whether* they run, never *what* they
  // check (see that module's own docstring for the regulatory detail).
  if (data.importTypes.includes("BARANG_KONSUMSI")) {
    applyKonsumsiSubmitRules(data, ctx);
  }
}

/** The live wizard's own schema — one flat object (never a union, see
 * `applicationWizardShape`'s own comment on why) so `ApplicationWizardValues` stays a plain
 * type every step component, hook, and admin/company detail view can keep using unchanged.
 * Guards VIU-only rules manually since both branches share one runtime object here; the
 * authoritative, structurally-separated gate is `applicationSubmitSchema` below, which is
 * what actually decides whether a submission gets persisted. */
export const applicationWizardSchema = applicationWizardShape.superRefine((data, ctx) => {
  if (data.verificationType === "VIU") applyViuOnlySubmitRules(data, ctx);
});

/**
 * The authoritative submit-time schema — a `verificationType`-discriminated union instead
 * of one object with an if-guard. `applyViuOnlySubmitRules` is only ever reachable through
 * the VIU branch, so a VKI payload can structurally never run a VIU-only rule, even one
 * added later without remembering a guard (the bug this type was introduced to prevent —
 * see the viu-schemes/konsumsi/server/validate-submit.ts fix for the matching server-side case). Used by
 * `POST /api/applications` instead of `applicationWizardSchema` for the final persist gate.
 */
const viuSubmitSchema = applicationWizardShape
  .extend({ verificationType: z.literal("VIU") })
  .superRefine(applyViuOnlySubmitRules);
const vkiSubmitSchema = applicationWizardShape.extend({ verificationType: z.literal("VKI") });
export const applicationSubmitSchema = z.discriminatedUnion("verificationType", [
  viuSubmitSchema,
  vkiSubmitSchema,
]);

export type SupportDocumentValues = z.infer<typeof supportDocumentSchema>;
export type ProductItemValues = z.infer<typeof productItemSchema>;
export type ApplicationWizardValues = z.infer<typeof applicationWizardSchema>;

export function createEmptySupportDocument(): Partial<SupportDocumentValues> & {
  id: string;
} {
  return { id: crypto.randomUUID(), label: "" };
}

export function createEmptyProduct(): Partial<ProductItemValues> & {
  id: string;
} {
  return {
    id: crypto.randomUUID(),
    materialType: "",
    hsCode: "",
    estimatedVolume: "",
    volumeUnit: "",
    intendedUse: "",
    deskripsi: "",
    photoPath: "",
  };
}

export function createEmptyMachine(): Partial<MachineItemValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyRawMaterial(): Partial<RawMaterialItemValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyRawMaterialConversion(): Partial<RawMaterialConversionEntryValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyElectricityMonth(): Partial<ElectricityMonthValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyTenagaKerja(): Partial<TenagaKerjaEntryValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export type VkiSupportDocType = "regular" | "electricity" | "tenagaKerja";

export type VkiSupportDocDef = {
  key: string;
  title: string;
  desc: string;
  type: VkiSupportDocType;
};

/** Fixed checklist for VKI's Support Document step — not user-editable. */
export const VKI_SUPPORT_DOC_DEFS: VkiSupportDocDef[] = [
  {
    key: "tidak-diperjualbelikan",
    title: "Surat Pernyataan Tidak Akan Diperjualbelikan atau Dipindahtangankan",
    desc: "Pernyataan bahwa mesin/peralatan tidak akan dijual atau dipindahtangankan.",
    type: "regular",
  },
  {
    key: "memiliki-menguasai",
    title: "Surat Pernyataan Memiliki atau Menguasai",
    desc: "Pernyataan kepemilikan atau penguasaan atas mesin/peralatan produksi.",
    type: "regular",
  },
  {
    key: "kebenaran-data",
    title: "Surat Pernyataan Kebenaran Data",
    desc: "Pernyataan bahwa seluruh data yang diajukan benar dan dapat dipertanggungjawabkan.",
    type: "regular",
  },
  {
    key: "alur-proses",
    title: "Surat Pernyataan Alur Proses",
    desc: "Pernyataan mengenai alur proses produksi yang dijalankan.",
    type: "regular",
  },
  {
    key: "listrik",
    title: "Bukti Pembayaran Listrik 3 Bulan Terakhir",
    desc: "Bukti pembayaran listrik fasilitas produksi 3 bulan terakhir.",
    type: "electricity",
  },
  {
    key: "tenaga-kerja",
    title: "Surat Pernyataan Tenaga Kerja",
    desc: "Pernyataan jumlah tenaga kerja per kategori/departemen.",
    type: "tenagaKerja",
  },
];

/** Step 3 "Legal Information" — read-only display pulled from the selected Company, but the
 * company itself may not have every legal document on file yet (e.g. NIB never filled in),
 * so these still need to be registered here for handleInvalidSubmit to route the user back
 * to the right step (and name the right field) instead of falling through to a generic
 * "periksa kembali step sebelumnya" toast. */
const LEGAL_STEP_FIELDS: (keyof ApplicationWizardValues)[] = [
  "nibNumber",
  "nibIssueDate",
  "nibDocumentPath",
  "kbliEntries",
  "kbliDocumentPath",
  "notarialDeedNumber",
  "notarialDeedIssueDate",
  "notarialIssuingAuthority",
  "notarialDocumentPath",
];

/** Step 4 "Tax Information" (NPWP) — every field here is currently optional at the schema
 * level, so this never actually blocks Submit today; listed anyway so a future required
 * field here is automatically covered without another silent gap like Step 3's. */
const TAX_STEP_FIELDS: (keyof ApplicationWizardValues)[] = ["npwpNumber", "npwpDocumentPath"];

/** Step 5 "Location Information" — user-editable in this wizard (unlike Legal/Tax), so this
 * one was already reachable, just never wired into the step map. */
const LOCATION_STEP_FIELDS: (keyof ApplicationWizardValues)[] = ["locations"];

/** Keyed by WizardStepMeta.key (wizard-steps-meta.ts), not by step number —
 * step numbers shift depending on which schemes' steps are enabled (see
 * getViuWizardSteps), but a step's identity and field list don't.
 * "brands-used"/"quality-test" are owned by and composed in from
 * viu-schemes/konsumsi/step-field-names.ts, not declared here — this object
 * only ever declares steps no scheme module has claimed ownership of.
 * `konsumsiDocuments` stays listed under "support-document" since that step
 * itself (unlike brands-used/quality-test) remains shared infrastructure —
 * only the Konsumsi-specific document *field* within it is scheme-owned. */
export const VIU_STEP_FIELD_NAMES: Record<string, (keyof ApplicationWizardValues)[]> = {
  company: [
    "companyId",
    "companyName",
    "companyType",
    "investmentStatus",
    "companyEmail",
    "companyPhone",
    "companyWebsite",
    "contactFullName",
    "contactDesignation",
    "contactEmail",
    "contactPhone",
  ],
  "application-info": ["verificationType", "applicationCategory", "importTypes"],
  legal: LEGAL_STEP_FIELDS,
  tax: TAX_STEP_FIELDS,
  location: LOCATION_STEP_FIELDS,
  "partner-industri": ["partnerIndustriEntries"],
  "support-document": ["nonIndustriDocuments", "konsumsiDocuments"],
  "product-info": ["products"],
  preview: [],
  submit: ["declarationAccepted"],
  ...KONSUMSI_STEP_FIELD_NAMES,
};

/**
 * VKI's new 13-step flow (per the updated Claude Design). Steps 3-5 (Legal/Tax/
 * Location) reuse the exact same read-only-from-Company (3-4) / editable (5)
 * components as VIU — same field lists apply, see LEGAL_STEP_FIELDS /
 * TAX_STEP_FIELDS / LOCATION_STEP_FIELDS above.
 */
export const VKI_STEP_FIELD_NAMES: Record<string, (keyof ApplicationWizardValues)[]> = {
  company: VIU_STEP_FIELD_NAMES.company,
  "application-info": VIU_STEP_FIELD_NAMES["application-info"],
  legal: LEGAL_STEP_FIELDS,
  tax: TAX_STEP_FIELDS,
  location: LOCATION_STEP_FIELDS,
  "support-document": ["vkiSupportDocs", "electricityMonths", "tenagaKerjaEntries", "tenagaKerjaDocumentPath"],
  "data-mesin": ["machines"],
  "product-info": ["products", "rawMaterials"],
  capacity: ["capacity", "capacityDocumentPath"],
  "production-qty": ["productionQty"],
  "raw-material-usage": ["rawMaterialUsage"],
  sales: ["sales"],
  preview: [],
  submit: [],
};

// Backward-compatible alias — existing imports keep working.
export const STEP_FIELD_NAMES = VIU_STEP_FIELD_NAMES;
