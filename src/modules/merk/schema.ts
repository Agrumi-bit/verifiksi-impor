import { z } from "zod";

export const MERK_STATUS_VALUES = ["ACTIVE", "INACTIVE"] as const;
export type MerkStatusValue = (typeof MERK_STATUS_VALUES)[number];

export const merkStatusUpdateSchema = z.object({
  status: z.enum(MERK_STATUS_VALUES, { message: "Status merek tidak valid" }),
});
export type MerkStatusUpdateValues = z.infer<typeof merkStatusUpdateSchema>;

// Legacy ownership model (pre BrandOwner/Importer split). No longer collected
// by the wizard — the API derives it from importerRelation so old readers of
// `Merk.ownershipType`/`brandOwnerName` keep working.
export const MERK_OWNERSHIP_TYPES = ["MILIK_SENDIRI", "LISENSI"] as const;
export type MerkOwnershipType = (typeof MERK_OWNERSHIP_TYPES)[number];

const requiredString = (message: string) => z.string().trim().min(1, message);

// ---------------------------------------------------------------------------
// Step 1 — Informasi Merek (drawer redesign)
// ---------------------------------------------------------------------------

// Subset of the DB's MerkCertificateType enum this wizard offers as "Jenis
// Bukti Merek" — LAINNYA remains a valid column value (rows from the older
// wizard) but isn't one of the three cards here.
export const MERK_EVIDENCE_TYPES = [
  "SERTIFIKAT_MEREK_TERDAFTAR",
  "TANDA_DAFTAR_MEREK",
  "SERTIFIKAT_INTERNASIONAL",
] as const;
export type MerkEvidenceType = (typeof MERK_EVIDENCE_TYPES)[number];

export const MERK_EVIDENCE_TYPE_LABELS: Record<MerkEvidenceType, string> = {
  SERTIFIKAT_MEREK_TERDAFTAR: "Sertifikat Merek",
  TANDA_DAFTAR_MEREK: "Tanda Pendaftaran Merek",
  SERTIFIKAT_INTERNASIONAL: "Tanda Pendaftaran Merek Internasional",
};
export const MERK_EVIDENCE_TYPE_DESCRIPTIONS: Record<MerkEvidenceType, string> = {
  SERTIFIKAT_MEREK_TERDAFTAR: "Sertifikat merek yang telah diterbitkan.",
  TANDA_DAFTAR_MEREK: "Bukti pendaftaran merek apabila sertifikat belum diterbitkan.",
  SERTIFIKAT_INTERNASIONAL: "Bukti pendaftaran merek internasional.",
};
// "Tanggal Penerbitan" is optional for an already-issued certificate; the
// other two evidence types require the date (permohonan/notifikasi belum
// tentu final tanpa tanggal).
export const MERK_EVIDENCE_TYPES_WITH_OPTIONAL_DATE: readonly MerkEvidenceType[] = [
  "SERTIFIKAT_MEREK_TERDAFTAR",
];

const merkBrandInfoBaseSchema = z.object({
  brandName: requiredString("Nama merek wajib diisi"),
  countryOfOrigin: requiredString("Negara merek/pemilik merek wajib diisi"),
  evidenceType: z.enum(MERK_EVIDENCE_TYPES, { message: "Pilih jenis bukti merek" }),
  registrationNumber: requiredString("Nomor wajib diisi"),
  registrationIssuer: requiredString("Lembaga penerbit wajib diisi"),
  registrationDate: z.string().trim().optional(),
  trademarkClass: requiredString("Kelas merek wajib dipilih"),
  trademarkClassDescription: requiredString("Uraian kelas merek wajib diisi"),
  merekStatusLabel: z.string().trim().optional(),
  logoPath: z.string().trim().optional(),
});
export type MerkBrandInfoValues = z.infer<typeof merkBrandInfoBaseSchema>;

function validateEvidenceStep(data: MerkBrandInfoValues, ctx: z.RefinementCtx) {
  const dateOptional = MERK_EVIDENCE_TYPES_WITH_OPTIONAL_DATE.includes(data.evidenceType);
  if (!dateOptional && !data.registrationDate) {
    ctx.addIssue({
      code: "custom",
      path: ["registrationDate"],
      message:
        data.evidenceType === "TANDA_DAFTAR_MEREK"
          ? "Tanggal registrasi wajib diisi"
          : "Tanggal notifikasi/pendaftaran wajib diisi",
    });
  }
}

