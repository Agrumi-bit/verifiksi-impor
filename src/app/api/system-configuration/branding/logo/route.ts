import { NextResponse } from "next/server";

import { storage } from "@/lib/storage";
import { getBrandingSettings } from "@/lib/get-branding";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * Deliberately public and deliberately narrow — unlike `/api/files` (auth-gated, arbitrary
 * path), this only ever serves the one admin-designated branding logo. The login page needs
 * a logo before any session exists, so this can't require auth, but it also can't accept a
 * path param or it would become an unauthenticated file-read endpoint.
 */
export async function GET() {
  const branding = await getBrandingSettings();
  if (!branding.logoPath) {
    return NextResponse.json({ error: "Logo belum diatur" }, { status: 404 });
  }

  const extension = branding.logoPath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Tipe file tidak didukung" }, { status: 400 });
  }

  const exists = await storage.exists(branding.logoPath);
  if (!exists) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const buffer = await storage.read(branding.logoPath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(buffer.length),
    },
  });
}
