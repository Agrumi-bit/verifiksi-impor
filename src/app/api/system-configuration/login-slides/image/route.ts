import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Deliberately public and deliberately narrow — like `/api/system-configuration/branding/logo`,
 * but generalized to any path since there are multiple slides. Safety comes from the DB
 * membership check below, not from auth: this can only ever serve a path that some admin has
 * explicitly saved as a `LoginSlide.imagePath` (any status — the admin preview UI needs draft
 * slide images too), never an arbitrary storage path.
 */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Path wajib diisi" }, { status: 400 });
  }

  const owningSlide = await db.loginSlide.findFirst({ where: { imagePath: path }, select: { id: true } });
  if (!owningSlide) {
    return NextResponse.json({ error: "Gambar tidak ditemukan" }, { status: 404 });
  }

  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Tipe file tidak didukung" }, { status: 400 });
  }

  const exists = await storage.exists(path);
  if (!exists) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const buffer = await storage.read(path);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(buffer.length),
    },
  });
}
