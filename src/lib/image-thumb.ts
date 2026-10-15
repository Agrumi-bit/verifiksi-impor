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

/**
 * Sized copies of a photo:
 * - `thumb`  (480 px) — grids, lists, cards;
 * - `report` (1400 px) — printed/A4 reports (Dokumentasi Lapangan, Lampiran Foto): sharp at A4 print
 *   size but a fraction of a 12 MP camera original, so a report with ~100 photos opens quickly.
 */
export type ImageVariant = "thumb" | "report";
const VARIANTS: Record<ImageVariant, { maxEdge: number; quality: number; minSize: number }> = {
  thumb: { maxEdge: THUMB_MAX_EDGE, quality: 70, minSize: 60 * 1024 },
  report: { maxEdge: 1400, quality: 78, minSize: 400 * 1024 },
};
/** Photos larger than this are skipped (uploads are capped at 10 MB, so this is only a safety net). */
const MAX_INPUT_PIXELS = 60_000_000;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "jfif", "jpe", "png", "webp"]);

const inFlight = new Set<string>();
const queue: Array<{ source: string; key: string; variant: ImageVariant }> = [];
let running = false;

export function isThumbnailable(path: string): boolean {
  return !path.startsWith("previews/") && IMAGE_EXTENSIONS.has(path.split(".").pop()?.toLowerCase() ?? "");
}

function thumbKeyFor(source: string, size: number, mtimeMs: number) {
  return createHash("sha1").update(`${source}|${size}|${Math.round(mtimeMs)}`).digest("hex");
}

/** File name suffix of a variant: thumbnails keep their original `-thumb` names. */
const suffix = (variant: ImageVariant) => (variant === "thumb" ? "thumb" : variant);

/**
 * Storage path of a ready thumbnail for `source`, or null when the original should be served (not a
 * photo, already small, thumbnail still being made, or not worth it). A missing thumbnail is queued,
 * so the next view gets it.
 */
export async function resolveImageThumb(source: string, variant: ImageVariant = "thumb"): Promise<string | null> {
  return (await resolveImageCopy(source, variant)).path;
}

/** Like resolveImageThumb, plus whether the copy is still being made (`pending`). */
export async function resolveImageCopy(source: string, variant: ImageVariant): Promise<{ path: string | null; pending: boolean }> {
  const none = { path: null, pending: false };
  if (!isThumbnailable(source)) return none;
  let info;
  try {
    info = await storage.stat(source);
  } catch {
    return none;
  }
  if (info.size < VARIANTS[variant].minSize) return none;

  const key = thumbKeyFor(source, info.size, info.mtimeMs);
  const thumbPath = `previews/${key}-${suffix(variant)}.webp`;
  if (await storage.exists(thumbPath)) return { path: thumbPath, pending: false };
  if (await storage.exists(`previews/${key}-${suffix(variant)}.skip`)) return none;

  enqueue(source, key, variant);
  return { path: null, pending: true };
}

/** Fire-and-forget: queue the thumbnail and the report copy of a just-uploaded / existing photo. */
export function scheduleImageThumb(source: string) {
  void resolveImageThumb(source, "thumb").catch(() => undefined);
  void resolveImageThumb(source, "report").catch(() => undefined);
}

function enqueue(source: string, key: string, variant: ImageVariant) {
  const id = `${key}-${variant}`;
  if (inFlight.has(id)) return;
  inFlight.add(id);
  queue.push({ source, key, variant });
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        await generate(job.source, job.key, job.variant);
      } catch (error) {
        console.error("[image-thumb] failed", job.source, job.variant, error);
        await storage.save("previews", `${job.key}-${suffix(job.variant)}.skip`, Buffer.from("failed")).catch(() => undefined);
      } finally {
        inFlight.delete(`${job.key}-${job.variant}`);
      }
    }
  } finally {
    running = false;
  }
}

async function generate(source: string, key: string, variant: ImageVariant) {
  const { maxEdge, quality } = VARIANTS[variant];
  const name = suffix(variant);
  const original = await storage.read(source);
  const image = await loadImage(original);
  if (!image.width || !image.height || image.width * image.height > MAX_INPUT_PIXELS) {
    await storage.save("previews", `${key}-${name}.skip`, Buffer.from("unsupported-size"));
    return;
  }

  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = createCanvas(width, height);
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  const thumb = await canvas.encode("webp", quality);

  if (thumb.length >= original.length) {
    await storage.save("previews", `${key}-${name}.skip`, Buffer.from(`no-gain ${thumb.length}/${original.length}`));
    return;
  }
  await storage.save("previews", `${key}-${name}.webp`, thumb);
}
