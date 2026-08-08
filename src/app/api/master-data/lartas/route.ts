import { db } from "@/lib/db";
import { createMasterDataListRoute } from "@/lib/master-data-routes";
import { lartasImporSchema } from "@/modules/master-data/schema";

export const { GET, POST } = createMasterDataListRoute(db.lartasImpor, lartasImporSchema, {
  include: { hsCode: { include: { commoditySubGroup: true } } },
});
