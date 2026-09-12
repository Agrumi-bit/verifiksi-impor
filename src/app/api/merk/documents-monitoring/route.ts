import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/require-admin-session";
import { getDocumentsMonitoringSummary } from "@/modules/merk/compute-documents-monitoring";

/**
 * "Dokumen & Monitoring" — the merged control-center page (see the
 * navigation report: separate Dokumen/Monitoring sidebar items were
 * consolidated into one). The actual computation lives in
 * `getDocumentsMonitoringSummary` so the Merek Management Dashboard's
 * operational KPIs share the exact same numbers instead of a second,
 * independently-drifting computation.
 */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const data = await getDocumentsMonitoringSummary();
  return NextResponse.json({ data });
}
