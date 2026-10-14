/**
 * When and where an uploaded photo was taken — read from its EXIF in the browser before the photo is
 * compressed (lib/image-compress.ts), stored next to it on upload as `<path>.meta.json`, and shown
 * as a caption ("Diambil 14 Okt 2026 09:30 · -6.20000, 106.82500"). Pure: shared by server and client.
 */

export type PhotoMeta = { takenAt?: string; lat?: number; lng?: number };

const TAKEN_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

/** Validates the upload form's takenAt / lat / lng; null when there is nothing worth keeping. */
export function parsePhotoMeta(takenAt: unknown, lat: unknown, lng: unknown): PhotoMeta | null {
  const meta: PhotoMeta = {};
  if (typeof takenAt === "string" && TAKEN_AT.test(takenAt)) meta.takenAt = takenAt;
  const la = typeof lat === "string" && lat.trim() !== "" ? Number(lat) : NaN;
  const ln = typeof lng === "string" && lng.trim() !== "" ? Number(lng) : NaN;
  if (Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && (la !== 0 || ln !== 0)) {
    meta.lat = Math.round(la * 1e6) / 1e6;
    meta.lng = Math.round(ln * 1e6) / 1e6;
  }
  return meta.takenAt || meta.lat !== undefined ? meta : null;
}

/** Storage path of a photo's metadata file. */
export const photoMetaPath = (path: string) => `${path}.meta.json`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "Diambil 14 Okt 2026 09:30 · -6.20000, 106.82500" — the camera's own local time, not converted. */
export function photoMetaCaption(meta: PhotoMeta | null | undefined): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  if (meta.takenAt) {
    const [date, time] = meta.takenAt.split("T");
    const [y, m, d] = date.split("-");
    parts.push(`Diambil ${Number(d)} ${MONTHS[Number(m) - 1]} ${y} ${time.slice(0, 5)}`);
  }
  if (meta.lat !== undefined && meta.lng !== undefined) parts.push(`${meta.lat.toFixed(5)}, ${meta.lng.toFixed(5)}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Google Maps link for a photo's GPS position. */
export const photoMapsHref = (meta: PhotoMeta) => `https://www.google.com/maps?q=${meta.lat},${meta.lng}`;
