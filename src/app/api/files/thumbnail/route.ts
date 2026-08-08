import { NextResponse } from "next/server";

import { storage } from "@/lib/storage";
import { getServerSession } from "@/lib/get-session";
import { renderPdfFirstPageToPng } from "@/lib/pdf-thumbnail";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get("path");
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
  let png: Buffer;
  try {
    png = await renderPdfFirstPageToPng(pdfBuffer);
  } catch {
    return NextResponse.json({ error: "Gagal membuat thumbnail" }, { status: 422 });
  }

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(png.length),
    },
  });
}
