import { db } from "@/lib/db";
import { createMasterDataDetailRoute } from "@/lib/master-data-routes";
import { commodityGroupUpdateSchema } from "@/modules/master-data/schema";

export const { PATCH, DELETE } = createMasterDataDetailRoute(db.commodityGroup, commodityGroupUpdateSchema, {
  dependents: async (id) => {
    const [subGroups, hsCodes, qualityTests, coverages] = await Promise.all([
      db.commoditySubGroup.count({ where: { commodityGroupId: id } }),
      db.hsCodeMasterData.count({ where: { commodityGroupId: id } }),
      db.brandQualityTest.count({ where: { commodityGroupId: id } }),
      db.brandQualityTestCoverage.count({ where: { commodityGroupId: id } }),
    ]);
    const used = [
      subGroups > 0 && `${subGroups} Komoditas`,
      hsCodes > 0 && `${hsCodes} HS Code`,
      qualityTests + coverages > 0 && `${qualityTests + coverages} sertifikat uji mutu`,
    ].filter(Boolean);
    return used.length > 0
      ? `Sub Kelompok Komoditas masih dipakai oleh ${used.join(", ")}. Nonaktifkan saja bila tidak dipakai lagi.`
      : null;
  },
});
