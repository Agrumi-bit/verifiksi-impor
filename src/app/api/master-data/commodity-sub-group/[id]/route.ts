import { db } from "@/lib/db";
import { createMasterDataDetailRoute } from "@/lib/master-data-routes";
import { commoditySubGroupUpdateSchema } from "@/modules/master-data/schema";

export const { PATCH, DELETE } = createMasterDataDetailRoute(db.commoditySubGroup, commoditySubGroupUpdateSchema, {
  dependents: async (id) => {
    const [hsCodes, qualityTests] = await Promise.all([
      db.hsCodeMasterData.count({ where: { commoditySubGroupId: id } }),
      db.brandQualityTest.count({ where: { commoditySubGroupId: id } }),
    ]);
    const used = [hsCodes > 0 && `${hsCodes} HS Code`, qualityTests > 0 && `${qualityTests} sertifikat uji mutu`].filter(Boolean);
    return used.length > 0
      ? `Komoditas masih dipakai oleh ${used.join(", ")}. Nonaktifkan saja bila tidak dipakai lagi.`
      : null;
  },
});
