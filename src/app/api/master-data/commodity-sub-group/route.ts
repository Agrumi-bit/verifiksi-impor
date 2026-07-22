import { db } from "@/lib/db";
import { createMasterDataListRoute } from "@/lib/master-data-routes";
import { commoditySubGroupSchema } from "@/modules/master-data/schema";

export const { GET, POST } = createMasterDataListRoute(
  db.commoditySubGroup,
  commoditySubGroupSchema,
  { include: { commodityGroup: true } },
);
