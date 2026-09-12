import { db } from "@/lib/db";
import { computeTrademarkEvidenceValidity } from "../viu-brand-relationship-rules";
import type { MerkEvidenceType } from "@/modules/merk/schema";
import type { ApplicationWizardValues } from "../schema";

// Prisma's MerkCertificateType enum still carries the legacy "LAINNYA" value
// (rows from the pre-drawer wizard) that the current evidence-type set
// doesn't cover — see SUPPORTED_EVIDENCE_TYPES in
// map-merk-detail-to-wizard-values.ts for the same guard on the client side.
const SUPPORTED_EVIDENCE_TYPES = new Set<string>([
  "SERTIFIKAT_MEREK_TERDAFTAR",
  "TANDA_DAFTAR_MEREK",
  "SERTIFIKAT_INTERNASIONAL",
]);
function toEvidenceType(value: string | null): MerkEvidenceType | null {
  return value && SUPPORTED_EVIDENCE_TYPES.has(value) ? (value as MerkEvidenceType) : null;
}

/**
 * Server-side enforcement for Step "Merek yang Digunakan" — mirrors
 * modules/merk/server-validation.ts's pattern (a plain async function called
 * after zod parse, not folded into the zod schema itself, since it needs a
 * DB read). Never trust the client's own computed readiness: this
 * re-validates Brand ownership/status, the 9-month evidence rule, and the
 * relationship's structural validity independently, exactly the same rules
 * `getVIUConsumptionBrandRequirements` applies client-side.
 */
export async function validateApplicationBrands(
  values: Pick<ApplicationWizardValues, "importTypes" | "companyId" | "applicationBrands">,
): Promise<{ error: string } | { ok: true }> {
  if (!values.importTypes.includes("BARANG_KONSUMSI")) return { ok: true };
  if (values.applicationBrands.length === 0) {
    return { error: "Pilih atau tambahkan minimal satu merek yang digunakan." };
  }

  const brandIds = values.applicationBrands.map((entry) => entry.brandId);
  if (new Set(brandIds).size !== brandIds.length) {
    return { error: "Merek yang sama tidak dapat dipilih lebih dari sekali dalam satu permohonan." };
  }

  const brands = await db.merk.findMany({
    where: { id: { in: brandIds } },
    include: { ownership: { select: { ownerLocation: true } } },
  });
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));

  for (const entry of values.applicationBrands) {
    const brand = brandById.get(entry.brandId);
    if (!brand) {
      return { error: "Salah satu merek pada permohonan ini tidak ditemukan." };
    }
    if (values.companyId && brand.companyId !== values.companyId) {
      return { error: `Merek "${brand.brandName}" tidak terdaftar untuk perusahaan pemohon ini.` };
    }
    if (brand.status !== "ACTIVE") {
      return {
        error: `Merek "${brand.brandName}" berstatus ${brand.status} dan tidak dapat digunakan pada permohonan ini.`,
      };
    }

    const evidenceValidity = computeTrademarkEvidenceValidity(
      toEvidenceType(brand.certificateType),
      brand.registrationDate?.toISOString() ?? null,
    );
    if (evidenceValidity.status === "EXPIRED_9_MONTH_LIMIT") {
      return {
        error: `Tanda pendaftaran merek "${brand.brandName}" telah melewati batas penggunaan 9 bulan dan tidak dapat digunakan sebagai pengganti Sertifikat Merek.`,
      };
    }

    const ownerLocation =
      brand.ownership?.ownerLocation === "DOMESTIC"
        ? "domestic"
        : brand.ownership?.ownerLocation === "FOREIGN"
          ? "foreign"
          : null;

    if (entry.applicantRole === "IMPORTER_ONLY") {
      if (!entry.appointmentSource) {
        return { error: `Pilih sumber penunjukan importir untuk merek "${brand.brandName}".` };
      }
      if (entry.appointmentSource === "BRAND_OWNER" && ownerLocation !== "domestic") {
        return {
          error: `Penunjukan langsung dari pemilik merek untuk "${brand.brandName}" hanya dapat digunakan apabila pemilik merek berkedudukan di Indonesia.`,
        };
      }
      if (entry.appointmentSource === "OFFICIAL_REPRESENTATIVE") {
        if (!entry.officialRepresentativeCompanyId) {
          return { error: `Pilih Perwakilan Resmi untuk merek "${brand.brandName}".` };
        }
        const representative = await db.brandOwner.findUnique({
          where: { id: entry.officialRepresentativeCompanyId },
        });
        if (!representative) {
          return { error: `Perwakilan Resmi untuk merek "${brand.brandName}" tidak ditemukan.` };
        }
      }
    } else if (entry.applicantRole !== "OFFICIAL_REPRESENTATIVE") {
      return { error: `Pilih peran perusahaan pemohon terhadap merek "${brand.brandName}".` };
    }
  }

  return { ok: true };
}
