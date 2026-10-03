import { db } from "@/lib/db";
import { createMasterDataListRoute } from "@/lib/master-data-routes";
import { hsCodeMasterDataSchema } from "@/modules/master-data/schema";

export const { GET, POST } = createMasterDataListRoute(
  db.hsCodeMasterData,
  hsCodeMasterDataSchema,
  {
    include: {
      commodityGroup: { include: { industryGroup: true } },
      commoditySubGroup: true,
      unitOfMeasurement: true,
    },
  },
);
