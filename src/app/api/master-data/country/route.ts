import { db } from "@/lib/db";
import { createMasterDataListRoute } from "@/lib/master-data-routes";
import { countryMasterDataSchema } from "@/modules/master-data/schema";

export const { GET, POST } = createMasterDataListRoute(
  db.countryMasterData,
  countryMasterDataSchema,
);
