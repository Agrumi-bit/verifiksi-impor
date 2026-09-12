import { db } from "@/lib/db";

/** Resolves the optional BrandOwner reference Step 2 can point at (the
 * foreign-owner "Perwakilan Resmi" selector) and 404s if it was given but
 * doesn't exist. Domestic "Nama Perusahaan / Pemilik Merek" is manual free
 * text (`ownerName`), not a BrandOwner reference, so it needs no lookup —
 * `ownerCompanyName` always resolves to `null` and the legacy
 * ownershipType/brandOwnerName bridge falls back to `ownerName` instead (see
 * build-create-data.ts).
 *
 * Shared by every route that creates or updates a Merk row (`/api/merk`,
 * `/api/company-workspace/brands`, and both `[id]` PATCH handlers) — kept in
 * one place so a future validation rule change can't drift between them. */
export async function resolveOwnershipReferences(values: {
  officialRepresentativeCompanyId?: string;
}) {
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
