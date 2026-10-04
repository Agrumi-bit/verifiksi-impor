import { db } from "@/lib/db";
import { createMasterDataDetailRoute } from "@/lib/master-data-routes";
import { requireAdminSession } from "@/lib/require-admin-session";
import { apiUKbliUtamaUpdateSchema } from "@/modules/master-data/schema";

const route = createMasterDataDetailRoute(db.apiUKbliUtama, apiUKbliUtamaUpdateSchema);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminSession();
  if (error) return error;
  return route.PATCH(request, context);
}