export const merkBrandInfoSchema = merkBrandInfoBaseSchema.superRefine(validateEvidenceStep);

// ---------------------------------------------------------------------------
// Step 2 — Kepemilikan / Step 3 — Perwakilan
//
// One schema/superRefine still covers both wizard steps — "Siapa pemilik
// merek ini (Step 2), bagaimana merek diwakili di Indonesia, dan apa
// hubungan hukum antara Pemilik Merek, Perwakilan Resmi, dan API-U (Step
// 3)?" MERK_STEP_FIELD_NAMES below is what actually splits which fields
// each step's "Lanjutkan" validates; validateOwnershipStep validates the
// whole shape either way.
//
// Legacy note: this replaces the earlier brandOwnerId + importerRelation +
// importers[] model (still on the Merk/MerkImporter tables, non-destructively
// kept) with the richer MerkOwnership relation — a domestic brand owner is no
// longer required to be an "importer" in a 1:many sense; instead the single
// applicant API-U's relationship to the owner/representative is recorded.
// ---------------------------------------------------------------------------

export const MERK_OWNER_LOCATIONS = ["domestic", "foreign"] as const;
export type MerkOwnerLocation = (typeof MERK_OWNER_LOCATIONS)[number];
export const MERK_OWNER_LOCATION_LABELS: Record<MerkOwnerLocation, string> = {
  domestic: "Indonesia",
  foreign: "Luar Indonesia",
};
export const MERK_OWNER_LOCATION_DESCRIPTIONS: Record<MerkOwnerLocation, string> = {
  domestic: "Pemilik merek berkedudukan di Indonesia.",
  foreign: "Pemilik merek berkedudukan di luar wilayah Indonesia.",
};

export const MERK_OWNER_TYPES = ["company", "individual"] as const;
export type MerkOwnerType = (typeof MERK_OWNER_TYPES)[number];
export const MERK_OWNER_TYPE_LABELS: Record<MerkOwnerType, string> = {
  company: "Perusahaan",
  individual: "Perorangan",
};

export const MERK_FOREIGN_ENTITY_TYPES = ["company", "organization", "individual", "other"] as const;
export type MerkForeignEntityType = (typeof MERK_FOREIGN_ENTITY_TYPES)[number];
export const MERK_FOREIGN_ENTITY_TYPE_LABELS: Record<MerkForeignEntityType, string> = {
  company: "Company",
  organization: "Organization",
  individual: "Individual",
  other: "Other",
};

// Domestic owner ↔ applicant API-U relationship.
export const MERK_APIU_RELATIONSHIPS = ["apiu_is_owner", "apiu_is_importer"] as const;
export type MerkApiuRelationship = (typeof MERK_APIU_RELATIONSHIPS)[number];
export const MERK_APIU_RELATIONSHIP_LABELS: Record<MerkApiuRelationship, string> = {
  apiu_is_owner: "API-U adalah Pemilik Merek / Pemilik Hak atas Merek",
  apiu_is_importer: "API-U adalah Importir yang Ditunjuk",
};

// Foreign owner: how the brand is represented in Indonesia.
export const MERK_REPRESENTATION_TYPES = [
  "apiu_official_representative",
  "other_official_representative",
  "appointed_importer",
] as const;
export type MerkRepresentationType = (typeof MERK_REPRESENTATION_TYPES)[number];
export const MERK_REPRESENTATION_TYPE_LABELS: Record<MerkRepresentationType, string> = {
  apiu_official_representative: "API-U merupakan Perwakilan Resmi",
  other_official_representative: "Perwakilan Resmi adalah perusahaan lain",
  appointed_importer: "API-U hanya bertindak sebagai Importir",
};
export const MERK_REPRESENTATION_TYPE_DESCRIPTIONS: Record<MerkRepresentationType, string> = {
  apiu_official_representative:
    "Perusahaan API-U bertindak sebagai Perwakilan Resmi dari pemilik merek di Indonesia.",
  other_official_representative:
    "Pemilik merek menunjuk perusahaan lain di Indonesia sebagai Perwakilan Resmi.",
  appointed_importer:
    "API-U melakukan impor berdasarkan surat penunjukan dari Pemilik Merek atau Perwakilan Resmi.",
};

