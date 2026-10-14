/**
 * Browser-side photo compression before upload: a JPG/PNG/WebP (or HEIC, where the browser can
 * decode it — Safari) is re-encoded at most IMAGE_MAX_EDGE px on its longest side, as WebP, so a
 * 3–8 MB phone photo uploads as a few hundred KB. The full-resolution original is NOT kept: that is
 * a decision (screen and A4 print never need more than 2000 px).
 *
 * Safari cannot encode WebP from a canvas; there JPEG is used instead, and a PNG is left as it is so
 * its transparency survives. Whenever compression fails or does not make the file smaller, the
 * original file is uploaded unchanged — an upload never fails because of compression.
 */

import { readJpegExif, type PhotoExif } from "./exif";

export const IMAGE_MAX_EDGE = 2000;
export const IMAGE_QUALITY = 0.8;
/** Below this a photo is already quick to upload and show. */
export const IMAGE_MIN_BYTES = 300 * 1024;

const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_NAME = /\.(heic|heif)$/i;

export function isHeic(file: { name: string; type: string }): boolean {
  return HEIC_TYPES.has(file.type.toLowerCase()) || HEIC_NAME.test(file.name);
}

/** Whether a file is worth decoding at all. HEIC is always converted: the server refuses it. */
export function shouldCompress(file: { name: string; type: string; size: number }): boolean {
  if (isHeic(file)) return true;
  return COMPRESSIBLE_TYPES.has(file.type.toLowerCase()) && file.size >= IMAGE_MIN_BYTES;
}

/** Fits width × height inside a square of `maxEdge`, never enlarging. */
export function fitWithin(width: number, height: number, maxEdge = IMAGE_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** "IMG_1234.JPG" → "IMG_1234.webp". */
export function renameExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "foto";
  return `${base}.${extension}`;
}

/** The encoded result is kept only when it is a real gain, or when the source can't be uploaded as is (HEIC). */
export function keepCompressed(original: { name: string; type: string; size: number }, compressedSize: number): boolean {
  return isHeic(original) || compressedSize < original.size;
}

type Canvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(width: number, height: number): Canvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function encode(canvas: Canvas, type: string, quality: number): Promise<Blob | null> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** The photo to upload: smaller and WebP (JPEG on Safari) when that helps, otherwise `file` itself. */
export async function compressImage(file: File): Promise<File> {
  if (typeof window === "undefined" || typeof createImageBitmap === "undefined" || !shouldCompress(file)) return file;
  try {
    // "from-image" applies the EXIF orientation, so a photo taken in portrait stays upright.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = makeCanvas(width, height);
    const context = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let blob = await encode(canvas, "image/webp", IMAGE_QUALITY);
    if (!blob || blob.type !== "image/webp") {
      // No WebP encoder (Safari). A PNG may be transparent, which JPEG would lose: keep it as is.
      if (file.type === "image/png") return file;
      blob = await encode(canvas, "image/jpeg", IMAGE_QUALITY);
    }
    if (!blob || !keepCompressed(file, blob.size)) return file;
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], renameExtension(file.name, extension), { type: blob.type, lastModified: file.lastModified });
  } catch {
    // Not decodable here (e.g. HEIC outside Safari): upload the original and let the server decide.
    return file;
  }
}

/** Size of the file head read for EXIF — the EXIF block sits right after the JPEG start marker. */
const EXIF_HEAD_BYTES = 128 * 1024;

/** Date and place a JPEG photo was taken, read BEFORE compression (which drops EXIF). */
export async function readPhotoMeta(file: File): Promise<PhotoExif> {
  if (file.type !== "image/jpeg" && !/\.jpe?g$/i.test(file.name)) return {};
  try {
    const { takenAt, lat, lng } = readJpegExif(await file.slice(0, EXIF_HEAD_BYTES).arrayBuffer());
    return { takenAt, lat, lng };
  } catch {
    return {};
  }
}

/**
 * Adds a file to an /api/uploads form the way every upload screen should: a photo is compressed
 * first, and its date/GPS travel along as `takenAt` / `lat` / `lng` so the server keeps them.
 */
export async function appendUploadFile(formData: FormData, file: File): Promise<void> {
  const meta = await readPhotoMeta(file);
  formData.append("file", await compressImage(file));
  if (meta.takenAt) formData.append("takenAt", meta.takenAt);
  if (meta.lat !== undefined && meta.lng !== undefined) {
    formData.append("lat", String(meta.lat));
    formData.append("lng", String(meta.lng));
  }
}
