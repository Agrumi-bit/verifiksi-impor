import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

/**
 * How many not-yet-finished applications use this HS Code in a VIU Konsumsi product — shown to the
 * admin before moving the HS Code to another Sub Kelompok Komoditas: those products are regrouped
 * (resyncKonsumsiProductCommodities) the next time the draft / revision / Admin edit is opened,
 * and their new Merek x Sub Kelompok group may need its own Hasil Uji Mutu certificate.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const rows = await db.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT "status", COUNT(*) AS "count"
    FROM "application"
    WHERE "status" NOT IN ('COMPLETED', 'REJECTED', 'WITHDRAWN')
      AND "payload"->'konsumsiProducts' @> ${JSON.stringify([{ hsCodeId: id }])}::jsonb
    GROUP BY "status"`;

  const byStatus = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  const drafts = (byStatus.DRAFT ?? 0) + (byStatus.RETURNED ?? 0);
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  return NextResponse.json({ data: { drafts, active: total - drafts, total } });
}
