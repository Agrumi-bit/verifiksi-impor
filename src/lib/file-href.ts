/** URL of a stored file, as uploaded. */
export const fileHref = (path: string) => `/api/files?path=${encodeURIComponent(path)}`;

/**
 * URL of a photo's small WebP thumbnail (lib/image-thumb.ts) — for grids, lists and cards. Falls
 * back to the photo itself until the thumbnail is ready, and for anything that isn't a photo.
 */
export const photoThumbHref = (path: string) => `${fileHref(path)}&variant=thumb`;

/**
 * URL of a photo's A4-report copy (1400 px WebP, lib/image-thumb.ts) — for printed reports with many
 * photos. Falls back to the photo itself until the copy is ready, and for anything that isn't a photo.
 */
export const photoReportHref = (path: string) => `${fileHref(path)}&variant=report`;
