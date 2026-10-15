import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/get-session";
import { getReportPdfJob } from "@/lib/report-pdf-jobs.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Progress of an "Unduh PDF" job: status, percent (0–100) and a short detail line. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const job = getReportPdfJob(id, session.user.id);
  if (!job) return NextResponse.json({ error: "Proses PDF tidak ditemukan" }, { status: 404 });
  return NextResponse.json(
    { data: { status: job.status, percent: job.percent, detail: job.detail, size: job.pdf?.length ?? null } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
