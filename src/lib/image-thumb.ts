import "server-only";

import { createHash } from "node:crypto";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import { storage } from "@/lib/storage";

/**
 * Small WebP thumbnails of uploaded photos, for grids and lists (survey documentation, product and
 * machine photos). The uploaded photo itself is already compressed in the browser
 * (lib/image-compress.ts); a thumbnail is ~20–40 KB, so a page showing many photos stays light.
 *
 * Same pattern as lib/pdf-preview.ts: thumbnails live at `previews/<sha1(path|size|mtime)>-thumb.webp`
 * (a replaced file never reuses a stale one), a `.skip` marker records files that failed or wouldn't
 * shrink, and generation runs one at a time in the background (the VPS has one CPU). The decoder
 * applies a photo's EXIF orientation itself, so older uploads that still carry one come out upright.
 */

export const THUMB_MAX_EDGE = 480;
const THUMB_QUALITY = 70;
/** Below this the photo is already as light as a thumbnail. */
const MIN_SIZE_BYTES = 60 * 1024;
/** Photos larger than this are skipped (uploads are capped at 10 MB, so this is only a safety net). */
const MAX_INPUT_PIXELS = 60_000_000;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "jfif", "jpe", "png", "webp"]);

const inFlight = new Set<string>();
const queue: Array<{ source: string; key: string }> = [];
let running = false;

export function isThumbnailable(path: string): boolean {
  return !path.startsWith("previews/") && IMAGE_EXTENSIONS.has(path.split(".").pop()?.toLowerCase() ?? "");
}

function thumbKeyFor(source: string, size: number, mtimeMs: number) {
  return createHash("sha1").update(`${source}|${size}|${Math.round(mtimeMs)}`).digest("hex");
}

/**
 * Storage path of a ready thumbnail for `source`, or null when the original should be served (not a
 * photo, already small, thumbnail still being made, or not worth it). A missing thumbnail is queued,
 * so the next view gets it.
 */
export async function resolveImageThumb(source: string): Promise<string | null> {
  if (!isThumbnailable(source)) return null;
  let info;
  try {
    info = await storage.stat(source);
  } catch {
    return null;
  }
  if (info.size < MIN_SIZE_BYTES) return null;

  const key = thumbKeyFor(source, info.size, info.mtimeMs);
  const thumbPath = `previews/${key}-thumb.webp`;
  if (await storage.exists(thumbPath)) return thumbPath;
  if (await storage.exists(`previews/${key}-thumb.skip`)) return null;

  enqueue(source, key);
  return null;
}

/** Fire-and-forget: queue a thumbnail for a just-uploaded / existing photo. */
export function scheduleImageThumb(source: string) {
  void resolveImageThumb(source).catch(() => undefined);
}

function enqueue(source: string, key: string) {
  if (inFlight.has(key)) return;
  inFlight.add(key);
  queue.push({ source, key });
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        await generate(job.source, job.key);
      } catch (error) {
        console.error("[image-thumb] failed", job.source, error);
        await storage.save("previews", `${job.key}-thumb.skip`, Buffer.from("failed")).catch(() => undefined);
      } finally {
        inFlight.delete(job.key);
      }
    }
  } finally {
    running = false;
  }
}

async function generate(source: string, key: string) {
  const original = await storage.read(source);
  const image = await loadImage(original);
  if (!image.width || !image.height || image.width * image.height > MAX_INPUT_PIXELS) {
    await storage.save("previews", `${key}-thumb.skip`, Buffer.from("unsupported-size"));
    return;
  }

  const scale = Math.min(1, THUMB_MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = createCanvas(width, height);
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  const thumb = await canvas.encode("webp", THUMB_QUALITY);

  if (thumb.length >= original.length) {
    await storage.save("previews", `${key}-thumb.skip`, Buffer.from(`no-gain ${thumb.length}/${original.length}`));
    return;
  }
  await storage.save("previews", `${key}-thumb.webp`, thumb);
}
