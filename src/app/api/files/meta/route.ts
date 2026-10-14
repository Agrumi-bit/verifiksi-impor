import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/get-session";
import { photoMetaPath, type PhotoMeta } from "@/lib/photo-meta";
import { storage } from "@/lib/storage";

const MAX_PATHS = 60;

/**
 * GET ?path=a&path=b… — the date/GPS stored with each uploaded photo (see lib/photo-meta.ts), keyed
 * by path. Photos without metadata (older uploads, PNGs, a camera that wrote none) are left out.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paths = [...new Set(new URL(request.url).searchParams.getAll("path"))].slice(0, MAX_PATHS);
  const data: Record<string, PhotoMeta> = {};
  await Promise.all(
    paths.map(async (path) => {
      try {
        const metaPath = photoMetaPath(path);
        if (!(await storage.exists(metaPath))) return;
        data[path] = JSON.parse((await storage.read(metaPath)).toString("utf8")) as PhotoMeta;
      } catch {
        // invalid path or unreadable file: no metadata for it
      }
    }),
  );
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, max-age=300" } });
}
