import { db } from "@/lib/db";
import { createMasterDataDetailRoute } from "@/lib/master-data-routes";
import { industryGroupUpdateSchema } from "@/modules/master-data/schema";

export const { PATCH } = createMasterDataDetailRoute(
  db.industryGroup,
  industryGroupUpdateSchema,
);
