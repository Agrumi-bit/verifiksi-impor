import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { storage } from "@/lib/storage";
import type { StorageFileStat } from "@/lib/storage";
import { getServerSession } from "@/lib/get-session";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** Stored files are immutable per version (a new upload gets a new path), so a long
 * private cache is safe and lets re-opens skip the round trip entirely. */
const CACHE_CONTROL = "private, max-age=3600, must-revalidate";

type ResolvedFile = {
  path: string;
  filename: string;
  contentType: string;
  stat: StorageFileStat;
};

type Resolution = { ok: true; file: ResolvedFile } | { ok: false; response: NextResponse };

async function resolveFile(request: Request): Promise<Resolution> {
  const session = await getServerSession();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const path = new URL(request.url).searchParams.get("path");
  if (!path) {
    return { ok: false, response: NextResponse.json({ error: "Path wajib diisi" }, { status: 400 }) };
  }

  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return { ok: false, response: NextResponse.json({ error: "Tipe file tidak didukung" }, { status: 400 }) };
  }

  let stat: StorageFileStat;
  try {
    if (!(await storage.exists(path))) {
      return { ok: false, response: NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 }) };
    }
    stat = await storage.stat(path);
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Path tidak valid" }, { status: 400 }) };
  }

  return {
    ok: true,
    file: { path, filename: path.split("/").pop() ?? path, contentType, stat },
  };
}

function baseHeaders(file: ResolvedFile): Record<string, string> {
  return {
    "Content-Type": file.contentType,
    "Content-Disposition": `inline; filename="${file.filename}"`,
    "Cache-Control": CACHE_CONTROL,
    "Accept-Ranges": "bytes",
    "Last-Modified": new Date(file.stat.mtimeMs).toUTCString(),
    ETag: `"${file.stat.size.toString(16)}-${Math.round(file.stat.mtimeMs).toString(16)}"`,
  };
}

/** Parses a single-range `Range` header (`bytes=start-end`, `bytes=start-`, `bytes=-suffix`).
 * Returns null for absent, malformed, multi-range, or unsatisfiable inputs. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, startRaw, endRaw] = match;
  if (startRaw === "" && endRaw === "") return null;

  let start: number;
  let end: number;
  if (startRaw === "") {
    const suffixLength = Number(endRaw);
    if (suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === "" ? size - 1 : Math.min(Number(endRaw), size - 1);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= size) {
    return null;
  }
  return { start, end };
}

function streamBody(nodeStream: Readable): ReadableStream {
  return Readable.toWeb(nodeStream) as unknown as ReadableStream;
}

export async function HEAD(request: Request): Promise<NextResponse> {
  const resolution = await resolveFile(request);
  if (!resolution.ok) {
    return new NextResponse(null, { status: resolution.response.status });
  }
  const { file } = resolution;
  return new NextResponse(null, {
    headers: { ...baseHeaders(file), "Content-Length": String(file.stat.size) },
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const resolution = await resolveFile(request);
  if (!resolution.ok) return resolution.response;

  const { file } = resolution;
  const { size } = file.stat;
  const headers = baseHeaders(file);

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    }
    const chunk = storage.createReadStream(file.path, range);
    return new NextResponse(streamBody(chunk), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
        "Content-Length": String(range.end - range.start + 1),
      },
    });
  }

  const full = storage.createReadStream(file.path);
  return new NextResponse(streamBody(full), {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
