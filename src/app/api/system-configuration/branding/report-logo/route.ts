import { NextResponse } from "next/server";

import { storage } from "@/lib/storage";
import { getBrandingSettings } from "@/lib/get-branding";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * Same shape as `/api/system-configuration/branding/logo` but serves `reportLogoPath` — the
 * letterhead mark printed on generated reports, deliberately a separate admin-managed asset
 * from the login/sidebar logo (reports are often shared/printed outside the app). Deliberately
 * public and deliberately narrow for the same reason as the sibling route: no path param, only
 * ever serves the one admin-designated report logo.
 */
export async function GET() {
  const branding = await getBrandingSettings();
  if (!branding.reportLogoPath) {
    return NextResponse.json({ error: "Logo laporan belum diatur" }, { status: 404 });
  }

  const extension = branding.reportLogoPath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Tipe file tidak didukung" }, { status: 400 });
  }

  const exists = await storage.exists(branding.reportLogoPath);
  if (!exists) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const buffer = await storage.read(branding.reportLogoPath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(buffer.length),
    },
  });
}
