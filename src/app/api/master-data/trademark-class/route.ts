import { db } from "@/lib/db";
import { createMasterDataListRoute } from "@/lib/master-data-routes";
import { trademarkClassMasterDataSchema } from "@/modules/master-data/schema";

export const { GET, POST } = createMasterDataListRoute(
  db.trademarkClassMasterData,
  trademarkClassMasterDataSchema,
  { orderBy: { classNumber: "asc" } },
);
