import { db } from "@/lib/db";
import { createMasterDataDetailRoute } from "@/lib/master-data-routes";
import { electricityTariffMasterDataUpdateSchema } from "@/modules/master-data/schema";

export const { PATCH } = createMasterDataDetailRoute(
  db.electricityTariffMasterData,
  electricityTariffMasterDataUpdateSchema,
);