export const MERK_AGREEMENT_TYPES = ["lisensi", "sublisensi"] as const;
export type MerkAgreementType = (typeof MERK_AGREEMENT_TYPES)[number];
export const MERK_AGREEMENT_TYPE_LABELS: Record<MerkAgreementType, string> = {
  lisensi: "Lisensi",
  sublisensi: "Sublisensi",
};

// Who issued the Surat Penunjukan Importir.
export const MERK_APPOINTMENT_SOURCES = ["brand_owner", "official_representative"] as const;
export type MerkAppointmentSource = (typeof MERK_APPOINTMENT_SOURCES)[number];
export const MERK_APPOINTMENT_SOURCE_LABELS: Record<MerkAppointmentSource, string> = {
  brand_owner: "Pemilik Merek / Pemilik Hak atas Merek",
  official_representative: "Perwakilan Resmi",
};

const merkOwnershipBaseSchema = z.object({
  ownerLocation: z.enum(MERK_OWNER_LOCATIONS, { message: "Pilih lokasi pemilik merek" }),

  // Domestic
  ownerType: z.enum(MERK_OWNER_TYPES).optional(),
  ownerCompanyId: z.string().trim().optional(),
  // Shared by the domestic-individual owner and the foreign owner — same
  // concept ("this entity's name/address"), different scenario.
  ownerName: z.string().trim().optional(),
  ownerAddress: z.string().trim().optional(),
  relationshipWithApiu: z.enum(MERK_APIU_RELATIONSHIPS).optional(),

  // Foreign
  foreignEntityType: z.enum(MERK_FOREIGN_ENTITY_TYPES).optional(),
  ownerCountryCode: z.string().trim().optional(),
  foreignRegistrationNumber: z.string().trim().optional(),
  representationType: z.enum(MERK_REPRESENTATION_TYPES).optional(),
  officialRepresentativeCompanyId: z.string().trim().optional(),

  agreementType: z.enum(MERK_AGREEMENT_TYPES).optional(),
  agreementNumber: z.string().trim().optional(),
  agreementStartDate: z.string().trim().optional(),
  agreementEndDate: z.string().trim().optional(),

  appointmentSource: z.enum(MERK_APPOINTMENT_SOURCES).optional(),
  appointmentLetterNumber: z.string().trim().optional(),
  appointmentStartDate: z.string().trim().optional(),
  appointmentEndDate: z.string().trim().optional(),
});
export type MerkOwnershipValues = z.infer<typeof merkOwnershipBaseSchema>;

function issue(ctx: z.RefinementCtx, path: string | string[], message: string) {
  ctx.addIssue({ code: "custom", path: Array.isArray(path) ? path : [path], message });
}

function validateOwnershipStep(data: MerkOwnershipValues, ctx: z.RefinementCtx) {
  if (data.ownerLocation === "domestic") {
    if (!data.ownerType) {
      issue(ctx, "ownerType", "Pilih jenis pemilik merek");
      return;
    }
    if (data.ownerType === "company" || data.ownerType === "individual") {
      if (!data.ownerName) issue(ctx, "ownerName", "Nama pemilik merek wajib diisi");
      if (!data.ownerAddress) issue(ctx, "ownerAddress", "Alamat wajib diisi");
    }
    if (!data.relationshipWithApiu) {
      issue(ctx, "relationshipWithApiu", "Pilih hubungan dengan perusahaan API-U");
    } else if (data.relationshipWithApiu === "apiu_is_importer" && !data.appointmentLetterNumber) {
      issue(ctx, "appointmentLetterNumber", "Nomor surat penunjukan wajib diisi");
    }
    return;
  }

  // foreign
  if (!data.ownerName) issue(ctx, "ownerName", "Nama pemilik merek wajib diisi");
  if (!data.ownerCountryCode) issue(ctx, "ownerCountryCode", "Negara pemilik merek wajib diisi");
  if (!data.ownerAddress) issue(ctx, "ownerAddress", "Alamat wajib diisi");

  if (!data.representationType) {
    issue(ctx, "representationType", "Pilih bagaimana merek ini diwakili di Indonesia");
    return;
  }
  if (data.representationType === "apiu_official_representative" && !data.agreementType) {
    issue(ctx, "agreementType", "Pilih jenis perjanjian");
  }
  if (data.representationType === "other_official_representative" && !data.officialRepresentativeCompanyId) {
    issue(ctx, "officialRepresentativeCompanyId", "Pilih perwakilan resmi di Indonesia");
  }
  if (data.representationType === "appointed_importer") {
    if (!data.appointmentSource) {
      issue(ctx, "appointmentSource", "Pilih asal penunjukan importir");
    } else if (data.appointmentSource === "official_representative" && !data.officialRepresentativeCompanyId) {
      issue(ctx, "officialRepresentativeCompanyId", "Pilih perwakilan resmi di Indonesia");
    }
  }
}

