import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/get-session";
import { publicReportHref } from "@/lib/signed-file-link";

const MAX_HREFS = 500;

/**
 * POST { hrefs: string[] } — signed public links for a report's /api/files links, keyed by the href as
 * written on the page. Used by "Cetak" (lib/print-with-signed-links.ts) so a report saved from the
 * browser's print dialog opens its documents without a login, like one from "Unduh PDF".
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let hrefs: unknown;
  try {
    hrefs = ((await request.json()) as { hrefs?: unknown }).hrefs;
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  if (!Array.isArray(hrefs) || hrefs.length > MAX_HREFS || !hrefs.every((href) => typeof href === "string")) {
    return NextResponse.json({ error: "hrefs wajib berupa daftar link" }, { status: 400 });
  }

  // Page links are relative (/api/files?path=…): resolved against this request's origin they count as
  // links into the app, which publicReportHref turns into signed public links.
  const origin = new URL(request.url).origin;
  const data: Record<string, string> = {};
  for (const href of new Set(hrefs as string[])) {
    const signed = publicReportHref(href, origin);
    if (new URL(signed, origin).searchParams.has("sig")) data[href] = signed;
  }
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
