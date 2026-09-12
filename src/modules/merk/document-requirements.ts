import type {
  MerkAgreementType,
  MerkAppointmentSource,
  MerkEvidenceType,
  MerkOwnerLocation,
  MerkRepresentationType,
} from "./schema";

export const BRAND_DOCUMENT_CATEGORIES = [
  "trademark",
  "representation",
  "import_authorization",
  "official_representative_legal",
  "product_compliance",
] as const;
export type BrandDocumentCategory = (typeof BRAND_DOCUMENT_CATEGORIES)[number];

export const BRAND_DOCUMENT_CATEGORY_LABELS: Record<BrandDocumentCategory, string> = {
  trademark: "Dokumen Merek",
  representation: "Dokumen Perwakilan",
  import_authorization: "Penunjukan Importir",
  official_representative_legal: "Legalitas Perwakilan Resmi",
  product_compliance: "Pemenuhan Produk",
};

export type BrandDocumentRequirement = {
  code: string;
  label: string;
  description?: string;
  required: boolean;
  category: BrandDocumentCategory;
  multiple?: boolean;
};

/** The subset of wizard values the requirement engine actually reads —
 * kept narrow so this module doesn't import the whole wizard schema. */
export type BrandDocumentRequirementInput = {
  evidenceType?: MerkEvidenceType;
  ownerLocation?: MerkOwnerLocation;
  relationshipWithApiu?: string;
  representationType?: MerkRepresentationType;
  appointmentSource?: MerkAppointmentSource;
  agreementType?: MerkAgreementType;
};

function trademarkRequirement(evidenceType: MerkEvidenceType | undefined): BrandDocumentRequirement {
  if (evidenceType === "TANDA_DAFTAR_MEREK") {
    return {
      code: "trademark_evidence",
      label: "Tanda Pendaftaran Merek",
      description: "Bukti pendaftaran merek apabila sertifikat merek belum diterbitkan.",
      required: true,
      category: "trademark",
    };
  }
  if (evidenceType === "SERTIFIKAT_INTERNASIONAL") {
    return {
      code: "trademark_evidence",
      label: "Tanda Pendaftaran Merek Internasional",
      description: "Bukti pendaftaran merek internasional.",
      required: true,
      category: "trademark",
    };
  }
  return {
    code: "trademark_evidence",
    label: "Sertifikat Merek",
    description: "Sertifikat merek yang sesuai dengan merek dan kelas merek yang didaftarkan.",
    required: true,
    category: "trademark",
  };
}

function agreementLabel(agreementType: MerkAgreementType | undefined): string {
  if (agreementType === "sublisensi") return "Perjanjian Sublisensi";
  if (agreementType === "lisensi") return "Perjanjian Lisensi";
  return "Perjanjian Lisensi / Sublisensi";
}

const OFFICIAL_REPRESENTATIVE_LEGAL_REQUIREMENTS: BrandDocumentRequirement[] = [
  {
    code: "official_rep_deed",
    label: "Akta Pendirian Perwakilan Resmi",
    required: true,
    category: "official_representative_legal",
  },
  {
    code: "official_rep_deed_amendment",
    label: "Akta Perubahan Terakhir",
    description: "Wajib diunggah apabila Perwakilan Resmi pernah mengalami perubahan akta.",
    required: false,
    category: "official_representative_legal",
  },
  {
    code: "official_rep_business_license",
    label: "Perizinan Berusaha Perwakilan Resmi",
    required: true,
    category: "official_representative_legal",
  },
];

function licenseRequirements(agreementType: MerkAgreementType | undefined): BrandDocumentRequirement[] {
  return [
    {
      code: "official_representative_appointment",
      label: "Bukti Penunjukan sebagai Perwakilan Resmi",
      required: true,
      category: "representation",
    },
    {
      code: "license_or_sublicense",
      label: agreementLabel(agreementType),
      required: true,
      category: "representation",
    },
    {
      code: "license_registration",
      label: "Bukti Pencatatan Perjanjian Lisensi / Sublisensi",
      required: true,
      category: "representation",
    },
  ];
}

const IMPORTER_APPOINTMENT_REQUIREMENT: BrandDocumentRequirement = {
  code: "importer_appointment",
  label: "Surat Penunjukan Importir",
  required: true,
  category: "import_authorization",
};

const PRODUCT_COMPLIANCE_REQUIREMENTS: BrandDocumentRequirement[] = [
  {
    code: "indonesian_label_statement",
    label: "Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia",
    required: true,
    category: "product_compliance",
  },
  {
    code: "product_label_documentation",
    label: "Dokumentasi Label Produk",
    description: "Foto/scan label produk. Bisa unggah lebih dari satu file.",
    required: true,
    category: "product_compliance",
    multiple: true,
  },
];

/**
 * Derives which documents Step 3 must ask for from Step 1 (evidenceType) and
 * Step 2 (ownerLocation/relationshipWithApiu for domestic owners,
 * representationType/appointmentSource/agreementType for foreign owners).
 *
 * Gap-fill beyond the literal spec: the domestic "API-U adalah Importir yang
 * Ditunjuk" branch (relationshipWithApiu === "apiu_is_importer") collects an
 * appointment letter number/dates in Step 2 but the spec's own dependency
 * list never named `relationshipWithApiu`, so it never generates a document
 * requirement for that data. Requiring "Surat Penunjukan Importir" there too
 * keeps every Step 2 metadata block backed by an actual document — see the
 * Step 3 report for this call-out.
 */
/** Shared by client upload UI (Step 3/4) and server-side completeness
 * calculations (Admin monitoring/list pages) — kept here rather than in a
 * "use client" component so both sides import the same plain function. */
export function isRequirementComplete<T extends { filePath: string }>(
  requirement: BrandDocumentRequirement,
  documents: Record<string, T>,
  productLabelDocumentation: T[],
): boolean {
  if (requirement.multiple) return productLabelDocumentation.length > 0;
  return Boolean(documents[requirement.code]);
}

export function getRequiredBrandDocuments(
  data: BrandDocumentRequirementInput,
): BrandDocumentRequirement[] {
  const requirements: BrandDocumentRequirement[] = [trademarkRequirement(data.evidenceType)];

  if (data.ownerLocation === "domestic" && data.relationshipWithApiu === "apiu_is_importer") {
    requirements.push(IMPORTER_APPOINTMENT_REQUIREMENT);
  }

  if (data.representationType === "apiu_official_representative") {
    requirements.push(...licenseRequirements(data.agreementType));
  }

  if (data.representationType === "other_official_representative") {
    requirements.push(
      ...OFFICIAL_REPRESENTATIVE_LEGAL_REQUIREMENTS,
      ...licenseRequirements(data.agreementType),
      IMPORTER_APPOINTMENT_REQUIREMENT,
    );
  }

  if (data.representationType === "appointed_importer" && data.appointmentSource === "brand_owner") {
    requirements.push({
      code: "importer_appointment_from_brand_owner",
      label: "Surat Penunjukan Importir dari Pemilik Merek / Pemilik Hak atas Merek",
      required: true,
      category: "import_authorization",
    });
  }

  if (
    data.representationType === "appointed_importer" &&
    data.appointmentSource === "official_representative"
  ) {
    requirements.push(
      IMPORTER_APPOINTMENT_REQUIREMENT,
      ...OFFICIAL_REPRESENTATIVE_LEGAL_REQUIREMENTS,
      ...licenseRequirements(data.agreementType),
    );
  }

  requirements.push(...PRODUCT_COMPLIANCE_REQUIREMENTS);

  return requirements;
}
