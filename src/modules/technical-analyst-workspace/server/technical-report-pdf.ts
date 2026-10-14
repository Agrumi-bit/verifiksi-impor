import { NextResponse } from "next/server";

import { renderAppPageToPdf } from "@/lib/html-to-pdf.server";

/**
 * "Unduh PDF" for the Laporan Analisis Teknis: prints the report page server-side (headless
 * Chromium, with the requester's session cookie) and returns it as a file download — no print
 * dialog. `pagePath` is the workspace's own report page; access is checked by the caller and again
 * by the page's API when Chromium loads it.
 */
export async function technicalReportPdfResponse(request: Request, pagePath: string, assignmentNumber: string) {
  try {
    const pdf = await renderAppPageToPdf(pagePath, {
      cookie: request.headers.get("cookie") ?? "",
      readySelector: "[data-a4-ready]",
      errorText: "Laporan tidak ditemukan",
    });
    const name = `Laporan-Analisis-Teknis-${assignmentNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[technical report pdf]", e);
    return NextResponse.json({ error: "PDF gagal dibuat" }, { status: 500 });
  }
}
