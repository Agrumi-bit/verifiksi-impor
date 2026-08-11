import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * One-off diagnostic re-run for the PT Fortuna incident (see migrations 3
 * and 4, and the schedules/route.ts root-cause fix in commit 558f734):
 * "dokumen"/"technical" assignments are supposed to be created directly at
 * SUBMITTED, so anything still sitting in an earlier stage means it was
 * written outside that flow. Gated by a header check against an existing
 * secret instead of a session, since this has no browser UI to sign in
 * through. Remove this route once the audit it exists for is done.
 */
export async function GET(request: Request) {
  const key = request.headers.get("x-audit-key");
  if (!key || key !== process.env.BETTER_AUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stray = await db.assignment.findMany({
    where: {
      scheduleType: { in: ["dokumen", "technical"] },
      status: { notIn: ["SUBMITTED", "RETURNED", "COMPLETED"] },
    },
    select: {
      assignmentNumber: true,
      status: true,
      scheduleType: true,
      createdAt: true,
      verifikatorId: true,
      technicalReviewerId: true,
      application: {
        select: {
          applicationNumber: true,
          company: { select: { companyName: true } },
        },
      },
    },
  });

  return NextResponse.json({ count: stray.length, data: stray });
}
