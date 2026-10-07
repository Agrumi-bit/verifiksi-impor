import { db } from "@/lib/db";
import { createMasterDataDetailRoute } from "@/lib/master-data-routes";
import { industryGroupUpdateSchema } from "@/modules/master-data/schema";

export const { PATCH, DELETE } = createMasterDataDetailRoute(db.industryGroup, industryGroupUpdateSchema, {
  dependents: async (id) => {
    const subGroups = await db.commodityGroup.count({ where: { industryGroupId: id } });
    return subGroups > 0
      ? `Kelompok Komoditas masih memiliki ${subGroups} Sub Kelompok Komoditas. Hapus atau pindahkan dulu, atau nonaktifkan saja.`
      : null;
  },
});