export const merkOwnershipSchema = merkOwnershipBaseSchema.superRefine(validateOwnershipStep);

// ---------------------------------------------------------------------------
// Step 4 — Dokumen Pendukung
//
// "Dokumen apa yang membuktikan merek, hubungan kepemilikan/perwakilan,
// penunjukan importir, dan pemenuhan persyaratan produk?"
//
// Which slots are required is computed by getRequiredBrandDocuments() in
// document-requirements.ts from Step 1/2's data — this file only validates
// that whatever the engine says is required has actually been uploaded.
// ---------------------------------------------------------------------------

export const brandDocumentEntrySchema = z.object({
  filePath: requiredString("File wajib diunggah"),
  fileName: requiredString("Nama file tidak valid"),
  fileSize: z.number().nonnegative(),
  documentNumber: z.string().trim().optional(),
  issueDate: z.string().trim().optional(),
  expiryDate: z.string().trim().optional(),
});
export type BrandDocumentEntryValues = z.infer<typeof brandDocumentEntrySchema>;

export const qualityTestEntrySchema = z.object({
  commodityGroupId: requiredString("Komoditas wajib dipilih"),
  commodityName: requiredString("Komoditas wajib dipilih"),
  commoditySubGroupId: z.string().trim().optional(),
  commoditySubGroupName: z.string().trim().optional(),
  certificateNumber: requiredString("Nomor sertifikat wajib diisi"),
  laboratoryName: requiredString("Nama laboratorium wajib diisi"),
  issueDate: requiredString("Tanggal terbit wajib diisi"),
  expiryDate: z.string().trim().optional(),
  filePath: requiredString("Sertifikat wajib diunggah"),
  fileName: requiredString("Nama file tidak valid"),
});
export type QualityTestEntryValues = z.infer<typeof qualityTestEntrySchema>;

const merkDocumentsBaseSchema = z.object({
  // Keyed by BrandDocumentRequirement.code — one entry per single-file slot.
  documents: z.record(z.string(), brandDocumentEntrySchema),
  // The one "multiple: true" requirement (Dokumentasi Label Produk) gets its
  // own array field instead of forcing documents' value type into a union.
  productLabelDocumentation: z.array(brandDocumentEntrySchema),
  qualityTests: z.array(qualityTestEntrySchema),
  declarationAccepted: z.boolean(),
});
export type MerkDocumentsValues = z.infer<typeof merkDocumentsBaseSchema>;

function validateDeclaration(
  data: { declarationAccepted: boolean },
  ctx: z.RefinementCtx,
) {
  if (data.declarationAccepted !== true) {
    ctx.addIssue({
      code: "custom",
      path: ["declarationAccepted"],
      message:
        "Anda harus menyetujui deklarasi ini untuk dapat mengirimkan pendaftaran merek.",
    });
  }
}

// ---------------------------------------------------------------------------
// Full wizard schema (3 steps) + draft (minimal) schema
// ---------------------------------------------------------------------------

const merkWizardBaseSchema = merkBrandInfoBaseSchema
  .extend(merkOwnershipBaseSchema.shape)
  .extend(merkDocumentsBaseSchema.shape);

// Document requirements (getRequiredBrandDocuments) are deliberately NOT
// validated here — uploading them is no longer mandatory to finish Add
// Merek. `requirement.required` still describes what a given scenario needs
// and still drives the "Wajib"/"Opsional" badges and completeness UI in Step
// 4, but a missing one no longer blocks Step 4 or final submission: that
// enforcement moves to "Create Application VIU Konsumsi" (BR-003, not yet
// built), which is when the brand is actually submitted for verification
// rather than just registered.
export const merkWizardSchema = merkWizardBaseSchema
  .superRefine(validateEvidenceStep)
  .superRefine(validateOwnershipStep)
  .superRefine(validateDeclaration);
