import { NextResponse } from "next/server";

import { renderAppPageToPdf } from "@/lib/html-to-pdf.server";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const PERIOD = /^\d{4}-\d{4}$/;

/**
 * GET ?scheme=konsumsi|industri|non-industri&periode=YYYY-YYYY — the Laporan Pelaksanaan VIU as a PDF file
 * (direct download for "Unduh PDF"), printed server-side from the report page with the PM's session.
 */
export async function GET(request: Request) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get("scheme") ?? "konsumsi";
  const periode = searchParams.get("periode") ?? "";
  if (scheme !== "konsumsi" && scheme !== "industri" && scheme !== "non-industri") return NextResponse.json({ error: "Skema tidak valid" }, { status: 400 });
  if (periode && !PERIOD.test(periode)) return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });

  const query = periode ? `?periode=${periode}` : "";
  try {
    const pdf = await renderAppPageToPdf(`/project-manager-workspace/viu/${scheme}/laporan-kemenperin/laporan${query}`, {
      cookie: request.headers.get("cookie") ?? "",
      readySelector: ".report-doc section.rd-sheet",
      errorText: "Laporan gagal dimuat",
    });
    const name = `Laporan-Pelaksanaan-VIU-${scheme === "industri" ? "Industri" : scheme === "non-industri" ? "Non-Industri" : "Konsumsi"}${periode ? `-${periode}` : ""}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[pasal47 pdf]", e);
    return NextResponse.json({ error: "PDF gagal dibuat" }, { status: 500 });
  }
}
