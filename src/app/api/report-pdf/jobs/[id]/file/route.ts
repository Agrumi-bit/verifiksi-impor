import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/get-session";
import { takeReportPdf } from "@/lib/report-pdf-jobs.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The finished PDF of an "Unduh PDF" job, as a file download (once). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const file = takeReportPdf(id, session.user.id);
  if (!file) return NextResponse.json({ error: "PDF belum siap" }, { status: 404 });
  return new NextResponse(new Uint8Array(file.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.name}.pdf"`,
      "Content-Length": String(file.pdf.length),
      "Cache-Control": "no-store",
    },
  });
}