export type MerkWizardValues = z.infer<typeof merkWizardSchema>;

// "Simpan Draft" — only the field visible from the very first moment (Nama
// Merek) is required; everything else may be missing mid-wizard.
export const merkDraftSchema = z.object({
  brandName: requiredString("Nama merek wajib diisi sebelum menyimpan draft"),
  countryOfOrigin: z.string().trim().optional(),
  evidenceType: z.enum(MERK_EVIDENCE_TYPES).optional(),
  registrationNumber: z.string().trim().optional(),
  registrationIssuer: z.string().trim().optional(),
  registrationDate: z.string().trim().optional(),
  trademarkClass: z.string().trim().optional(),
  trademarkClassDescription: z.string().trim().optional(),
  merekStatusLabel: z.string().trim().optional(),
  logoPath: z.string().trim().optional(),

  ownerLocation: z.enum(MERK_OWNER_LOCATIONS).optional(),
  ownerType: z.enum(MERK_OWNER_TYPES).optional(),
  ownerCompanyId: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
  ownerAddress: z.string().trim().optional(),
  relationshipWithApiu: z.enum(MERK_APIU_RELATIONSHIPS).optional(),
  foreignEntityType: z.enum(MERK_FOREIGN_ENTITY_TYPES).optional(),
  ownerCountryCode: z.string().trim().optional(),
  foreignRegistrationNumber: z.string().trim().optional(),
  representationType: z.enum(MERK_REPRESENTATION_TYPES).optional(),
  officialRepresentativeCompanyId: z.string().trim().optional(),
  agreementType: z.enum(MERK_AGREEMENT_TYPES).optional(),
  agreementNumber: z.string().trim().optional(),
  agreementStartDate: z.string().trim().optional(),
  agreementEndDate: z.string().trim().optional(),
  appointmentSource: z.enum(MERK_APPOINTMENT_SOURCES).optional(),
  appointmentLetterNumber: z.string().trim().optional(),
  appointmentStartDate: z.string().trim().optional(),
  appointmentEndDate: z.string().trim().optional(),

  documents: z.record(z.string(), brandDocumentEntrySchema).optional(),
  productLabelDocumentation: z.array(brandDocumentEntrySchema).optional(),
  qualityTests: z.array(qualityTestEntrySchema).optional(),
});
export type MerkDraftValues = z.infer<typeof merkDraftSchema>;

export const MERK_STEP_FIELD_NAMES: Record<number, (keyof MerkWizardValues)[]> = {
  1: [
    "brandName",
    "countryOfOrigin",
    "evidenceType",
    "registrationNumber",
    "registrationIssuer",
    "registrationDate",
    "trademarkClass",
    "trademarkClassDescription",
    "merekStatusLabel",
    "logoPath",
  ],
  // Step 2 — Kepemilikan: who owns the brand (domestic/foreign, company/
  // individual/entity details). Step 3 — Perwakilan: the legal relationship
  // that follows from that owner (API-U relationship for domestic,
  // representation/agreement/appointment for foreign). Both subsets are
  // still validated together by the one validateOwnershipStep superRefine in
  // this file — form.trigger(fields) only surfaces errors for the field
  // names passed to it, so splitting the trigger list here is enough to
  // split the step without splitting the validation itself.
  2: [
    "ownerLocation",
    "ownerType",
    "ownerCompanyId",
    "ownerName",
    "ownerAddress",
    "foreignEntityType",
    "ownerCountryCode",
    "foreignRegistrationNumber",
  ],
  3: [
    "relationshipWithApiu",
    "representationType",
    "officialRepresentativeCompanyId",
    "agreementType",
    "agreementNumber",
    "agreementStartDate",
    "agreementEndDate",
    "appointmentSource",
    "appointmentLetterNumber",
    "appointmentStartDate",
    "appointmentEndDate",
  ],
  4: ["documents", "productLabelDocumentation", "qualityTests"],
  // Step 5 (Review) owns the final declaration — Step 4 is documents-only.
  5: ["declarationAccepted"],
};
