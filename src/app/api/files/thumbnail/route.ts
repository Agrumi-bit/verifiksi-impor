import { NextResponse } from "next/server";

import { storage } from "@/lib/storage";
import { getServerSession } from "@/lib/get-session";
import { getPdfPageCount, renderPdfPageToPng } from "@/lib/pdf-thumbnail";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const path = searchParams.get("path");
  // Optional: page (1-based, default 1), width in px (default 480, max 1600), info=1 → JSON page count.
  const pageNumber = Number(searchParams.get("page") ?? "1") || 1;
  const width = Math.min(Math.max(Number(searchParams.get("width") ?? "480") || 480, 120), 1600);
  const infoOnly = searchParams.get("info") === "1";
  const format = searchParams.get("format") === "jpeg" ? "jpeg" : "png";
  if (!path) {
    return NextResponse.json({ error: "Path wajib diisi" }, { status: 400 });
  }
  if (path.split(".").pop()?.toLowerCase() !== "pdf") {
    return NextResponse.json({ error: "Thumbnail hanya didukung untuk file PDF" }, { status: 400 });
  }

  let exists: boolean;
  try {
    exists = await storage.exists(path);
  } catch {
    return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
  }
  if (!exists) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const pdfBuffer = await storage.read(path);
  if (infoOnly) {
    try {
      return NextResponse.json({ pageCount: await getPdfPageCount(pdfBuffer) });
    } catch {
      return NextResponse.json({ error: "PDF tidak dapat dibaca" }, { status: 422 });
    }
  }
  let png: Buffer;
  try {
    png = await renderPdfPageToPng(pdfBuffer, pageNumber, width, format);
  } catch (error) {
    console.error(`Thumbnail generation failed for ${path}:`, error);
    return NextResponse.json({ error: "Gagal membuat thumbnail" }, { status: 422 });
  }

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": format === "jpeg" ? "image/jpeg" : "image/png",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(png.length),
    },
  });
}
