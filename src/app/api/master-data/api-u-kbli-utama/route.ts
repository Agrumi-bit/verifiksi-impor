import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { createMasterDataListRoute } from "@/lib/master-data-routes";
import { requireAdminSession } from "@/lib/require-admin-session";
import { apiUKbliUtamaSchema } from "@/modules/master-data/schema";

const route = createMasterDataListRoute(db.apiUKbliUtama, apiUKbliUtamaSchema);

/** Any signed-in user may read the list — the company Legal step (admin wizard and the company's own profile editor) needs it. */
export async function GET() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return route.GET();
}

/** Only admins manage the list (System Configuration → KBLI Utama API-U). */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;
  return route.POST(request);
}
