import { db } from "@/lib/db";

/** Resolves the two optional BrandOwner references Step 2 can point at
 * (domestic owner company, foreign representative) and 404s if either was
 * given but doesn't exist. Returns the owner company's name for the legacy
 * ownershipType/brandOwnerName bridge.
 *
 * Shared by every route that creates or updates a Merk row (`/api/merk`,
 * `/api/company-workspace/brands`, and both `[id]` PATCH handlers) — kept in
 * one place so a future validation rule change can't drift between them. */
export async function resolveOwnershipReferences(values: {
  ownerLocation?: string;
  ownerType?: string;
  ownerCompanyId?: string;
  officialRepresentativeCompanyId?: string;
}) {
  if (values.ownerLocation === "domestic" && values.ownerType === "company") {
    if (!values.ownerCompanyId) return { error: "Pilih perusahaan pemilik merek" as const };
    const owner = await db.brandOwner.findUnique({ where: { id: values.ownerCompanyId } });
    if (!owner) return { error: "Perusahaan pemilik merek tidak ditemukan" as const };
    if (values.officialRepresentativeCompanyId) {
      const rep = await db.brandOwner.findUnique({
        where: { id: values.officialRepresentativeCompanyId },
      });
      if (!rep) return { error: "Perwakilan resmi tidak ditemukan" as const };
    }
    return { ownerCompanyName: owner.name };
  }
  if (values.officialRepresentativeCompanyId) {
    const rep = await db.brandOwner.findUnique({
      where: { id: values.officialRepresentativeCompanyId },
    });
    if (!rep) return { error: "Perwakilan resmi tidak ditemukan" as const };
  }
  return { ownerCompanyName: null };
}

/** Step 3's Quality Test records reference real Commodity master data —
 * confirm every id actually exists rather than trusting the client. */
export async function validateQualityTestReferences(
  qualityTests: { commodityGroupId: string; commoditySubGroupId?: string }[] | undefined,
) {
  for (const qt of qualityTests ?? []) {
    const group = await db.commodityGroup.findUnique({ where: { id: qt.commodityGroupId } });
    if (!group) return "Komoditas pada Hasil Uji Mutu tidak ditemukan";
    if (qt.commoditySubGroupId) {
      const subGroup = await db.commoditySubGroup.findUnique({
        where: { id: qt.commoditySubGroupId },
      });
      if (!subGroup) return "Subkomoditas pada Hasil Uji Mutu tidak ditemukan";
    }
  }
  return null;
}
