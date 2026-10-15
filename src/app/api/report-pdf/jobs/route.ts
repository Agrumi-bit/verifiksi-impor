import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/get-session";
import { REPORT_PAGE, startReportPdfJob } from "@/lib/report-pdf-jobs.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { page, name } — start printing a report page to PDF in the background; returns the job id. */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { page?: unknown; name?: unknown } | null;
  const page = typeof body?.page === "string" ? body.page : "";
  if (!REPORT_PAGE.test(page)) return NextResponse.json({ error: "Halaman tidak valid" }, { status: 400 });
  const rawName = typeof body?.name === "string" ? body.name : "Laporan";
  const name = rawName.replace(/[^A-Za-z0-9._-]/g, "-").replace(/\.pdf$/i, "").slice(0, 120) || "Laporan";

  const job = startReportPdfJob({ userId: session.user.id, page, name, cookie: request.headers.get("cookie") ?? "" });
  return NextResponse.json({ data: { id: job.id } }, { status: 202 });
}
