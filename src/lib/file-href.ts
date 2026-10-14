/** URL of a stored file, as uploaded. */
export const fileHref = (path: string) => `/api/files?path=${encodeURIComponent(path)}`;

/**
 * URL of a photo's small WebP thumbnail (lib/image-thumb.ts) — for grids, lists and cards. Falls
 * back to the photo itself until the thumbnail is ready, and for anything that isn't a photo.
 */
export const photoThumbHref = (path: string) => `${fileHref(path)}&variant=thumb`;
