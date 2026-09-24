import { NextResponse } from "next/server";

import { storage } from "@/lib/storage";
import { getServerSession } from "@/lib/get-session";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Path wajib diisi" }, { status: 400 });
  }

  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Tipe file tidak didukung" }, { status: 400 });
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

  const buffer = await storage.read(path);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${path.split("/").pop()}"`,
      "Cache-Control": "private, max-age=300",
      "Content-Length": String(buffer.length),
    },
  });
}
