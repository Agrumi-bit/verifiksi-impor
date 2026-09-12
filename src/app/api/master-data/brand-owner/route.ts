import { db } from "@/lib/db";
import { createMasterDataListRoute } from "@/lib/master-data-routes";
import { brandOwnerSchema } from "@/modules/master-data/schema";

export const { GET, POST } = createMasterDataListRoute(db.brandOwner, brandOwnerSchema);
